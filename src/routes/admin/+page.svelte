<script lang="ts">
	import { enhance } from '$app/forms'
	import type { House, Image, HouseStyleRecord, HouseCondition } from '$lib/types'
	import type { ActionData, PageData } from './$types'
	import { PUBLIC_MAPBOX_TOKEN } from '$env/static/public'
	import { supabase } from '$lib/supabase'
	import { compressImage } from '$lib/utils/compress'

	type ImageWithUrl = Image & { url: string }

	const CONDITIONS: HouseCondition[] = ['Original', 'Renovated', 'At Risk', 'Demolished']
	const AU_STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT']

	let { data, form }: { data: PageData; form: ActionData } = $props()

	const isAdmin = $derived(data.role === 'admin' || data.role === 'super_admin')

	// ── Derived stat counts ───────────────────────────────────────────────────
	const statPublished = $derived(data.published.length)
	const statPending = $derived(data.pending.length)
	const statPendingStories = $derived(data.pendingStories?.length ?? 0)
	const statMissingPhotos = $derived(data.missingPhotos ?? 0)
	const statMissingLocation = $derived(data.missingLocation ?? 0)

	// Task queue: auto-generated actionable items
	const tasks = $derived([
		...(isAdmin && statPending > 0
			? [{ label: `${statPending} listing${statPending !== 1 ? 's' : ''} awaiting review`, href: '#pending', type: 'pending' as const }]
			: []),
		...(isAdmin && statPendingStories > 0
			? [{ label: `${statPendingStories} property stor${statPendingStories !== 1 ? 'ies' : 'y'} awaiting approval`, href: '#stories', type: 'pending' as const }]
			: []),
		...(statMissingPhotos > 0
			? [{ label: `${statMissingPhotos} published listing${statMissingPhotos !== 1 ? 's' : ''} missing photos`, href: '#published', type: 'warning' as const }]
			: []),
		...(statMissingLocation > 0
			? [{ label: `${statMissingLocation} published listing${statMissingLocation !== 1 ? 's' : ''} missing map location`, href: '#published', type: 'warning' as const }]
			: [])
	])

	// ── Styles manager ───────────────────────────────────────────────────────
	let stylesOpen = $state(false)
	let newStyleName = $state('')

	// ── Quick Add ────────────────────────────────────────────────────────────
	let qaOpen = $state(false)
	let qaInput = $state('')
	let qaStyle = $state('')
	let qaStatus = $state<'idle' | 'loading' | 'done' | 'error'>('idle')
	let qaMessage = $state('')
	let qaLastId = $state('')

	async function quickAdd() {
		if (!qaInput.trim()) return
		qaStatus = 'loading'
		qaMessage = ''
		qaLastId = ''

		try {
			const res = await fetch(
				`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(qaInput.trim())}.json` +
				`?access_token=${PUBLIC_MAPBOX_TOKEN}&country=AU&limit=1&types=address`
			)
			const json = await res.json()
			const feature = json.features?.[0]

			if (!feature) {
				qaStatus = 'error'
				qaMessage = 'Address not found — try being more specific.'
				return
			}

			const ctx: { id: string; text: string }[] = feature.context ?? []
			const get = (type: string) => ctx.find((c) => c.id.startsWith(type))?.text ?? ''

			const street = [feature.address, feature.text].filter(Boolean).join(' ')
			const suburb = get('locality') || get('place') || get('neighborhood')
			const state = get('region.')
			const postcode = get('postcode')
			const lat: number = feature.center[1]
			const lng: number = feature.center[0]

			const insertRes = await fetch('/api/submit-house', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					address_street: street,
					address_suburb: suburb,
					address_state: state || 'NSW',
					address_postcode: postcode,
					style: qaStyle || null,
					year_built: null,
					builder_name: null,
					condition: null,
					description: null,
					status: 'pending',
					latitude: lat,
					longitude: lng,
					listing_url: null,
					sold_listing_url: null
				})
			})

			const insertJson = await insertRes.json()
			if (!insertRes.ok || !insertJson.id) throw new Error(insertJson.error ?? 'Insert failed')

			qaLastId = insertJson.id
			qaStatus = 'done'
			qaMessage = `Added: ${suburb}${qaStyle ? ' · ' + qaStyle : ''}`
			qaInput = ''
			qaStyle = ''
		} catch (e) {
			qaStatus = 'error'
			qaMessage = e instanceof Error ? e.message : 'Something went wrong.'
		}
	}

	function qaKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') quickAdd()
	}

	// ── Tab state ─────────────────────────────────────────────────────────────
	const initialTab: 'pending' | 'published' =
		data.role === 'admin' || data.role === 'super_admin' ? 'pending' : 'published'
	let activeTab = $state<'pending' | 'published'>(initialTab)

	let expandedNotes: Record<string, boolean> = $state({})
	let notesText: Record<string, string> = $state({})

	// ── Edit form state ───────────────────────────────────────────────────────
	type EditData = {
		address_street: string
		address_suburb: string
		address_state: string
		address_postcode: string
		style: string
		year_built: string
		builder_name: string
		condition: string
		description: string
		latitude: string
		longitude: string
		listing_url: string
		sold_listing_url: string
	}

	let editOpen: Record<string, boolean> = $state({})
	let editData: Record<string, EditData> = $state({})
	let editGeocoding: Record<string, boolean> = $state({})
	let editGeocodedOk: Record<string, boolean> = $state({})
	let editSaving: Record<string, boolean> = $state({})
	let editSuccess: Record<string, boolean> = $state({})
	let editError: Record<string, boolean> = $state({})

	// ── Image management ──────────────────────────────────────────────────────
	let localImages: Record<string, (Image & { url: string })[]> = $state({})
	let imgUploading: Record<string, boolean> = $state({})
	let imgUploadError: Record<string, string> = $state({})

	function allImages(houseId: string): (Image & { url: string })[] {
		const server = (data.imagesByHouse as Record<string, (Image & { url: string })[]>)[houseId] ?? []
		const local = localImages[houseId] ?? []
		return [...server, ...local]
	}

	async function handleImageUpload(houseId: string, e: Event) {
		const input = e.currentTarget as HTMLInputElement
		if (!input.files?.length) return
		const files = Array.from(input.files).filter((f) => f.type.startsWith('image/'))
		input.value = ''

		imgUploading[houseId] = true
		imgUploadError[houseId] = ''

		const existingCount = allImages(houseId).length

		for (let i = 0; i < files.length; i++) {
			try {
				const { file } = await compressImage(files[i])
				const path = `${houseId}/${crypto.randomUUID()}.webp`

				const { error: uploadErr } = await supabase.storage
					.from('house-images')
					.upload(path, file, { contentType: 'image/webp' })

				if (uploadErr) {
					imgUploadError[houseId] = 'Upload failed — try again.'
					continue
				}

				const isPrimary = existingCount + i === 0
				await fetch('/api/save-image', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						house_id: houseId,
						storage_path: path,
						is_primary: isPrimary,
						sort_order: existingCount + i,
						caption: null
					})
				})

				const publicUrl = supabase.storage.from('house-images').getPublicUrl(path).data.publicUrl
				if (!localImages[houseId]) localImages[houseId] = []
				localImages[houseId] = [
					...localImages[houseId],
					{
						id: crypto.randomUUID(),
						house_id: houseId,
						storage_path: path,
						is_primary: isPrimary,
						sort_order: existingCount + i,
						caption: null,
						created_at: new Date().toISOString(),
						contributor_id: null,
						url: publicUrl
					}
				]
			} catch {
				imgUploadError[houseId] = 'Error processing image — try again.'
			}
		}

		imgUploading[houseId] = false
	}

	const geocodeTimers: Record<string, ReturnType<typeof setTimeout>> = {}

	function houseImages(houseId: string): ImageWithUrl[] {
		return (data.imagesByHouse as Record<string, ImageWithUrl[]>)[houseId] ?? []
	}

	function toggleNotes(id: string) {
		expandedNotes[id] = !expandedNotes[id]
	}

	function toggleEdit(house: House) {
		if (!editOpen[house.id]) {
			editData[house.id] = {
				address_street: house.address_street,
				address_suburb: house.address_suburb,
				address_state: house.address_state,
				address_postcode: house.address_postcode,
				style: house.style ?? '',
				year_built: house.year_built?.toString() ?? '',
				builder_name: house.builder_name ?? '',
				condition: house.condition ?? '',
				description: house.description ?? '',
				latitude: house.latitude?.toString() ?? '',
				longitude: house.longitude?.toString() ?? '',
				listing_url: house.listing_url ?? '',
				sold_listing_url: house.sold_listing_url ?? ''
			}
			editGeocodedOk[house.id] = house.latitude != null
		}
		editOpen[house.id] = !editOpen[house.id]
	}

	function scheduleGeocode(houseId: string) {
		clearTimeout(geocodeTimers[houseId])
		const d = editData[houseId]
		if (!d?.address_street || !d?.address_suburb || !d?.address_postcode) return
		geocodeTimers[houseId] = setTimeout(() => geocodeFor(houseId), 800)
	}

	async function geocodeFor(houseId: string) {
		const d = editData[houseId]
		if (!d) return
		const query = `${d.address_street}, ${d.address_suburb}, ${d.address_state} ${d.address_postcode}, Australia`
		editGeocoding[houseId] = true
		editGeocodedOk[houseId] = false
		try {
			const res = await fetch(
				`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${PUBLIC_MAPBOX_TOKEN}&country=AU&limit=1`
			)
			const json = await res.json()
			const feature = json.features?.[0]
			if (feature) {
				editData[houseId].longitude = feature.center[0].toString()
				editData[houseId].latitude = feature.center[1].toString()
				editGeocodedOk[houseId] = true
			}
		} catch {
			// best-effort
		} finally {
			editGeocoding[houseId] = false
		}
	}
</script>

<div class="p-4 sm:p-6 space-y-6">

	<!-- ── STAT CARDS ─────────────────────────────────────────────────────── -->
	<div class="grid grid-cols-2 gap-4 lg:grid-cols-4">

		<div class="rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-5 shadow-sm">
			<p class="text-xs font-medium text-gray-500 dark:text-slate-400">Published</p>
			<p class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{statPublished}</p>
			<p class="mt-1 text-xs text-green-600">Live listings</p>
		</div>

		<div class="rounded-lg border p-5 shadow-sm
			{statPending > 0
				? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700'
				: 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700'}">
			<p class="text-xs font-medium {statPending > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-gray-500 dark:text-slate-400'}">
				Pending Review
			</p>
			<p class="mt-2 text-3xl font-bold {statPending > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-gray-900 dark:text-white'}">
				{statPending}
			</p>
			<p class="mt-1 text-xs {statPending > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'}">
				{statPending > 0 ? 'Needs attention' : 'All clear'}
			</p>
		</div>

		<div class="rounded-lg border p-5 shadow-sm
			{statMissingPhotos > 0
				? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700'
				: 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700'}">
			<p class="text-xs font-medium {statMissingPhotos > 0 ? 'text-orange-700 dark:text-orange-400' : 'text-gray-500 dark:text-slate-400'}">
				Missing Photos
			</p>
			<p class="mt-2 text-3xl font-bold {statMissingPhotos > 0 ? 'text-orange-700 dark:text-orange-300' : 'text-gray-900 dark:text-white'}">
				{statMissingPhotos}
			</p>
			<p class="mt-1 text-xs text-gray-400 dark:text-slate-500">Published listings</p>
		</div>

		<div class="rounded-lg border p-5 shadow-sm
			{statMissingLocation > 0
				? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700'
				: 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700'}">
			<p class="text-xs font-medium {statMissingLocation > 0 ? 'text-yellow-700 dark:text-yellow-400' : 'text-gray-500 dark:text-slate-400'}">
				Missing Location
			</p>
			<p class="mt-2 text-3xl font-bold {statMissingLocation > 0 ? 'text-yellow-700 dark:text-yellow-300' : 'text-gray-900 dark:text-white'}">
				{statMissingLocation}
			</p>
			<p class="mt-1 text-xs text-gray-400 dark:text-slate-500">No map pin</p>
		</div>
	</div>

	<!-- ── TASK QUEUE ─────────────────────────────────────────────────────── -->
	{#if tasks.length > 0}
		<div class="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
			<div class="border-b border-gray-100 dark:border-slate-700 px-5 py-3">
				<h2 class="text-sm font-semibold text-gray-700 dark:text-slate-300">
					Tasks
					<span class="ml-2 rounded-full bg-slate-200 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-400">
						{tasks.length}
					</span>
				</h2>
			</div>
			<ul class="divide-y divide-gray-100 dark:divide-slate-700">
				{#each tasks as task}
					<li>
						<a
							href={task.href}
							class="flex items-center gap-3 px-5 py-3 text-sm transition hover:bg-gray-50 dark:hover:bg-slate-700"
						>
							{#if task.type === 'pending'}
								<span class="h-2 w-2 shrink-0 rounded-full bg-amber-400"></span>
								<span class="text-amber-700 dark:text-amber-400 font-medium">{task.label}</span>
							{:else}
								<span class="h-2 w-2 shrink-0 rounded-full bg-orange-400"></span>
								<span class="text-gray-600 dark:text-slate-300">{task.label}</span>
							{/if}
							<svg class="ml-auto h-4 w-4 text-gray-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
							</svg>
						</a>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<!-- ── PROPERTY STORIES (Know this property?) ───────────────────────────── -->
	{#if isAdmin && (data.pendingStories?.length ?? 0) > 0}
		<div id="stories" class="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
			<div class="border-b border-gray-100 dark:border-slate-700 px-5 py-3">
				<h2 class="text-sm font-semibold text-gray-700 dark:text-slate-300">
					Property stories
					<span class="ml-2 rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
						{data.pendingStories.length} pending
					</span>
				</h2>
				<p class="mt-1 text-xs text-gray-500 dark:text-slate-400">“Know this property?” submissions — approve to show on the listing.</p>
			</div>
			<ul class="divide-y divide-gray-100 dark:divide-slate-700">
				{#each data.pendingStories as story (story.id)}
					<li class="px-5 py-4">
						<div class="flex flex-wrap items-start justify-between gap-4">
							<div class="min-w-0 flex-1">
								<p class="text-xs font-medium text-gray-400 dark:text-slate-500">
									{story.author_name}{#if story.period_or_context} · {story.period_or_context}{/if}
								</p>
								{#if story.house}
									<a
										href="/house/{story.house.id}"
										target="_blank"
										rel="noopener noreferrer"
										class="mt-0.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
									>
										{story.house.address_suburb} →
									</a>
								{:else}
									<p class="mt-0.5 text-xs text-gray-400 dark:text-slate-500">House not found (may be deleted)</p>
								{/if}
								<p class="mt-2 text-sm text-gray-700 dark:text-slate-300 leading-relaxed">{story.story}</p>
							</div>
							<form method="POST" action="/admin?/approveStory" use:enhance class="shrink-0">
								<input type="hidden" name="id" value={story.id} />
								<button
									type="submit"
									class="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
								>
									Approve
								</button>
							</form>
						</div>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<!-- ── QUICK ADD ──────────────────────────────────────────────────────── -->
	<div id="quickadd" class="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
		<button
			type="button"
			onclick={() => { qaOpen = !qaOpen; qaStatus = 'idle'; qaMessage = '' }}
			class="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-slate-700 transition"
		>
			<div class="flex items-center gap-3">
				<span class="flex h-7 w-7 items-center justify-center rounded-md bg-slate-700 text-white text-sm font-bold">+</span>
				<div>
					<p class="text-sm font-semibold text-gray-900 dark:text-white">Quick Add</p>
					<p class="text-xs text-gray-400 dark:text-slate-500">Type an address, geocode automatically</p>
				</div>
			</div>
			<svg
				class="h-4 w-4 text-gray-400 transition-transform {qaOpen ? 'rotate-180' : ''}"
				fill="none" stroke="currentColor" viewBox="0 0 24 24"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</button>

		{#if qaOpen}
			<div class="border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 px-5 py-5 space-y-4">
				<div>
					<label for="qa-input" class="mb-1.5 block text-xs font-medium text-gray-600 dark:text-slate-400">
						Full Address
					</label>
					<input
						id="qa-input"
						type="text"
						bind:value={qaInput}
						onkeydown={qaKeydown}
						placeholder="37 Gould Avenue St Ives Chase NSW 2075"
						disabled={qaStatus === 'loading'}
						class="w-full rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-slate-500 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50"
					/>
				</div>

				<div>
					<p class="mb-2 text-xs font-medium text-gray-600 dark:text-slate-400">Style</p>
					<div class="flex flex-wrap gap-2">
						{#each data.styles as s}
							<button
								type="button"
								onclick={() => { qaStyle = qaStyle === s.name ? '' : s.name }}
							class="rounded-md border px-3 py-1.5 text-xs font-medium transition
								{qaStyle === s.name
									? 'border-slate-700 bg-slate-700 text-white'
									: 'border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:border-slate-500 hover:text-slate-700'}"
						>
							{s.name}
						</button>
					{/each}
						<button
							type="button"
							onclick={() => { qaStyle = '' }}
							class="rounded-md border px-3 py-1.5 text-xs font-medium transition
								{qaStyle === ''
									? 'border-gray-300 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300'
									: 'border-gray-100 dark:border-slate-700 text-gray-300 dark:text-slate-600 hover:border-gray-300 hover:text-gray-500'}"
						>
							Unknown
						</button>
					</div>
				</div>

				<div class="flex flex-wrap items-center gap-4">
					<button
						type="button"
						onclick={quickAdd}
						disabled={!qaInput.trim() || qaStatus === 'loading'}
						class="rounded-md bg-slate-700 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
					>
						{qaStatus === 'loading' ? 'Adding…' : 'Add House →'}
					</button>

					{#if qaStatus === 'done'}
						<div class="flex flex-wrap items-center gap-4">
							<p class="text-sm font-medium text-green-600">✓ {qaMessage}</p>
							<a href="/house/{qaLastId}" target="_blank" rel="noopener noreferrer"
								class="text-xs font-medium text-gray-400 underline hover:text-gray-700 dark:hover:text-white">
								Preview ↗
							</a>
							<button
								type="button"
								onclick={() => window.location.reload()}
								class="text-xs font-medium text-gray-400 underline hover:text-gray-700 dark:hover:text-white"
							>
								Refresh list
							</button>
						</div>
					{:else if qaStatus === 'error'}
						<p class="text-sm text-red-500">{qaMessage}</p>
					{/if}
				</div>

				<p class="text-xs text-gray-400 dark:text-slate-500">
					Press <kbd class="rounded bg-gray-200 dark:bg-slate-700 px-1 py-0.5 font-mono text-xs">Enter</kbd> to add.
					House lands in Pending for review.
				</p>
			</div>
		{/if}
	</div>

	<!-- ── TABS ───────────────────────────────────────────────────────────── -->
	<div class="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">

		<!-- Tab bar -->
		<div class="flex border-b border-gray-200 dark:border-slate-700 px-4">
			{#if isAdmin}
				<button
					id="pending"
					onclick={() => (activeTab = 'pending')}
					class="flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition
						{activeTab === 'pending'
							? 'border-slate-700 text-slate-700 dark:text-slate-400'
							: 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'}"
				>
					Pending Review
					{#if statPending > 0}
						<span class="rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
							{statPending}
						</span>
					{/if}
				</button>
			{/if}
			<button
				id="published"
				onclick={() => (activeTab = 'published')}
				class="flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition
					{activeTab === 'published'
						? 'border-slate-700 text-slate-700 dark:text-slate-400'
						: 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'}"
			>
				Published
				<span class="rounded-full bg-gray-100 dark:bg-slate-700 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:text-slate-400">
					{statPublished}
				</span>
			</button>
		</div>

		<!-- ── PENDING TAB ── -->
		{#if activeTab === 'pending'}
			{#if data.pending.length === 0}
				<div class="py-20 text-center">
					<div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
						<svg class="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
						</svg>
					</div>
					<p class="text-sm font-medium text-gray-500 dark:text-slate-400">All clear — no pending submissions</p>
				</div>
			{:else}
				<div class="divide-y divide-gray-100 dark:divide-slate-700">
					{#each data.pending as house (house.id)}
						{@const imgs = houseImages(house.id)}
						<div>
							<!-- House header -->
							<div class="flex flex-wrap items-start justify-between gap-4 p-5">
								<div>
									<p class="text-xs font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wider">
										{house.style ?? 'Unknown style'}
									</p>
									<h2 class="mt-0.5 text-lg font-bold text-gray-900 dark:text-white">
										{house.address_suburb}
									</h2>
									<p class="mt-0.5 text-sm text-gray-500 dark:text-slate-400">
										{house.address_street} · {house.address_state} {house.address_postcode}
									</p>
								</div>
								<div class="flex flex-wrap items-center gap-2">
									{#if house.year_built}
										<span class="rounded bg-gray-100 dark:bg-slate-700 px-2 py-1 text-xs text-gray-600 dark:text-slate-400">
											{house.year_built}
										</span>
									{/if}
									{#if house.condition}
										<span class="rounded bg-gray-100 dark:bg-slate-700 px-2 py-1 text-xs text-gray-600 dark:text-slate-400">
											{house.condition}
										</span>
									{/if}
									<span class="rounded bg-amber-100 dark:bg-amber-900/40 px-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
										Pending
									</span>
									<button
										type="button"
										onclick={() => toggleEdit(house)}
										class="rounded border border-gray-200 dark:border-slate-600 px-3 py-1 text-xs font-medium text-gray-500 dark:text-slate-400 transition hover:border-slate-500 hover:text-slate-700"
									>
										{editOpen[house.id] ? '− Close edit' : '+ Edit'}
									</button>
								</div>
							</div>

							<!-- Images strip -->
							{#if imgs.length > 0}
								<div class="grid grid-cols-4 gap-px bg-gray-100 dark:bg-slate-700 sm:grid-cols-6 border-t border-b border-gray-100 dark:border-slate-700">
									{#each imgs as img (img.id)}
										<a href={img.url} target="_blank" rel="noopener noreferrer"
											class="group aspect-square overflow-hidden bg-gray-100 dark:bg-slate-700">
											<img
												src={img.url}
												alt={img.caption ?? house.address_suburb}
												class="h-full w-full object-cover transition group-hover:opacity-80"
												loading="lazy"
											/>
										</a>
									{/each}
								</div>
							{:else}
								<div class="border-t border-gray-100 dark:border-slate-700 px-5 py-3">
									<p class="text-xs text-gray-300 dark:text-slate-600">No images submitted</p>
								</div>
							{/if}

							<!-- Description -->
							{#if house.description && !editOpen[house.id]}
								<div class="border-t border-gray-100 dark:border-slate-700 px-5 py-4">
									<p class="mb-1 text-xs font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wider">Description</p>
									<p class="text-sm leading-relaxed text-gray-600 dark:text-slate-300">{house.description}</p>
								</div>
							{/if}

							<!-- Inline edit form -->
							{#if editOpen[house.id]}
								{@render editForm(house)}
							{/if}

							<!-- Approval actions -->
							<div class="border-t border-gray-100 dark:border-slate-700 p-5 space-y-4">
								<div>
									<button
										type="button"
										onclick={() => toggleNotes(house.id)}
										class="text-xs font-medium text-gray-400 dark:text-slate-500 underline hover:text-gray-700 dark:hover:text-slate-300 transition"
									>
										{expandedNotes[house.id] ? '− Hide notes' : '+ Add verification notes'}
									</button>

									{#if expandedNotes[house.id]}
										<textarea
											bind:value={notesText[house.id]}
											placeholder="Optional notes about this submission…"
											rows="3"
											class="mt-3 w-full resize-none rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500"
										></textarea>
									{/if}
								</div>

								<div class="flex flex-wrap gap-3">
									<form method="POST" action="?/approve" use:enhance>
										<input type="hidden" name="id" value={house.id} />
										<input type="hidden" name="notes" value={notesText[house.id] ?? ''} />
										<button
											type="submit"
											class="rounded-md bg-green-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-green-700"
										>
											✓ Approve & Publish
										</button>
									</form>

									<form method="POST" action="?/reject" use:enhance>
										<input type="hidden" name="id" value={house.id} />
										<input type="hidden" name="notes" value={notesText[house.id] ?? ''} />
										<button
											type="submit"
											class="rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-5 py-2 text-sm font-medium text-red-600 dark:text-red-400 transition hover:bg-red-100"
										>
											✕ Reject
										</button>
									</form>

									<a
										href="/house/{house.id}"
										target="_blank"
										rel="noopener noreferrer"
										class="rounded-md border border-gray-200 dark:border-slate-600 px-5 py-2 text-sm font-medium text-gray-400 dark:text-slate-500 transition hover:border-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
									>
										Preview ↗
									</a>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		{/if}

		<!-- ── PUBLISHED TAB ── -->
		{#if activeTab === 'published'}
			{#if data.published.length === 0}
				<div class="py-20 text-center">
					<p class="text-sm text-gray-400 dark:text-slate-500">No published listings yet.</p>
				</div>
			{:else}
				<div class="divide-y divide-gray-100 dark:divide-slate-700">
					{#each data.published as house (house.id)}
						<div>
							<div class="flex flex-wrap items-center justify-between gap-4 p-5">
								<div>
									<p class="text-xs font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wider">
										{house.style ?? '—'}
									</p>
									<h2 class="font-bold text-gray-900 dark:text-white">
										{house.address_suburb}
									</h2>
									<p class="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
										{house.address_street} · {house.address_state} {house.address_postcode}
										{#if house.latitude}
											· <span class="text-green-600 dark:text-green-400">📍 mapped</span>
										{/if}
									</p>
								</div>
								<div class="flex flex-wrap items-center gap-2">
									{#if house.is_featured}
										<span class="rounded bg-amber-100 dark:bg-amber-900/40 px-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
											★ Featured
										</span>
									{/if}
									{#if house.year_built}
										<span class="rounded bg-gray-100 dark:bg-slate-700 px-2 py-1 text-xs text-gray-600 dark:text-slate-400">
											{house.year_built}
										</span>
									{/if}
									{#if house.condition}
										<span class="rounded bg-gray-100 dark:bg-slate-700 px-2 py-1 text-xs text-gray-600 dark:text-slate-400">
											{house.condition}
										</span>
									{/if}
									{#if editSuccess[house.id]}
										<span class="rounded bg-green-100 dark:bg-green-900/40 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-400">
											✓ Saved
										</span>
									{/if}
									{#if !house.is_featured}
										<form method="POST" action="?/setFeatured" use:enhance>
											<input type="hidden" name="id" value={house.id} />
											<button
												type="submit"
												class="rounded border border-amber-200 dark:border-amber-800 px-3 py-1 text-xs font-medium text-amber-600 dark:text-amber-500 transition hover:bg-amber-50 dark:hover:bg-amber-900/30"
											>
												☆ Set featured
											</button>
										</form>
									{/if}
									<button
										type="button"
										onclick={() => toggleEdit(house)}
										class="rounded border border-gray-200 dark:border-slate-600 px-3 py-1 text-xs font-medium text-gray-500 dark:text-slate-400 transition hover:border-slate-500 hover:text-slate-700"
									>
										{editOpen[house.id] ? '− Close' : '+ Edit'}
									</button>
									<a
										href="/house/{house.id}"
										target="_blank"
										rel="noopener noreferrer"
										class="rounded border border-gray-100 dark:border-slate-700 px-3 py-1 text-xs font-medium text-gray-300 dark:text-slate-600 transition hover:border-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
									>
										View ↗
									</a>
								</div>
							</div>

							{#if editOpen[house.id]}
								{@render editForm(house)}
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		{/if}

	<!-- ── STYLES MANAGER ── -->
	<div class="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
		<button
			type="button"
			onclick={() => (stylesOpen = !stylesOpen)}
			class="flex w-full items-center justify-between px-6 py-4 text-left"
		>
			<div>
				<h2 class="font-semibold text-gray-900 dark:text-white">House Styles</h2>
				<p class="mt-0.5 text-xs text-gray-400 dark:text-slate-500">{data.styles.length} style{data.styles.length !== 1 ? 's' : ''} defined</p>
			</div>
			<span class="text-sm text-gray-400 dark:text-slate-500">{stylesOpen ? '▲' : '▼'}</span>
		</button>

		{#if stylesOpen}
			<div class="border-t border-gray-100 dark:border-slate-700 px-6 py-5 space-y-4">

				{#if form?.styleError}
					<p class="rounded bg-red-50 dark:bg-red-900/30 px-3 py-2 text-xs text-red-600 dark:text-red-400">
						{form.styleError}
					</p>
				{/if}
				{#if form?.styleAdded}
					<p class="rounded bg-green-50 dark:bg-green-900/30 px-3 py-2 text-xs text-green-700 dark:text-green-400">
						✓ "{form.styleAdded}" added
					</p>
				{/if}

				<!-- Existing styles -->
				<ul class="divide-y divide-gray-100 dark:divide-slate-700">
					{#each data.styles as style (style.id)}
						<li class="flex items-center justify-between py-2">
							<span class="text-sm font-medium text-gray-800 dark:text-slate-200">{style.name}</span>
							{#if isAdmin}
								<form method="POST" action="?/deleteStyle" use:enhance>
									<input type="hidden" name="id" value={style.id} />
									<button
										type="submit"
										class="text-xs text-gray-300 dark:text-slate-600 transition hover:text-red-500 dark:hover:text-red-400"
										onclick={(e) => {
											if (!confirm(`Delete "${style.name}"? This cannot be undone.`)) e.preventDefault()
										}}
									>
										Remove
									</button>
								</form>
							{/if}
						</li>
					{/each}
				</ul>

				<!-- Add new style -->
				<form
					method="POST"
					action="?/addStyle"
					class="flex gap-2"
					use:enhance={({ formElement }) => {
						return ({ update }) => {
							update()
							newStyleName = ''
							formElement.reset()
						}
					}}
				>
					<input
						type="text"
						name="name"
						bind:value={newStyleName}
						placeholder="e.g. Mk V Deluxe"
						required
						class="flex-1 rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500"
					/>
					<button
						type="submit"
						class="rounded-md bg-slate-800 dark:bg-slate-700 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700 dark:hover:bg-slate-600"
					>
						Add style
					</button>
				</form>
			</div>
		{/if}
	</div>

	</div>
</div>

<!-- ── SHARED EDIT FORM SNIPPET ── -->
{#snippet editForm(house: House)}
	{@const d = editData[house.id]}
	{#if d}
		<form
			method="POST"
			action="?/edit"
			class="border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 p-5"
			use:enhance={() => {
				editSaving[house.id] = true
				editError[house.id] = false
				editSuccess[house.id] = false
				return async ({ update }) => {
					await update({ reset: false })
					editSaving[house.id] = false
					if (form?.editSuccess === house.id) {
						editSuccess[house.id] = true
						editOpen[house.id] = false
						setTimeout(() => { editSuccess[house.id] = false }, 3000)
					}
					if (form?.editError === house.id) {
						editError[house.id] = true
					}
				}
			}}
		>
			<input type="hidden" name="id" value={house.id} />
			<input type="hidden" name="latitude" value={d.latitude} />
			<input type="hidden" name="longitude" value={d.longitude} />
			<input type="hidden" name="listing_url" value={d.listing_url} />
			<input type="hidden" name="sold_listing_url" value={d.sold_listing_url} />

			<p class="mb-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Edit Listing</p>

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div class="sm:col-span-2">
					<label for="{house.id}-street" class="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Street</label>
					<input
						id="{house.id}-street"
						name="address_street"
						type="text"
						bind:value={d.address_street}
						oninput={() => scheduleGeocode(house.id)}
						class="w-full rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
					/>
				</div>

				<div>
					<label for="{house.id}-suburb" class="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Suburb</label>
					<input
						id="{house.id}-suburb"
						name="address_suburb"
						type="text"
						bind:value={d.address_suburb}
						oninput={() => scheduleGeocode(house.id)}
						class="w-full rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
					/>
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="{house.id}-state" class="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">State</label>
						<select
							id="{house.id}-state"
							name="address_state"
							bind:value={d.address_state}
							oninput={() => scheduleGeocode(house.id)}
							class="w-full rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
						>
							{#each AU_STATES as s}
								<option value={s}>{s}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="{house.id}-postcode" class="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Postcode</label>
						<input
							id="{house.id}-postcode"
							name="address_postcode"
							type="text"
							maxlength="4"
							bind:value={d.address_postcode}
							oninput={() => scheduleGeocode(house.id)}
							class="w-full rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
						/>
					</div>
				</div>

				<div>
					<label for="{house.id}-style" class="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Style</label>
					<select
						id="{house.id}-style"
						name="style"
						bind:value={d.style}
						class="w-full rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
					>
					<option value="">Unknown</option>
					{#each data.styles as s}
						<option value={s.name}>{s.name}</option>
					{/each}
					</select>
				</div>
				<div>
					<label for="{house.id}-year" class="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Year Built</label>
					<input
						id="{house.id}-year"
						name="year_built"
						type="number"
						min="1950"
						max="1990"
						bind:value={d.year_built}
						class="w-full rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
					/>
				</div>

				<div>
					<label for="{house.id}-builder" class="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Builder</label>
					<input
						id="{house.id}-builder"
						name="builder_name"
						type="text"
						bind:value={d.builder_name}
						class="w-full rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
					/>
				</div>
				<div>
					<label for="{house.id}-condition" class="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Condition</label>
					<select
						id="{house.id}-condition"
						name="condition"
						bind:value={d.condition}
						class="w-full rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
					>
						<option value="">Unknown</option>
						{#each CONDITIONS as c}
							<option value={c}>{c}</option>
						{/each}
					</select>
				</div>

				<div class="sm:col-span-2">
					<label for="{house.id}-desc" class="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Description</label>
					<textarea
						id="{house.id}-desc"
						name="description"
						rows="4"
						bind:value={d.description}
						class="w-full resize-none rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-500"
					></textarea>
				</div>

				<div>
					<label for="{house.id}-listing" class="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">For Sale URL</label>
					<input
						id="{house.id}-listing"
						type="url"
						bind:value={d.listing_url}
						oninput={() => { editData[house.id].listing_url = d.listing_url }}
						placeholder="https://www.realestate.com.au/…"
						class="w-full rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-slate-500"
					/>
				</div>
				<div>
					<label for="{house.id}-sold" class="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Sold Record URL</label>
					<input
						id="{house.id}-sold"
						type="url"
						bind:value={d.sold_listing_url}
						oninput={() => { editData[house.id].sold_listing_url = d.sold_listing_url }}
						placeholder="https://www.domain.com.au/…"
						class="w-full rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-slate-500"
					/>
				</div>
			</div>

			<!-- Geocoding + save row -->
			<div class="mt-4 flex flex-wrap items-center justify-between gap-4">
				<div class="flex items-center gap-3">
					{#if editGeocoding[house.id]}
						<p class="text-xs text-gray-400 dark:text-slate-500">Locating…</p>
					{:else if editGeocodedOk[house.id]}
						<p class="text-xs font-medium text-green-600">✓ Location found</p>
					{:else if d.latitude}
						<p class="text-xs text-gray-400 dark:text-slate-500">
							📍 {parseFloat(d.latitude).toFixed(5)}, {parseFloat(d.longitude).toFixed(5)}
						</p>
					{:else}
						<p class="text-xs text-gray-300 dark:text-slate-600">No coordinates</p>
					{/if}
					{#if d.address_street && d.address_suburb}
						<button
							type="button"
							onclick={() => geocodeFor(house.id)}
							class="text-xs font-medium text-gray-400 dark:text-slate-500 underline hover:text-gray-700 dark:hover:text-slate-300"
						>
							Re-geocode
						</button>
					{/if}
				</div>

				<div class="flex items-center gap-3">
					{#if editError[house.id]}
						<p class="text-xs text-red-500">Save failed — try again.</p>
					{/if}
					<button
						type="button"
						onclick={() => { editOpen[house.id] = false }}
						class="px-4 py-2 text-xs font-medium text-gray-400 dark:text-slate-500 transition hover:text-gray-700 dark:hover:text-slate-300"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={editSaving[house.id]}
						class="rounded-md bg-slate-700 px-5 py-2 text-xs font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
					>
						{editSaving[house.id] ? 'Saving…' : 'Save Changes'}
					</button>
				</div>
			</div>
		</form>

		<!-- Photos — outside the edit form to avoid nested form HTML -->
		<div class="border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 px-5 pb-5 pt-4">
			<p class="mb-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
				Photos · {allImages(house.id).length}
			</p>

			{#if allImages(house.id).length > 0}
				<div class="mb-4 grid grid-cols-4 gap-2 sm:grid-cols-6">
					{#each allImages(house.id) as img (img.id)}
						<div class="group relative aspect-square overflow-hidden rounded border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800">
							<img
								src={img.url}
								alt={img.caption ?? house.address_suburb}
								class="h-full w-full object-cover"
								loading="lazy"
							/>
							{#if img.is_primary}
								<span class="absolute bottom-0 left-0 bg-slate-900 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white">
									Primary
								</span>
							{/if}
							{#if localImages[house.id]?.find((l) => l.id === img.id)}
								<span class="absolute right-1 top-1 bg-green-600 px-1 py-0.5 text-[8px] font-bold uppercase text-white">
									New
								</span>
							{:else}
								<form
									method="POST"
									action="?/deleteImage"
									class="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100"
									use:enhance={() => {
										return async ({ update }) => {
											await update()
											localImages[house.id] = []
										}
									}}
								>
									<input type="hidden" name="image_id" value={img.id} />
									<input type="hidden" name="storage_path" value={img.storage_path} />
									<button
										type="submit"
										class="flex h-6 w-6 items-center justify-center rounded bg-red-600 text-white"
										aria-label="Delete photo"
										onclick={(e) => { if (!confirm('Delete this photo?')) e.preventDefault() }}
									>
										<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
											<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
										</svg>
									</button>
								</form>
							{/if}
						</div>
					{/each}
				</div>
			{/if}

			<label
				for="{house.id}-upload"
				class="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 transition hover:border-slate-500
					{imgUploading[house.id] ? 'pointer-events-none opacity-50' : ''}"
			>
				<svg class="h-5 w-5 shrink-0 text-gray-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5V19a1.5 1.5 0 001.5 1.5h15A1.5 1.5 0 0021 19v-2.5M16.5 8.25L12 3.75m0 0L7.5 8.25M12 3.75V15" />
				</svg>
				<span class="text-xs font-medium text-gray-400 dark:text-slate-500">
					{imgUploading[house.id] ? 'Uploading…' : 'Add photos'}
				</span>
				<input
					id="{house.id}-upload"
					type="file"
					accept="image/*"
					multiple
					class="sr-only"
					onchange={(e) => handleImageUpload(house.id, e)}
				/>
			</label>

			{#if imgUploadError[house.id]}
				<p class="mt-2 text-xs text-red-500">{imgUploadError[house.id]}</p>
			{/if}
		</div>
	{/if}
{/snippet}
