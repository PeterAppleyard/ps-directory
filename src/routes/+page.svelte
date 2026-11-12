<script lang="ts">
	import { goto } from '$app/navigation'
	import { navigating, page } from '$app/state'
	import { untrack } from 'svelte'
	import Map from '$lib/components/Map.svelte'
	import { fetchHousePage, type CardHouse } from '$lib/houses'
	import { stripStreetNumber } from '$lib/utils/compress'
	import type { PageData } from './$types'

	let { data }: { data: PageData } = $props()

	// Cards loaded so far — resets whenever the filters change and the page data reloads
	let houses = $derived<CardHouse[]>(data.houses)
	let loadingMore = $state(false)
	let loadMoreError = $state('')

	// The search box is local state so typing isn't interrupted by the debounced URL update
	let searchQuery = $state(untrack(() => data.filters.q))
	let searchTimer: ReturnType<typeof setTimeout> | undefined

	const isFiltering = $derived(navigating.to?.url.pathname === '/')

	function styleFallback(style: string): string | null {
		const map: Record<string, string> = {
			'Lowline': '/images/fallback-lowline.jpg',
			'Split-level': '/images/fallback-split-level.jpg',
		}
		return map[style] ?? null
	}

	/** Updates one URL param (dropping it when empty) — the load function re-queries from the URL. */
	function setParam(key: string, value: string) {
		const url = new URL(page.url)
		if (value) url.searchParams.set(key, value)
		else url.searchParams.delete(key)
		goto(url, { replaceState: true, keepFocus: true, noScroll: true })
	}

	function onSearchInput() {
		clearTimeout(searchTimer)
		searchTimer = setTimeout(() => setParam('q', searchQuery.trim()), 300)
	}

	function clearFilters() {
		clearTimeout(searchTimer)
		searchQuery = ''
		const url = new URL(page.url)
		for (const key of ['q', 'suburb', 'style']) url.searchParams.delete(key)
		goto(url, { replaceState: true, noScroll: true })
	}

	async function loadMore() {
		loadingMore = true
		loadMoreError = ''
		try {
			const next = await fetchHousePage(data.filters, houses.length)
			houses = [...houses, ...next.houses]
		} catch (err) {
			console.error('Failed to load more houses:', err)
			loadMoreError = 'Couldn’t load more homes. Please try again.'
		} finally {
			loadingMore = false
		}
	}
</script>

<main class="min-h-screen bg-white">
	<!-- Hero — hidden in map mode -->
	<section class="ink-hero px-6 py-16 md:py-24 {data.view === 'map' ? 'hidden' : ''}">
		<div class="mx-auto max-w-6xl">
			<h1 class="font-black leading-none tracking-tight text-[#faf2e5]"
				style="font-size: clamp(4rem, 15vw, 14rem); line-height: 0.9;">
				Pettit<span style="font-size: 0.75em; font-weight: 100; font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; position: relative; top: 0.32em; line-height: 1;">+</span><span style="display: block; margin-top: -0.15em;">Sevitt</span>
			</h1>
			<p class="mt-8 text-base text-[#faf2e5]/60 leading-relaxed">
				An Independent Register of Pettit &amp; Sevitt Homes
			</p>
		</div>
	</section>

	<!-- Filters -->
	<section class="sticky top-0 z-10 border-b border-stone-200 bg-stone-100 px-6 py-4">
		<div class="mx-auto flex max-w-6xl flex-wrap items-center gap-4">

			<!-- Search -->
			<div class="flex items-center gap-3 flex-1 min-w-[180px]">
				<label for="search" class="text-[10px] font-bold tracking-normal text-stone-400 shrink-0">
					Search
				</label>
				<input
					id="search"
					type="search"
					bind:value={searchQuery}
					oninput={onSearchInput}
					placeholder="Suburb, street, style…"
					class="w-full border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900"
				/>
			</div>

			<div class="h-5 w-px bg-stone-300 hidden sm:block"></div>

			<!-- Suburb -->
			<div class="flex items-center gap-3">
				<label for="suburb" class="text-[10px] font-bold tracking-normal text-stone-400">
					Suburb
				</label>
				<select
					id="suburb"
					value={data.filters.suburb}
					onchange={(e) => setParam('suburb', e.currentTarget.value)}
					class="border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-900"
				>
					<option value="">All</option>
					{#each data.options.suburbs as suburb}
						<option value={suburb}>{suburb}</option>
					{/each}
				</select>
			</div>

			<!-- Style -->
			<div class="flex items-center gap-3">
				<label for="style" class="text-[10px] font-bold tracking-normal text-stone-400">
					Style
				</label>
				<select
					id="style"
					value={data.filters.style}
					onchange={(e) => setParam('style', e.currentTarget.value)}
					class="border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-900"
				>
					<option value="">All</option>
					{#each data.options.styles as style}
						<option value={style}>{style}</option>
					{/each}
				</select>
			</div>

			<p class="ml-auto text-xs text-stone-400 shrink-0">
				<span class="font-bold text-accent">{data.count}</span> of {data.options.total}
			</p>

			<!-- View toggle -->
			<div class="flex shrink-0 border border-stone-300 bg-white">
				<button
					onclick={() => setParam('view', '')}
					class="px-3 py-1.5 text-[10px] font-bold tracking-normal transition
						{data.view === 'grid' ? 'bg-stone-900 text-white' : 'text-stone-400 hover:text-stone-900'}"
					aria-label="Grid view"
				>
					Grid
				</button>
				<button
					onclick={() => setParam('view', 'map')}
					class="px-3 py-1.5 text-[10px] font-bold tracking-normal transition
						{data.view === 'map' ? 'bg-stone-900 text-white' : 'text-stone-400 hover:text-stone-900'}"
					aria-label="Map view"
				>
					Map
				</button>
			</div>
		</div>
	</section>

	<!-- Map view — nav ~74px + filter bar ~56px = 130px -->
	{#if data.view === 'map'}
		<div style="position: relative; height: calc(100vh - 130px);">
			{#key data.mapHouses}
				<Map houses={data.mapHouses} />
			{/key}
		</div>
	{/if}

	<!-- Grid -->
	{#if data.view === 'grid'}
	<section class="mx-auto max-w-6xl px-6 py-12 transition-opacity {isFiltering ? 'opacity-40' : ''}" aria-busy={isFiltering}>
		{#if data.options.total === 0}
			<div class="py-24 text-center">
				<p class="text-sm tracking-normal text-stone-400">No homes in the directory yet.</p>
				<a
					href="/submit"
					class="mt-6 inline-block border-2 border-stone-900 px-6 py-3 text-xs font-bold tracking-normal text-stone-900 transition hover:bg-stone-900 hover:text-white"
				>
					Submit a Home
				</a>
			</div>
		{:else if houses.length === 0}
			<div class="py-24 text-center">
				<p class="text-sm tracking-normal text-stone-400">No homes match your search.</p>
				<button
					onclick={clearFilters}
					class="mt-6 inline-block border-2 border-stone-900 px-6 py-3 text-xs font-bold tracking-normal text-stone-900 transition hover:bg-stone-900 hover:text-white"
				>
					Clear Search
				</button>
			</div>
		{:else}
			<!-- Featured first card -->
			<a
				href="/house/{houses[0].slug ?? houses[0].id}"
				class="group mb-px flex flex-col border border-stone-200 bg-white md:flex-row"
			>
				<!-- Left: text -->
				<div class="flex flex-col justify-between p-8 md:w-2/5 md:p-12 transition-colors group-hover:bg-stone-950">
					<div>
						<div class="mb-3 flex items-center gap-3">
							<p class="text-[10px] font-bold tracking-normal text-stone-400 group-hover:text-stone-500">
								{houses[0].style}
							</p>
							{#if houses[0].is_featured}
								<span class="text-[9px] font-bold tracking-widest text-amber-600 uppercase">Featured</span>
							{/if}
						</div>
						<h3 class="mt-3 text-4xl font-black uppercase leading-tight tracking-tight text-stone-900 group-hover:text-white md:text-6xl">
							{houses[0].address_suburb}
						</h3>
						{#if houses[0].address_street}
							<p class="mt-3 text-sm text-stone-500 group-hover:text-stone-400">
								{stripStreetNumber(houses[0].address_street)}
							</p>
						{/if}
					</div>
					<div class="mt-8 flex items-end justify-between">
						<div class="flex flex-col gap-2">
							{#if houses[0].year_built}
								<p class="text-xs text-stone-400 group-hover:text-stone-500">{houses[0].year_built}</p>
							{/if}
							{#if houses[0].condition}
								<span class="inline-block border border-stone-200 px-2 py-0.5 text-[10px] tracking-normal text-stone-500 group-hover:border-stone-700 group-hover:text-stone-400">
									{houses[0].condition}
								</span>
							{/if}
						</div>
						<span class="text-xs font-bold tracking-normal text-stone-400 group-hover:text-white transition-colors">
							View →
						</span>
					</div>
				</div>

				<!-- Right: image -->
				<div class="aspect-[4/3] w-full overflow-hidden bg-stone-100 md:aspect-auto md:w-3/5">
					{#if houses[0].thumbnail}
						<img
							src={houses[0].thumbnail}
							alt="{houses[0].address_suburb} — {stripStreetNumber(houses[0].address_street)}"
							class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
						/>
					{:else if styleFallback(houses[0].style)}
						<img
							src={styleFallback(houses[0].style)!}
							alt="Illustrated {houses[0].style} home"
							class="h-full w-full object-cover opacity-50 transition-transform duration-700 group-hover:scale-105"
						/>
					{:else}
						<div class="flex h-full w-full items-center justify-center">
							<span class="text-[10px] tracking-normal text-stone-300">No image</span>
						</div>
					{/if}
				</div>
			</a>

			<!-- Remaining cards -->
			{#if houses.length > 1}
				<div class="grid grid-cols-1 gap-px bg-stone-200 border border-stone-200 border-t-0 sm:grid-cols-2 lg:grid-cols-3">
					{#each houses.slice(1) as house (house.id)}
						<a
							href="/house/{house.slug ?? house.id}"
							class="group flex flex-col bg-white transition-colors hover:bg-stone-50"
						>
							<!-- Thumbnail -->
							<div class="aspect-[4/3] w-full bg-stone-100 overflow-hidden">
								{#if house.thumbnail}
									<img
										src={house.thumbnail}
								alt="{house.address_suburb} — {stripStreetNumber(house.address_street)}"
									class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
										loading="lazy"
									/>
								{:else if styleFallback(house.style)}
									<img
										src={styleFallback(house.style)!}
										alt="Illustrated {house.style} home"
										class="h-full w-full object-cover opacity-50 transition-transform duration-500 group-hover:scale-105"
										loading="lazy"
									/>
								{:else}
									<div class="flex h-full w-full items-center justify-center">
										<span class="text-[10px] tracking-normal text-stone-300">No image</span>
									</div>
								{/if}
							</div>

							<!-- Card body -->
							<div class="flex flex-1 flex-col p-6">
								<p class="text-[10px] font-bold tracking-normal text-stone-400">
									{house.style}
								</p>
								<h3 class="mt-1 text-xl font-black tracking-tight text-stone-900 group-hover:underline underline-offset-2">
									{house.address_suburb}
								</h3>
								{#if house.year_built}
									<p class="mt-2 text-sm text-stone-500">{house.year_built}</p>
								{/if}
								<div class="mt-auto pt-4 flex items-center justify-between">
									{#if house.condition}
										<span class="border border-stone-200 px-2 py-0.5 text-[10px] tracking-normal text-stone-500">
											{house.condition}
										</span>
									{/if}
									<span class="ml-auto text-xs font-bold tracking-normal text-stone-400 group-hover:text-stone-900 transition-colors">
										View →
									</span>
								</div>
							</div>
						</a>
					{/each}
				</div>

			{#if houses.length < data.count}
				<div class="mt-12 flex flex-col items-center gap-4">
					<p class="text-xs text-stone-400">
						Showing {houses.length} of {data.count}
					</p>
					<button
						onclick={loadMore}
						disabled={loadingMore}
						class="border-2 border-stone-900 px-8 py-3 text-xs font-bold tracking-normal text-stone-900 transition hover:bg-stone-900 hover:text-white disabled:cursor-wait disabled:opacity-50"
					>
						{loadingMore ? 'Loading…' : 'Load More'}
					</button>
					{#if loadMoreError}
						<p class="text-xs text-red-700" role="alert">{loadMoreError}</p>
					{/if}
				</div>
			{/if}
			{/if}
		{/if}
	</section>
	{/if}
</main>
