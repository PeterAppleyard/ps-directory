<script lang="ts">
	import { enhance } from '$app/forms'
	import type { House, Image, HouseStyle, HouseCondition } from '$lib/types'
	import type { ActionData, PageData } from './$types'
	import { PUBLIC_MAPBOX_TOKEN } from '$env/static/public'
	import { supabase } from '$lib/supabase'
	import { compressImage } from '$lib/utils/compress'

	type ImageWithUrl = Image & { url: string }

	const STYLES: HouseStyle[] = ['Lowline', 'Highline', 'Split-level', 'Other']
	const CONDITIONS: HouseCondition[] = ['Original', 'Renovated', 'At Risk', 'Demolished']
	const AU_STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT']

	let { data, form }: { data: PageData; form: ActionData } = $props()

	const isAdmin = $derived(data.role === 'admin' || data.role === 'super_admin')
	const isSuperAdmin = $derived(data.role === 'super_admin')

	// ── Quick Add ────────────────────────────────────────────────────────────
	let qaOpen = $state(false)
	let qaInput = $state('')
	let qaStyle = $state<HouseStyle | ''>('')
	let qaStatus = $state<'idle' | 'loading' | 'done' | 'error'>('idle')
	let qaMessage = $state('')
	let qaLastId = $state('')

	async function quickAdd() {
		if (!qaInput.trim()) return
		qaStatus = 'loading'
		qaMessage = ''
		qaLastId = ''

		try {
			// Geocode + parse the free-text address via Mapbox
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

			// Parse Mapbox response into structured fields
			const ctx: { id: string; text: string }[] = feature.context ?? []
			const get = (type: string) => ctx.find((c) => c.id.startsWith(type))?.text ?? ''

			const street = [feature.address, feature.text].filter(Boolean).join(' ')
			const suburb = get('locality') || get('place') || get('neighborhood')
			const state = get('region.') // short code not always available, fall back to text
			const postcode = get('postcode')
			const lat: number = feature.center[1]
			const lng: number = feature.center[0]

			// Insert via existing API
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

			// Reload page data so it appears in Pending tab
			// SvelteKit will pick this up on next navigation; for now show the link
		} catch (e) {
			qaStatus = 'error'
			qaMessage = e instanceof Error ? e.message : 'Something went wrong.'
		}
	}

	function qaKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') quickAdd()
	}

	// Tab state — superusers start on Published since they can't see Pending
	const initialTab: 'pending' | 'published' =
		data.role === 'admin' || data.role === 'super_admin' ? 'pending' : 'published'
	let activeTab = $state<'pending' | 'published'>(initialTab)

	// Pending-specific state
	let expandedNotes: Record<string, boolean> = $state({})
	let notesText: Record<string, string> = $state({})

	// Edit form state (shared between tabs)
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

	// Image management
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
					console.error('Upload failed:', uploadErr)
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

<main class="min-h-screen bg-stone-50">

	<!-- Header -->
	<div class="border-b-2 border-stone-900 bg-stone-900 px-6 py-5">
		<div class="mx-auto flex max-w-6xl items-center justify-between">
			<div>
				<p class="text-[10px] font-bold uppercase tracking-[0.35em] text-stone-500">Project Sydney</p>
				<h1 class="font-black text-2xl uppercase tracking-tight text-white">Admin</h1>
			</div>
			<div class="flex items-center gap-3">
				<span class="hidden border border-stone-700 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-stone-500 sm:block">
					{data.role?.replace('_', ' ') ?? ''}
				</span>
				<a
					href="/admin/import"
					class="border border-stone-600 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-stone-400 transition hover:border-white hover:text-white"
				>
					Bulk Import
				</a>
				{#if isAdmin}
					<a
						href="/admin/users"
						class="border border-stone-600 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-stone-400 transition hover:border-white hover:text-white"
					>
						Users
					</a>
				{/if}
				<a
					href="/admin/settings"
					class="border border-stone-600 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-stone-400 transition hover:border-white hover:text-white"
				>
					Settings
				</a>
				<form method="POST" action="?/logout" use:enhance>
					<button
						type="submit"
						class="border border-stone-600 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-stone-400 transition hover:border-white hover:text-white"
					>
						Log Out
					</button>
				</form>
			</div>
		</div>
	</div>

	<div class="mx-auto max-w-6xl px-6 py-10">

			<!-- ── Quick Add ── -->
			<div class="mb-8 border-2 border-stone-900 bg-white">
				<button
					type="button"
					onclick={() => { qaOpen = !qaOpen; qaStatus = 'idle'; qaMessage = '' }}
					class="flex w-full items-center justify-between px-5 py-4 text-left"
				>
					<div class="flex items-center gap-3">
						<span class="font-black text-lg uppercase tracking-tight text-stone-900">+ Quick Add</span>
						<span class="text-[10px] font-bold uppercase tracking-widest text-stone-400">Type an address, done</span>
					</div>
					<span class="text-stone-400 text-lg">{qaOpen ? '−' : '+'}</span>
				</button>

				{#if qaOpen}
					<div class="border-t-2 border-stone-900 bg-stone-50 px-5 py-5 space-y-4">
						<!-- Address input -->
						<div>
							<label for="qa-input" class="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-500">
								Full Address
							</label>
							<input
								id="qa-input"
								type="text"
								bind:value={qaInput}
								onkeydown={qaKeydown}
								placeholder="37 Gould Avenue St Ives Chase NSW 2075"
								disabled={qaStatus === 'loading'}
								class="w-full border-2 border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 placeholder:text-stone-300 focus:border-stone-900 focus:outline-none disabled:opacity-50"
							/>
						</div>

						<!-- Style picker -->
						<div>
							<p class="mb-2 text-[10px] font-bold uppercase tracking-widest text-stone-500">Style</p>
							<div class="flex flex-wrap gap-2">
								{#each STYLES as s}
									<button
										type="button"
										onclick={() => { qaStyle = qaStyle === s ? '' : s }}
										class="border-2 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest transition
											{qaStyle === s
												? 'border-stone-900 bg-stone-900 text-white'
												: 'border-stone-200 text-stone-400 hover:border-stone-900 hover:text-stone-900'}"
									>
										{s}
									</button>
								{/each}
								<button
									type="button"
									onclick={() => { qaStyle = '' }}
									class="border-2 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest transition
										{qaStyle === ''
											? 'border-stone-300 bg-stone-100 text-stone-500'
											: 'border-stone-100 text-stone-300 hover:border-stone-300 hover:text-stone-500'}"
								>
									Unknown
								</button>
							</div>
						</div>

						<!-- Action row -->
						<div class="flex flex-wrap items-center gap-4">
							<button
								type="button"
								onclick={quickAdd}
								disabled={!qaInput.trim() || qaStatus === 'loading'}
								class="border-2 border-stone-900 bg-stone-900 px-8 py-3 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-white hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-40"
							>
								{qaStatus === 'loading' ? 'Adding…' : 'Add House →'}
							</button>

							{#if qaStatus === 'done'}
								<div class="flex items-center gap-4">
									<p class="text-sm font-bold text-green-600">✓ {qaMessage}</p>
									<a href="/house/{qaLastId}" target="_blank" rel="noopener noreferrer"
										class="text-[10px] font-bold uppercase tracking-widest text-stone-400 underline hover:text-stone-900">
										Preview ↗
									</a>
									<button
										type="button"
										onclick={() => window.location.reload()}
										class="text-[10px] font-bold uppercase tracking-widest text-stone-400 underline hover:text-stone-900"
									>
										Refresh list
									</button>
								</div>
							{:else if qaStatus === 'error'}
								<p class="text-sm text-red-500">{qaMessage}</p>
							{/if}
						</div>

						<p class="text-[10px] text-stone-400">
							Press <kbd class="rounded bg-stone-200 px-1 py-0.5 font-mono">Enter</kbd> to add.
							Geocoding happens automatically. House lands in Pending for review.
						</p>
					</div>
				{/if}
			</div>

		<!-- Tabs -->
		<div class="mb-8 flex items-baseline gap-8 border-b-2 border-stone-900 pb-0">
			{#if isAdmin}
				<button
					onclick={() => (activeTab = 'pending')}
					class="pb-3 text-sm font-black uppercase tracking-tight transition
						{activeTab === 'pending'
							? 'border-b-2 border-stone-900 text-stone-900'
							: 'text-stone-400 hover:text-stone-600'}"
				>
					Pending
					{#if data.pending.length > 0}
						<span class="ml-1.5 border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
							{data.pending.length}
						</span>
					{/if}
				</button>
			{/if}
			<button
				onclick={() => { activeTab = 'published' }}
				class="pb-3 text-sm font-black uppercase tracking-tight transition
					{activeTab === 'published'
						? 'border-b-2 border-stone-900 text-stone-900'
						: 'text-stone-400 hover:text-stone-600'}"
			>
				Published
				<span class="ml-1.5 text-[10px] font-bold text-stone-400">
					{data.published.length}
				</span>
			</button>
		</div>

			<!-- ── PENDING TAB ── -->
			{#if activeTab === 'pending'}
				{#if data.pending.length === 0}
					<div class="border-2 border-stone-200 py-24 text-center">
						<p class="text-sm uppercase tracking-widest text-stone-400">All clear — no pending submissions.</p>
						<a href="/" class="mt-6 inline-block text-[10px] font-bold uppercase tracking-widest text-stone-400 underline hover:text-stone-900">
							View Directory
						</a>
					</div>
				{:else}
					<div class="space-y-6">
						{#each data.pending as house (house.id)}
							{@const imgs = houseImages(house.id)}
							<div class="border-2 border-stone-200 bg-white">

								<!-- House header -->
								<div class="flex flex-wrap items-start justify-between gap-4 border-b border-stone-100 p-6">
									<div>
										<p class="text-[10px] font-bold uppercase tracking-[0.25em] text-stone-400">
											{house.style ?? 'Unknown style'}
										</p>
										<h2 class="mt-0.5 font-black text-2xl uppercase tracking-tight text-stone-900">
											{house.address_suburb}
										</h2>
										<p class="mt-1 text-sm text-stone-500">
											{house.address_street} · {house.address_state} {house.address_postcode}
										</p>
									</div>
									<div class="flex flex-wrap items-center gap-2">
										{#if house.year_built}
											<span class="border border-stone-200 px-2 py-1 text-[10px] uppercase tracking-wider text-stone-500">
												{house.year_built}
											</span>
										{/if}
										{#if house.condition}
											<span class="border border-stone-200 px-2 py-1 text-[10px] uppercase tracking-wider text-stone-500">
												{house.condition}
											</span>
										{/if}
										<span class="border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] uppercase tracking-wider text-amber-700">
											Pending
										</span>
										<button
											type="button"
											onclick={() => toggleEdit(house)}
											class="border border-stone-200 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400 transition hover:border-stone-900 hover:text-stone-900"
										>
											{editOpen[house.id] ? '− Close edit' : '+ Edit'}
										</button>
									</div>
								</div>

								<!-- Images -->
								{#if imgs.length > 0}
									<div class="grid grid-cols-3 gap-px border-b border-stone-100 bg-stone-100 sm:grid-cols-5">
										{#each imgs as img (img.id)}
											<a href={img.url} target="_blank" rel="noopener noreferrer"
												class="group aspect-square overflow-hidden bg-stone-100">
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
									<div class="border-b border-stone-100 px-6 py-4">
										<p class="text-xs uppercase tracking-widest text-stone-300">No images submitted</p>
									</div>
								{/if}

								<!-- Description -->
								{#if house.description && !editOpen[house.id]}
									<div class="border-b border-stone-100 px-6 py-4">
										<p class="mb-2 text-xs font-bold uppercase tracking-widest text-stone-400">Description</p>
										<p class="text-sm leading-relaxed text-stone-600">{house.description}</p>
									</div>
								{/if}

								<!-- Inline edit form -->
								{#if editOpen[house.id]}
									{@render editForm(house)}
								{/if}

								<!-- Actions -->
								<div class="p-6 space-y-4">
									<div>
										<button
											type="button"
											onclick={() => toggleNotes(house.id)}
											class="text-[10px] font-bold uppercase tracking-[0.25em] text-stone-400 transition hover:text-stone-900"
										>
											{expandedNotes[house.id] ? '− Hide notes' : '+ Add verification notes'}
										</button>

										{#if expandedNotes[house.id]}
											<textarea
												bind:value={notesText[house.id]}
												placeholder="Optional notes about this submission…"
												rows="3"
												class="mt-3 w-full resize-none border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900"
											></textarea>
										{/if}
									</div>

									<div class="flex flex-wrap gap-3">
										<form method="POST" action="?/approve" use:enhance>
											<input type="hidden" name="id" value={house.id} />
											<input type="hidden" name="notes" value={notesText[house.id] ?? ''} />
											<button
												type="submit"
												class="border-2 border-stone-900 bg-stone-900 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-white hover:text-stone-900"
											>
												✓ Approve &amp; Publish
											</button>
										</form>

										<form method="POST" action="?/reject" use:enhance>
											<input type="hidden" name="id" value={house.id} />
											<input type="hidden" name="notes" value={notesText[house.id] ?? ''} />
											<button
												type="submit"
												class="border-2 border-stone-200 px-6 py-3 text-xs font-bold uppercase tracking-widest text-stone-400 transition hover:border-red-400 hover:text-red-600"
											>
												✕ Reject
											</button>
										</form>

										<a
											href="/house/{house.id}"
											target="_blank"
											rel="noopener noreferrer"
											class="border-2 border-stone-100 px-6 py-3 text-xs font-bold uppercase tracking-widest text-stone-300 transition hover:border-stone-400 hover:text-stone-600"
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
					<div class="border-2 border-stone-200 py-24 text-center">
						<p class="text-sm uppercase tracking-widest text-stone-400">No published listings yet.</p>
					</div>
				{:else}
					<div class="space-y-4">
						{#each data.published as house (house.id)}
							<div class="border-2 border-stone-200 bg-white">

								<!-- House header -->
								<div class="flex flex-wrap items-center justify-between gap-4 p-5
									{editOpen[house.id] ? 'border-b border-stone-100' : ''}">
									<div class="flex items-baseline gap-4">
										<div>
											<p class="text-[10px] font-bold uppercase tracking-[0.25em] text-stone-400">
												{house.style ?? '—'}
											</p>
											<h2 class="font-black text-xl uppercase tracking-tight text-stone-900">
												{house.address_suburb}
											</h2>
											<p class="mt-0.5 text-xs text-stone-400">
												{house.address_street} · {house.address_state} {house.address_postcode}
												{#if house.latitude}
													· <span class="text-green-600">📍 mapped</span>
												{/if}
											</p>
										</div>
									</div>
									<div class="flex flex-wrap items-center gap-2">
										{#if house.year_built}
											<span class="border border-stone-200 px-2 py-1 text-[10px] uppercase tracking-wider text-stone-500">
												{house.year_built}
											</span>
										{/if}
										{#if house.condition}
											<span class="border border-stone-200 px-2 py-1 text-[10px] uppercase tracking-wider text-stone-500">
												{house.condition}
											</span>
										{/if}
										{#if editSuccess[house.id]}
											<span class="border border-green-200 bg-green-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-green-700">
												✓ Saved
											</span>
										{/if}
										<button
											type="button"
											onclick={() => toggleEdit(house)}
											class="border border-stone-200 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400 transition hover:border-stone-900 hover:text-stone-900"
										>
											{editOpen[house.id] ? '− Close' : '+ Edit'}
										</button>
										<a
											href="/house/{house.id}"
											target="_blank"
											rel="noopener noreferrer"
											class="border border-stone-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-300 transition hover:border-stone-400 hover:text-stone-600"
										>
											View ↗
										</a>
									</div>
								</div>

								<!-- Inline edit form -->
								{#if editOpen[house.id]}
									{@render editForm(house)}
								{/if}

							</div>
						{/each}
					</div>
				{/if}
			{/if}

		</div>

</main>

<!-- ── SHARED EDIT FORM SNIPPET ── -->
{#snippet editForm(house: House)}
	{@const d = editData[house.id]}
	{#if d}
		<form
			method="POST"
			action="?/edit"
			class="border-t-2 border-stone-900 bg-stone-50 p-6"
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

			<p class="mb-5 text-[10px] font-bold uppercase tracking-[0.3em] text-stone-500">Edit Listing</p>

			<div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
				<!-- Street -->
				<div class="sm:col-span-2">
					<label for="{house.id}-street" class="mb-1 block text-[10px] font-bold uppercase tracking-widest text-stone-500">Street</label>
					<input
						id="{house.id}-street"
						name="address_street"
						type="text"
						bind:value={d.address_street}
						oninput={() => scheduleGeocode(house.id)}
						class="w-full border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900"
					/>
				</div>

				<!-- Suburb + State -->
				<div>
					<label for="{house.id}-suburb" class="mb-1 block text-[10px] font-bold uppercase tracking-widest text-stone-500">Suburb</label>
					<input
						id="{house.id}-suburb"
						name="address_suburb"
						type="text"
						bind:value={d.address_suburb}
						oninput={() => scheduleGeocode(house.id)}
						class="w-full border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900"
					/>
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="{house.id}-state" class="mb-1 block text-[10px] font-bold uppercase tracking-widest text-stone-500">State</label>
						<select
							id="{house.id}-state"
							name="address_state"
							bind:value={d.address_state}
							oninput={() => scheduleGeocode(house.id)}
							class="w-full border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900"
						>
							{#each AU_STATES as s}
								<option value={s}>{s}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="{house.id}-postcode" class="mb-1 block text-[10px] font-bold uppercase tracking-widest text-stone-500">Postcode</label>
						<input
							id="{house.id}-postcode"
							name="address_postcode"
							type="text"
							maxlength="4"
							bind:value={d.address_postcode}
							oninput={() => scheduleGeocode(house.id)}
							class="w-full border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900"
						/>
					</div>
				</div>

				<!-- Style + Year -->
				<div>
					<label for="{house.id}-style" class="mb-1 block text-[10px] font-bold uppercase tracking-widest text-stone-500">Style</label>
					<select
						id="{house.id}-style"
						name="style"
						bind:value={d.style}
						class="w-full border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900"
					>
						<option value="">Unknown</option>
						{#each STYLES as s}
							<option value={s}>{s}</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="{house.id}-year" class="mb-1 block text-[10px] font-bold uppercase tracking-widest text-stone-500">Year Built</label>
					<input
						id="{house.id}-year"
						name="year_built"
						type="number"
						min="1950"
						max="1990"
						bind:value={d.year_built}
						class="w-full border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900"
					/>
				</div>

				<!-- Builder + Condition -->
				<div>
					<label for="{house.id}-builder" class="mb-1 block text-[10px] font-bold uppercase tracking-widest text-stone-500">Builder</label>
					<input
						id="{house.id}-builder"
						name="builder_name"
						type="text"
						bind:value={d.builder_name}
						class="w-full border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900"
					/>
				</div>
				<div>
					<label for="{house.id}-condition" class="mb-1 block text-[10px] font-bold uppercase tracking-widest text-stone-500">Condition</label>
					<select
						id="{house.id}-condition"
						name="condition"
						bind:value={d.condition}
						class="w-full border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900"
					>
						<option value="">Unknown</option>
						{#each CONDITIONS as c}
							<option value={c}>{c}</option>
						{/each}
					</select>
				</div>

				<!-- Description -->
				<div class="sm:col-span-2">
					<label for="{house.id}-desc" class="mb-1 block text-[10px] font-bold uppercase tracking-widest text-stone-500">Description</label>
					<textarea
						id="{house.id}-desc"
						name="description"
						rows="4"
						bind:value={d.description}
						class="w-full resize-none border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900"
					></textarea>
				</div>

				<!-- Listing URLs -->
				<div>
					<label for="{house.id}-listing" class="mb-1 block text-[10px] font-bold uppercase tracking-widest text-stone-500">For Sale URL</label>
					<input
						id="{house.id}-listing"
						type="url"
						bind:value={d.listing_url}
						oninput={() => { editData[house.id].listing_url = d.listing_url }}
						placeholder="https://www.realestate.com.au/…"
						class="w-full border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900"
					/>
				</div>
				<div>
					<label for="{house.id}-sold" class="mb-1 block text-[10px] font-bold uppercase tracking-widest text-stone-500">Sold Record URL</label>
					<input
						id="{house.id}-sold"
						type="url"
						bind:value={d.sold_listing_url}
						oninput={() => { editData[house.id].sold_listing_url = d.sold_listing_url }}
						placeholder="https://www.domain.com.au/…"
						class="w-full border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900"
					/>
				</div>
			</div>

			<!-- Geocoding status + coords -->
			<div class="mt-4 flex items-center justify-between gap-4">
				<div class="flex items-center gap-3">
					{#if editGeocoding[house.id]}
						<p class="text-[10px] font-bold uppercase tracking-widest text-stone-400">Locating…</p>
					{:else if editGeocodedOk[house.id]}
						<p class="text-[10px] font-bold uppercase tracking-widest text-green-600">✓ Location found</p>
					{:else if d.latitude}
						<p class="text-[10px] font-bold uppercase tracking-widest text-stone-400">
							📍 {parseFloat(d.latitude).toFixed(5)}, {parseFloat(d.longitude).toFixed(5)}
						</p>
					{:else}
						<p class="text-[10px] uppercase tracking-widest text-stone-300">No coordinates</p>
					{/if}
					{#if d.address_street && d.address_suburb}
						<button
							type="button"
							onclick={() => geocodeFor(house.id)}
							class="text-[10px] font-bold uppercase tracking-widest text-stone-400 underline hover:text-stone-900"
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
						class="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-stone-400 transition hover:text-stone-900"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={editSaving[house.id]}
						class="border-2 border-stone-900 bg-stone-900 px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-white hover:text-stone-900 disabled:opacity-50"
					>
						{editSaving[house.id] ? 'Saving…' : 'Save Changes'}
					</button>
				</div>
			</div>

		</form>

		<!-- Photos — outside the edit form to avoid nested <form> invalid HTML -->
		<div class="border-t border-stone-200 bg-stone-50 px-6 pb-6 pt-5">
			<p class="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-stone-500">
				Photos · {allImages(house.id).length}
			</p>

			<!-- Existing + newly uploaded images -->
			{#if allImages(house.id).length > 0}
				<div class="mb-4 grid grid-cols-4 gap-2 sm:grid-cols-6">
					{#each allImages(house.id) as img (img.id)}
						<div class="group relative aspect-square overflow-hidden border border-stone-200 bg-stone-100">
							<img
								src={img.url}
								alt={img.caption ?? house.address_suburb}
								class="h-full w-full object-cover"
								loading="lazy"
							/>
							{#if img.is_primary}
								<span class="absolute bottom-0 left-0 bg-stone-900 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white">
									Primary
								</span>
							{/if}
							{#if localImages[house.id]?.find((l) => l.id === img.id)}
								<span class="absolute right-1 top-1 bg-green-600 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white">
									New
								</span>
							{:else}
								<!-- Delete form — safe here as it's outside the edit form -->
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
										class="flex h-6 w-6 items-center justify-center bg-red-600 text-white"
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

			<!-- Upload new photos -->
			<label
				for="{house.id}-upload"
				class="flex cursor-pointer items-center gap-3 border border-dashed border-stone-300 bg-white px-4 py-3 transition hover:border-stone-500
					{imgUploading[house.id] ? 'pointer-events-none opacity-50' : ''}"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5V19a1.5 1.5 0 001.5 1.5h15A1.5 1.5 0 0021 19v-2.5M16.5 8.25L12 3.75m0 0L7.5 8.25M12 3.75V15" />
				</svg>
				<span class="text-[10px] font-bold uppercase tracking-widest text-stone-400">
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
