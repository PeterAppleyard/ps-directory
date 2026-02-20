<script lang="ts">
	import type { House, Image } from '$lib/types'

	type ImageWithUrl = Image & { url: string }

	let { data }: { data: { house: House; images: ImageWithUrl[] } } = $props()

	const house = $derived(data.house)
	const images = $derived(data.images)
	const primary = $derived(images.find((i) => i.is_primary) ?? images[0] ?? null)
	const gallery = $derived(images.filter((i) => i !== primary))

	// Lightbox
	let lightboxIndex = $state<number | null>(null)
	const allImages = $derived(primary ? [primary, ...gallery] : gallery)

	function openLightbox(index: number) {
		lightboxIndex = index
	}

	function closeLightbox() {
		lightboxIndex = null
	}

	function prevImage() {
		if (lightboxIndex === null) return
		lightboxIndex = (lightboxIndex - 1 + allImages.length) % allImages.length
	}

	function nextImage() {
		if (lightboxIndex === null) return
		lightboxIndex = (lightboxIndex + 1) % allImages.length
	}

	function handleKeydown(e: KeyboardEvent) {
		if (lightboxIndex === null) return
		if (e.key === 'Escape') closeLightbox()
		if (e.key === 'ArrowLeft') prevImage()
		if (e.key === 'ArrowRight') nextImage()
	}

	// Share
	let copied = $state(false)
	async function copyLink() {
		await navigator.clipboard.writeText(window.location.href)
		copied = true
		setTimeout(() => (copied = false), 2000)
	}

	function conditionColor(condition: string | null) {
		if (condition === 'At Risk') return 'text-red-600 border-red-200 bg-red-50'
		if (condition === 'Demolished') return 'text-stone-400 border-stone-200 bg-stone-50'
		return 'text-stone-600 border-stone-200'
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<main class="min-h-screen bg-white">

	<!-- Back nav -->
	<div class="border-b-2 border-stone-900 bg-white px-6 py-4">
		<div class="mx-auto max-w-6xl">
			<a
				href="/"
				class="text-[10px] font-bold uppercase tracking-[0.3em] text-stone-400 transition hover:text-stone-900"
			>
				← Back to Directory
			</a>
		</div>
	</div>

	<!-- Hero image -->
	<div class="w-full bg-stone-900" style="aspect-ratio: 16/7; max-height: 60vh; overflow: hidden;">
		{#if primary}
			<button
				type="button"
				onclick={() => openLightbox(0)}
				class="block h-full w-full cursor-zoom-in"
				aria-label="View full size image"
			>
				<img
					src={primary.url}
					alt={primary.caption ?? `${house.address_suburb} ${house.style}`}
					class="h-full w-full object-cover"
					loading="eager"
				/>
			</button>
		{:else}
			<!-- Placeholder masthead when no image -->
			<div class="flex h-full w-full items-center justify-center px-8">
				<p class="font-black uppercase tracking-tight text-stone-700"
					style="font-size: clamp(3rem, 10vw, 9rem); line-height: 0.9;">
					{house.address_suburb}
				</p>
			</div>
		{/if}
	</div>

	<!-- House info panel -->
	<section class="border-b-2 border-stone-900 bg-white">
		<div class="mx-auto max-w-6xl divide-y-2 md:divide-y-0 md:grid md:grid-cols-[320px_1fr] md:divide-x-2 divide-stone-900">

			<!-- Left: key facts -->
			<div class="px-8 py-10 space-y-6">
				{#if house.style}
					<div>
						<p class="text-[10px] font-bold uppercase tracking-[0.3em] text-stone-400 mb-1">Style</p>
						<p class="font-black text-2xl uppercase tracking-tight text-stone-900">{house.style}</p>
					</div>
				{/if}

				<div>
					<p class="text-[10px] font-bold uppercase tracking-[0.3em] text-stone-400 mb-1">Location</p>
					<p class="font-black text-xl uppercase tracking-tight text-stone-900">{house.address_suburb}</p>
					<p class="text-sm text-stone-500 mt-0.5">{house.address_state} {house.address_postcode}</p>
				</div>

				{#if house.year_built}
					<div>
						<p class="text-[10px] font-bold uppercase tracking-[0.3em] text-stone-400 mb-1">Built</p>
						<p class="font-black text-xl uppercase tracking-tight text-stone-900">{house.year_built}</p>
					</div>
				{/if}

				{#if house.builder_name}
					<div>
						<p class="text-[10px] font-bold uppercase tracking-[0.3em] text-stone-400 mb-1">Builder</p>
						<p class="text-sm text-stone-700">{house.builder_name}</p>
					</div>
				{/if}

				{#if house.condition}
					<div>
						<p class="text-[10px] font-bold uppercase tracking-[0.3em] text-stone-400 mb-2">Condition</p>
						<span class="border px-3 py-1 text-[10px] font-bold uppercase tracking-widest {conditionColor(house.condition)}">
							{house.condition}
						</span>
					</div>
				{/if}

				<!-- Real estate listing links -->
				{#if house.listing_url || house.sold_listing_url}
					<div class="space-y-2 border-t border-stone-100 pt-4">
						<p class="text-[10px] font-bold uppercase tracking-[0.3em] text-stone-400 mb-3">Listings</p>
						{#if house.listing_url}
							<a
								href={house.listing_url}
								target="_blank"
								rel="noopener noreferrer"
								class="flex items-center justify-between border-2 border-stone-900 bg-stone-900 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-white hover:text-stone-900"
							>
								<span>For Sale</span>
								<span>↗</span>
							</a>
						{/if}
						{#if house.sold_listing_url}
							<a
								href={house.sold_listing_url}
								target="_blank"
								rel="noopener noreferrer"
								class="flex items-center justify-between border-2 border-stone-200 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-stone-500 transition hover:border-stone-900 hover:text-stone-900"
							>
								<span>Sold Record</span>
								<span>↗</span>
							</a>
						{/if}
					</div>
				{/if}

			<!-- Share -->
				<div class="pt-2 border-t border-stone-100">
					<button
						type="button"
						onclick={copyLink}
						class="text-[10px] font-bold uppercase tracking-[0.25em] text-stone-400 transition hover:text-stone-900"
					>
						{copied ? '✓ Link Copied' : 'Copy Link'}
					</button>
				</div>
			</div>

			<!-- Right: description + address -->
			<div class="px-8 py-10">
				<h1 class="font-black text-4xl uppercase tracking-tight text-stone-900 mb-2 md:text-5xl">
					{house.address_suburb}
				</h1>
				<p class="text-sm text-stone-400 uppercase tracking-widest mb-8">
					{house.address_street} · {house.address_state}
				</p>

				{#if house.description}
					<div class="prose-sm text-stone-600 leading-relaxed max-w-prose space-y-3">
						{#each house.description.split('\n').filter(Boolean) as para, i (i)}
							<p>{para}</p>
						{/each}
					</div>
				{:else}
					<p class="text-sm text-stone-400 italic">No description provided.</p>
				{/if}
			</div>
		</div>
	</section>

	<!-- Gallery -->
	{#if gallery.length > 0}
		<section class="border-b-2 border-stone-900 bg-white">
			<div class="mx-auto max-w-6xl">
				<div class="border-b-2 border-stone-900 px-8 py-6">
					<p class="text-[10px] font-bold uppercase tracking-[0.3em] text-stone-400">
						Gallery · {images.length} photo{images.length !== 1 ? 's' : ''}
					</p>
				</div>
				<div class="grid grid-cols-2 gap-px bg-stone-900 sm:grid-cols-3 lg:grid-cols-4">
					{#each gallery as image, i (image.id)}
						<button
							type="button"
							onclick={() => openLightbox(i + 1)}
							class="group aspect-square overflow-hidden bg-stone-100 cursor-zoom-in"
							aria-label="View photo {i + 2}"
						>
							<img
								src={image.url}
								alt={image.caption ?? `Photo ${i + 2}`}
								class="h-full w-full object-cover transition duration-300 group-hover:scale-105"
								loading="lazy"
							/>
						</button>
					{/each}
				</div>
			</div>
		</section>
	{/if}

	<!-- CTA band -->
	<section class="bg-stone-900 px-6 py-16">
		<div class="mx-auto max-w-6xl flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
			<p class="font-black text-2xl uppercase tracking-tight text-white md:text-3xl">
				Know another P&amp;S home?
			</p>
			<div class="flex flex-wrap gap-4">
				<a
					href="/submit"
					class="inline-block border-2 border-white bg-white px-6 py-3 text-xs font-bold uppercase tracking-widest text-stone-900 transition hover:bg-transparent hover:text-white"
				>
					Submit a Home
				</a>
				<a
					href="/"
					class="inline-block border-2 border-stone-600 px-6 py-3 text-xs font-bold uppercase tracking-widest text-stone-400 transition hover:border-white hover:text-white"
				>
					Back to Directory
				</a>
			</div>
		</div>
	</section>
</main>

<!-- Lightbox -->
{#if lightboxIndex !== null}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
		onclick={closeLightbox}
		onkeydown={(e) => e.key === 'Escape' && closeLightbox()}
		role="dialog"
		aria-modal="true"
		aria-label="Image viewer"
		tabindex="-1"
	>
		<!-- Counter -->
		<p class="absolute top-4 left-6 text-[10px] font-bold uppercase tracking-[0.3em] text-stone-500">
			{lightboxIndex + 1} / {allImages.length}
		</p>

		<!-- Close -->
		<button
			type="button"
			onclick={closeLightbox}
			class="absolute top-4 right-6 text-[10px] font-bold uppercase tracking-[0.3em] text-stone-500 transition hover:text-white"
			aria-label="Close"
		>
			Close ✕
		</button>

		<!-- Image — stop propagation so clicking it doesn't close -->
		<div
			class="relative flex max-h-[85vh] max-w-[90vw] items-center justify-center"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="presentation"
		>
			<img
				src={allImages[lightboxIndex].url}
				alt={allImages[lightboxIndex].caption ?? `${house.address_suburb}, ${house.style}`}
				class="max-h-[85vh] max-w-[90vw] object-contain"
			/>
			{#if allImages[lightboxIndex].caption}
				<p class="absolute bottom-0 left-0 right-0 bg-black/60 px-4 py-2 text-xs text-stone-300">
					{allImages[lightboxIndex].caption}
				</p>
			{/if}
		</div>

		<!-- Prev / Next -->
		{#if allImages.length > 1}
			<button
				type="button"
				onclick={(e) => { e.stopPropagation(); prevImage() }}
				class="absolute left-4 top-1/2 -translate-y-1/2 border-2 border-stone-700 px-4 py-3 text-xs font-bold uppercase tracking-widest text-stone-400 transition hover:border-white hover:text-white"
				aria-label="Previous image"
			>
				←
			</button>
			<button
				type="button"
				onclick={(e) => { e.stopPropagation(); nextImage() }}
				class="absolute right-4 top-1/2 -translate-y-1/2 border-2 border-stone-700 px-4 py-3 text-xs font-bold uppercase tracking-widest text-stone-400 transition hover:border-white hover:text-white"
				aria-label="Next image"
			>
				→
			</button>
		{/if}
	</div>
{/if}
