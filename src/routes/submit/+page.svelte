<script lang="ts">
	import { supabase } from '$lib/supabase'
	import { compressImage, formatBytes } from '$lib/utils/compress'
	import type { HouseCondition } from '$lib/types'
	import type { PageData } from './$types'
	import { PUBLIC_MAPBOX_TOKEN } from '$env/static/public'

	const CONDITIONS: HouseCondition[] = ['Original', 'Renovated', 'At Risk', 'Demolished']

	let { data }: { data: PageData } = $props()
	const AU_STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT']

	// Form fields
	let street = $state('')
	let suburb = $state('')
	let addressState = $state('NSW')
	let postcode = $state('')
	let style = $state('')
	let yearBuilt = $state('')
	let builderName = $state('')
	let condition: HouseCondition | '' = $state('')
	let description = $state('')
	let listingUrl = $state('')
	let soldListingUrl = $state('')
	let submitterEmail = $state('')
	let imageFiles: File[] = $state([])

	// Geocoded coordinates
	let latitude: number | null = $state(null)
	let longitude: number | null = $state(null)
	let geocoding = $state(false)

	// UI state
	let submitting = $state(false)
	let submitted = $state(false)
	let errors: Record<string, string> = $state({})
	let submitError = $state('')
	let uploadProgress = $state(0)
	let uploadStatus = $state('') // e.g."Compressing 2 of 3…"
	let debugInfo: string = $state('')

	// Image preview URLs (revoked on cleanup)
	let previews = $derived(imageFiles.map((f) => URL.createObjectURL(f)))

	// Track original sizes for display
	let originalSizes: number[] = $state([])

	// Geocode when address fields are complete
	let geocodeTimer: ReturnType<typeof setTimeout>
	function scheduleGeocode() {
		clearTimeout(geocodeTimer)
		if (!street.trim() || !suburb.trim() || !postcode.trim()) return
		geocodeTimer = setTimeout(geocodeAddress, 800)
	}

	async function geocodeAddress() {
		const query = `${street.trim()}, ${suburb.trim()}, ${addressState} ${postcode.trim()}, Australia`
		geocoding = true
		try {
			const res = await fetch(
				`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${PUBLIC_MAPBOX_TOKEN}&country=AU&limit=1`
			)
			const json = await res.json()
			const feature = json.features?.[0]
			if (feature) {
				longitude = feature.center[0]
				latitude = feature.center[1]
			}
		} catch {
			// Geocoding is best-effort — silently skip if it fails
		} finally {
			geocoding = false
		}
	}

	function handleFileChange(e: Event) {
		const input = e.currentTarget as HTMLInputElement
		if (!input.files) return
		const incoming = Array.from(input.files).filter((f) => f.type.startsWith('image/'))
		originalSizes = [...originalSizes, ...incoming.map((f) => f.size)]
		imageFiles = [...imageFiles, ...incoming]
		input.value = ''
	}

	function removeImage(index: number) {
		URL.revokeObjectURL(previews[index])
		imageFiles = imageFiles.filter((_, i) => i !== index)
		originalSizes = originalSizes.filter((_, i) => i !== index)
	}

	function validate(): boolean {
		const e: Record<string, string> = {}
		if (!street.trim()) e.street = 'Street address is required.'
		if (!suburb.trim()) e.suburb = 'Suburb is required.'
		if (!postcode.trim()) e.postcode = 'Postcode is required.'
		else if (!/^\d{4}$/.test(postcode)) e.postcode = 'Enter a valid 4-digit postcode.'
		if (yearBuilt && (parseInt(yearBuilt) < 1950 || parseInt(yearBuilt) > 1990))
			e.yearBuilt = 'Year should be between 1950 and 1990.'
		errors = e
		return Object.keys(e).length === 0
	}

	function resetForm() {
		street = ''
		suburb = ''
		addressState = 'NSW'
		postcode = ''
		style = ''
		yearBuilt = ''
		builderName = ''
		condition = ''
		description = ''
		listingUrl = ''
		soldListingUrl = ''
		submitterEmail = ''
		imageFiles = []
		originalSizes = []
		errors = {}
		submitError = ''
		debugInfo = ''
		uploadProgress = 0
		uploadStatus = ''
		latitude = null
		longitude = null
	}

	async function handleSubmit(e: Event) {
		e.preventDefault()
		if (!validate()) return

		submitting = true
		submitError = ''
		debugInfo = ''
		uploadProgress = 0
		uploadStatus = ''

		// If not yet geocoded, try once more before submitting
		if (latitude === null && street.trim() && suburb.trim()) {
			await geocodeAddress()
		}

		const payload = {
			address_street: street.trim(),
			address_suburb: suburb.trim(),
			address_state: addressState,
			address_postcode: postcode.trim(),
			style: style || null,
			year_built: yearBuilt ? parseInt(yearBuilt) : null,
			builder_name: builderName.trim() || null,
			condition: condition || null,
			description: description.trim() || null,
			status: 'pending',
			latitude,
			longitude,
			listing_url: listingUrl.trim() || null,
			sold_listing_url: soldListingUrl.trim() || null,
			submitter_email: submitterEmail.trim() || null
		}

		console.log('[Submit] payload:', payload)

		// 1. Insert house record via server-side API (bypasses RLS)
		const houseRes = await fetch('/api/submit-house', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		})

		const houseJson = await houseRes.json()

		if (!houseRes.ok || !houseJson.id) {
			const info = { status: houseRes.status, ...houseJson, payload }
			console.error('[Submit] house insert failed:', info)
			debugInfo = JSON.stringify(info, null, 2)
			submitError = 'Failed to save house details. Please try again.'
			submitting = false
			return
		}

		const house = { id: houseJson.id as string }

		// 2. Compress + upload images
		if (imageFiles.length > 0) {
			for (let i = 0; i < imageFiles.length; i++) {
				// Compress
				uploadStatus = `Compressing ${i + 1} of ${imageFiles.length}…`
				let file: File
				try {
					const result = await compressImage(imageFiles[i])
					file = result.file
				} catch {
					// Fall back to original if compression fails
					file = imageFiles[i]
				}

				// Upload
				uploadStatus = `Uploading ${i + 1} of ${imageFiles.length}…`
				const path = `${house.id}/${crypto.randomUUID()}.webp`

				const { error: uploadErr } = await supabase.storage
					.from('house-images')
					.upload(path, file, { contentType: 'image/webp' })

				if (uploadErr) {
					console.error(`Failed to upload image ${i + 1}:`, uploadErr)
				} else {
					// Save image record via server-side API (bypasses RLS)
					await fetch('/api/save-image', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							house_id: house.id,
							storage_path: path,
							is_primary: i === 0,
							sort_order: i,
							caption: null
						})
					})
				}

				uploadProgress = Math.round(((i + 1) / imageFiles.length) * 100)
			}
		}

		submitting = false
		submitted = true
		resetForm()
	}
</script>

<main class="min-h-screen bg-stone-50">
	<!-- Header -->
	<section class="border-b border-stone-200 bg-white px-6 py-16 text-center">
		<p class="mb-3 text-xs font-bold tracking-normal text-stone-400">Contribute</p>
		<h2 class="font-black text-6xl tracking-tight text-stone-900 md:text-8xl">Submit a Home</h2>
		<p class="mx-auto mt-4 max-w-xl text-stone-500">
			Know a Pettit &amp; Sevitt home? Help us document it. All submissions are reviewed before
			publishing.
		</p>
	</section>

	<section class="mx-auto max-w-2xl px-6 py-16">
		{#if submitted}
			<!-- Success -->
			<div class="border-2 border-stone-900 p-12 text-center">
				<p class="text-[10px] font-bold tracking-normal text-stone-400">Received</p>
				<h3 class="mt-3 text-3xl font-black tracking-tight text-stone-900">Thank you</h3>
				<p class="mx-auto mt-4 max-w-sm text-stone-500">
					Your submission is under review and will appear in the directory once verified.
				</p>
				<div class="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
					<a
						href="/"
						class="border-2 border-stone-900 px-6 py-3 text-xs font-bold tracking-normal text-stone-900 transition hover:bg-stone-900 hover:text-white"
					>
						Back to Directory
					</a>
					<button
						onclick={() => (submitted = false)}
						class="border-2 border-stone-300 px-6 py-3 text-xs font-bold tracking-normal text-stone-500 transition hover:border-stone-900 hover:text-stone-900"
					>
						Submit Another
					</button>
				</div>
			</div>
		{:else}
			<form onsubmit={handleSubmit} novalidate class="space-y-10">

				<!-- ADDRESS -->
				<fieldset class="space-y-5">
					<legend class="w-full border-b border-stone-200 pb-2 text-[10px] font-bold tracking-normal text-stone-400">
						Address
					</legend>

					<div>
						<label for="street" class="mb-1.5 block text-xs font-bold tracking-normal text-stone-600">
							Street <span class="text-red-500">*</span>
						</label>
						<input
							id="street"
							type="text"
							bind:value={street}
							oninput={scheduleGeocode}
							placeholder="42 Sample Street"
							class="w-full border px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900 {errors.street ? 'border-red-400 bg-red-50' : 'border-stone-300 bg-white'}"
						/>
						{#if errors.street}<p class="mt-1 text-xs text-red-500">{errors.street}</p>{/if}
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div>
							<label for="suburb" class="mb-1.5 block text-xs font-bold tracking-normal text-stone-600">
								Suburb <span class="text-red-500">*</span>
							</label>
							<input
								id="suburb"
								type="text"
								bind:value={suburb}
								oninput={scheduleGeocode}
								placeholder="Kellyville"
								class="w-full border px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900 {errors.suburb ? 'border-red-400 bg-red-50' : 'border-stone-300 bg-white'}"
							/>
							{#if errors.suburb}<p class="mt-1 text-xs text-red-500">{errors.suburb}</p>{/if}
						</div>

						<div>
							<label for="addressState" class="mb-1.5 block text-xs font-bold tracking-normal text-stone-600">
								State
							</label>
							<select
								id="addressState"
								bind:value={addressState}
								class="w-full border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900"
							>
								{#each AU_STATES as s}
									<option value={s}>{s}</option>
								{/each}
							</select>
						</div>
					</div>

					<div class="max-w-[160px]">
						<label for="postcode" class="mb-1.5 block text-xs font-bold tracking-normal text-stone-600">
							Postcode <span class="text-red-500">*</span>
						</label>
						<input
							id="postcode"
							type="text"
							bind:value={postcode}
							oninput={scheduleGeocode}
							maxlength="4"
							placeholder="2155"
							class="w-full border px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900 {errors.postcode ? 'border-red-400 bg-red-50' : 'border-stone-300 bg-white'}"
						/>
						{#if errors.postcode}<p class="mt-1 text-xs text-red-500">{errors.postcode}</p>{/if}
					</div>

					<!-- Geocoding status -->
					{#if geocoding}
						<p class="text-[10px] font-bold tracking-normal text-stone-400">
							Locating on map…
						</p>
					{:else if latitude !== null}
						<p class="text-[10px] font-bold tracking-normal text-green-600">
							✓ Location found
						</p>
					{/if}
				</fieldset>

				<!-- HOUSE DETAILS -->
				<fieldset class="space-y-5">
					<legend class="w-full border-b border-stone-200 pb-2 text-[10px] font-bold tracking-normal text-stone-400">
						House Details
					</legend>

					<div class="grid grid-cols-2 gap-4">
						<div>
							<label for="style" class="mb-1.5 block text-xs font-bold tracking-normal text-stone-600">
								Style
							</label>
							<select
								id="style"
								bind:value={style}
								class="w-full border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900"
							>
							<option value="">Unknown</option>
							{#each data.styles as s}
								<option value={s.name}>{s.name}</option>
							{/each}
							</select>
						</div>

						<div>
							<label for="year" class="mb-1.5 block text-xs font-bold tracking-normal text-stone-600">
								Year Built
							</label>
							<input
								id="year"
								type="number"
								bind:value={yearBuilt}
								min="1950"
								max="1990"
								placeholder="1967"
								class="w-full border px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900 {errors.yearBuilt ? 'border-red-400 bg-red-50' : 'border-stone-300 bg-white'}"
							/>
							{#if errors.yearBuilt}<p class="mt-1 text-xs text-red-500">{errors.yearBuilt}</p>{/if}
						</div>
					</div>

					<div>
						<label for="builder" class="mb-1.5 block text-xs font-bold tracking-normal text-stone-600">
							Builder Name
						</label>
						<input
							id="builder"
							type="text"
							bind:value={builderName}
							placeholder="e.g. Pettit & Sevitt"
							class="w-full border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900"
						/>
					</div>

					<div>
						<label for="condition" class="mb-1.5 block text-xs font-bold tracking-normal text-stone-600">
							Current Condition
						</label>
						<select
							id="condition"
							bind:value={condition}
							class="w-full border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900"
						>
							<option value="">Unknown</option>
							{#each CONDITIONS as c}
								<option value={c}>{c}</option>
							{/each}
						</select>
					</div>

					<div>
						<label for="description" class="mb-1.5 block text-xs font-bold tracking-normal text-stone-600">
							Description / Notes
						</label>
						<textarea
							id="description"
							bind:value={description}
							rows="5"
							placeholder="Original features, history, current state, anything else worth noting…"
							class="w-full resize-none border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900"
						></textarea>
					</div>

					<div>
						<label for="listingUrl" class="mb-1.5 block text-xs font-bold tracking-normal text-stone-600">
							For Sale Listing URL
						</label>
						<input
							id="listingUrl"
							type="url"
							bind:value={listingUrl}
							placeholder="https://www.realestate.com.au/…"
							class="w-full border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900"
						/>
						<p class="mt-1 text-xs text-stone-400">Optional — link to a current listing on realestate.com.au or domain.com.au</p>
					</div>

					<div>
						<label for="soldListingUrl" class="mb-1.5 block text-xs font-bold tracking-normal text-stone-600">
							Sold Record URL
						</label>
						<input
							id="soldListingUrl"
							type="url"
							bind:value={soldListingUrl}
							placeholder="https://www.domain.com.au/…"
							class="w-full border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900"
						/>
						<p class="mt-1 text-xs text-stone-400">Optional — link to a sold record</p>
					</div>
				</fieldset>

			<!-- YOUR DETAILS -->
			<fieldset class="space-y-5">
				<legend class="w-full border-b border-stone-200 pb-2 text-[10px] font-bold tracking-normal text-stone-400">
					Your Details
				</legend>

				<div>
					<label for="submitterEmail" class="mb-1.5 block text-xs font-bold tracking-normal text-stone-600">
						Email Address
					</label>
					<input
						id="submitterEmail"
						type="email"
						bind:value={submitterEmail}
						placeholder="your@email.com"
						autocomplete="email"
						class="w-full border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900"
					/>
					<p class="mt-1 text-xs text-stone-400">
						Optional — we'll notify you when your submission is reviewed. We won't share your email.
					</p>
				</div>
			</fieldset>

			<!-- IMAGES -->
			<fieldset class="space-y-5">
				<legend class="w-full border-b border-stone-200 pb-2 text-[10px] font-bold tracking-normal text-stone-400">
					Photos
				</legend>

					<!-- Drop zone -->
					<label
						for="images"
						class="flex cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed border-stone-300 bg-white px-6 py-10 text-center transition hover:border-stone-500"
					>
						<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
							<path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5V19a1.5 1.5 0 001.5 1.5h15A1.5 1.5 0 0021 19v-2.5M16.5 8.25L12 3.75m0 0L7.5 8.25M12 3.75V15" />
						</svg>
						<span class="text-xs font-bold tracking-normal text-stone-400">
							Click to add photos
						</span>
						<span class="text-xs text-stone-300">JPG, PNG, WEBP — multiple files welcome</span>
						<input
							id="images"
							type="file"
							accept="image/*"
							multiple
							onchange={handleFileChange}
							class="sr-only"
						/>
					</label>

					<!-- Previews -->
				{#if imageFiles.length > 0}
					<div class="grid grid-cols-3 gap-3 sm:grid-cols-4">
						{#each previews as preview, i (i)}
							<div class="group relative aspect-square overflow-hidden border border-stone-200 bg-stone-100">
								<img src={preview} alt="Preview {i + 1}" class="h-full w-full object-cover" />
								<div class="absolute bottom-0 left-0 right-0 flex items-end justify-between">
									{#if i === 0}
										<span class="bg-stone-900 px-1.5 py-0.5 text-[9px] font-bold tracking-normal text-white">
											Primary
										</span>
									{:else}
										<span></span>
									{/if}
									<span class="bg-black/50 px-1.5 py-0.5 text-[9px] text-stone-300">
										{formatBytes(originalSizes[i] ?? 0)}
									</span>
								</div>
								<button
									type="button"
									onclick={() => removeImage(i)}
									class="absolute right-1 top-1 flex h-6 w-6 items-center justify-center bg-stone-900 text-white opacity-0 transition group-hover:opacity-100"
									aria-label="Remove image"
								>
									<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
										<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
									</svg>
								</button>
							</div>
						{/each}
					</div>
					<p class="text-xs text-stone-400">
						{imageFiles.length} photo{imageFiles.length !== 1 ? 's' : ''} selected — images will be compressed to WebP before upload.
					</p>
				{/if}
				</fieldset>

				<!-- Upload progress -->
			{#if submitting && imageFiles.length > 0}
				<div class="space-y-1.5">
					<div class="flex justify-between text-xs text-stone-500">
						<span class=" tracking-normal">{uploadStatus || 'Processing…'}</span>
						<span>{uploadProgress}%</span>
					</div>
					<div class="h-1 w-full bg-stone-200">
						<div class="h-1 bg-stone-900 transition-all duration-300" style="width: {uploadProgress}%"></div>
					</div>
				</div>
			{/if}

			{#if submitError}
				<p class="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{submitError}</p>
			{/if}

			{#if debugInfo}
				<div class="border border-orange-300 bg-orange-50 p-4">
					<p class="mb-2 text-[10px] font-bold tracking-normal text-orange-600">Debug Info</p>
					<pre class="overflow-auto text-[11px] text-orange-900 whitespace-pre-wrap break-all">{debugInfo}</pre>
				</div>
			{/if}

				<button
					type="submit"
					disabled={submitting}
					class="relative w-full border-2 border-stone-900 bg-stone-900 px-6 py-4 text-xs font-bold tracking-normal text-white transition hover:bg-white hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{#if submitting}
						<span class="flex items-center justify-center gap-2">
							<svg class="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
							</svg>
							{imageFiles.length > 0 ? 'Saving & Uploading…' : 'Submitting…'}
						</span>
					{:else}
						Submit for Review
					{/if}
				</button>

				<p class="text-center text-xs text-stone-400">
					Fields marked <span class="text-red-500">*</span> are required.
					All other fields are optional but help with verification.
				</p>
			</form>
		{/if}
	</section>
</main>
