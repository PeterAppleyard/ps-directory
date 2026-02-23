<script lang="ts">
	import type { House } from '$lib/types'
	import Map from '$lib/components/Map.svelte'
	import { stripStreetNumber } from '$lib/utils/compress'

	let { data }: { data: { houses: (House & { thumbnail: string | null })[] } } = $props()

	let selectedSuburb = $state('')
	let selectedStyle = $state('')
	let searchQuery = $state('')
	let view = $state<'grid' | 'map'>('grid')

	const suburbs = $derived(
		[...new Set(data.houses.map((h: House) => h.address_suburb))].sort()
	)

	const styles = $derived(
		[...new Set(data.houses.map((h: House) => h.style))].sort()
	)

	function styleFallback(style: string): string | null {
		const map: Record<string, string> = {
			'Lowline': '/images/fallback-lowline.jpg',
			'Split-level': '/images/fallback-split-level.jpg',
		}
		return map[style] ?? null
	}

	const filtered = $derived.by(() => {
		const q = searchQuery.trim().toLowerCase()
		return data.houses.filter((h: House) => {
			const matchSuburb = !selectedSuburb || h.address_suburb === selectedSuburb
			const matchStyle = !selectedStyle || h.style === selectedStyle
			const matchSearch = !q || [
				h.address_suburb,
				h.address_street,
				h.style,
				h.description ?? '',
				h.builder_name ?? ''
			].some((field) => field.toLowerCase().includes(q))
			return matchSuburb && matchStyle && matchSearch
		})
	})
</script>

<main class="min-h-screen bg-stone-50">
	<!-- Hero — hidden in map mode -->
	<section class="border-b border-stone-200 bg-white {view === 'map' ? 'hidden' : ''}">
		<div class="mx-auto max-w-6xl px-6 py-20">
			<p class="mb-3 text-xs font-bold tracking-normal text-stone-400">A Living Archive</p>
			<h2 class="font-black text-6xl tracking-tight text-stone-900 md:text-9xl uppercase">
				The Directory
			</h2>
			<p class="mt-5 max-w-xl text-base text-stone-500 leading-relaxed">
				Documenting Pettit &amp; Sevitt homes across Sydney — one suburb at a time.
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
					bind:value={selectedSuburb}
					class="border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-900"
				>
					<option value="">All</option>
					{#each suburbs as suburb}
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
					bind:value={selectedStyle}
					class="border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-900"
				>
					<option value="">All</option>
					{#each styles as style}
						<option value={style}>{style}</option>
					{/each}
				</select>
			</div>

			<p class="ml-auto text-xs text-stone-400 shrink-0">
				<span class="font-bold text-accent">{filtered.length}</span> of {data.houses.length}
			</p>

			<!-- View toggle -->
			<div class="flex shrink-0 border border-stone-300 bg-white">
				<button
					onclick={() => (view = 'grid')}
					class="px-3 py-1.5 text-[10px] font-bold tracking-normal transition
						{view === 'grid' ? 'bg-stone-900 text-white' : 'text-stone-400 hover:text-stone-900'}"
					aria-label="Grid view"
				>
					Grid
				</button>
				<button
					onclick={() => (view = 'map')}
					class="px-3 py-1.5 text-[10px] font-bold tracking-normal transition
						{view === 'map' ? 'bg-stone-900 text-white' : 'text-stone-400 hover:text-stone-900'}"
					aria-label="Map view"
				>
					Map
				</button>
			</div>
		</div>
	</section>

	<!-- Map view — nav ~74px + filter bar ~56px = 130px -->
	{#if view === 'map'}
		<div style="position: relative; height: calc(100vh - 130px);">
			<Map houses={filtered} />
		</div>
	{/if}

	<!-- Grid -->
	{#if view === 'grid'}
	<section class="mx-auto max-w-6xl px-6 py-12">
		{#if data.houses.length === 0}
			<div class="py-24 text-center">
				<p class="text-sm tracking-normal text-stone-400">No homes in the directory yet.</p>
				<a
					href="/submit"
					class="mt-6 inline-block border-2 border-stone-900 px-6 py-3 text-xs font-bold tracking-normal text-stone-900 transition hover:bg-stone-900 hover:text-white"
				>
					Submit a Home
				</a>
			</div>
		{:else if filtered.length === 0}
			<div class="py-24 text-center">
				<p class="text-sm tracking-normal text-stone-400">No homes match your search.</p>
				<button
					onclick={() => { selectedSuburb = ''; selectedStyle = ''; searchQuery = '' }}
					class="mt-6 inline-block border-2 border-stone-900 px-6 py-3 text-xs font-bold tracking-normal text-stone-900 transition hover:bg-stone-900 hover:text-white"
				>
					Clear Search
				</button>
			</div>
		{:else}
			<!-- Featured first card -->
			<a
				href="/house/{filtered[0].id}"
				class="group mb-px flex flex-col border border-stone-200 bg-white md:flex-row"
			>
				<!-- Left: text -->
				<div class="flex flex-col justify-between p-8 md:w-2/5 md:p-12 transition-colors group-hover:bg-stone-950">
					<div>
						<div class="mb-3 flex items-center gap-3">
							<p class="text-[10px] font-bold tracking-normal text-stone-400 group-hover:text-stone-500">
								{filtered[0].style}
							</p>
							{#if filtered[0].is_featured}
								<span class="text-[9px] font-bold tracking-widest text-amber-600 uppercase">Featured</span>
							{/if}
						</div>
						<h3 class="mt-3 text-4xl font-black uppercase leading-tight tracking-tight text-stone-900 group-hover:text-white md:text-6xl">
							{filtered[0].address_suburb}
						</h3>
						{#if filtered[0].address_street}
							<p class="mt-3 text-sm text-stone-500 group-hover:text-stone-400">
								{stripStreetNumber(filtered[0].address_street)}
							</p>
						{/if}
					</div>
					<div class="mt-8 flex items-end justify-between">
						<div class="flex flex-col gap-2">
							{#if filtered[0].year_built}
								<p class="text-xs text-stone-400 group-hover:text-stone-500">{filtered[0].year_built}</p>
							{/if}
							{#if filtered[0].condition}
								<span class="inline-block border border-stone-200 px-2 py-0.5 text-[10px] tracking-normal text-stone-500 group-hover:border-stone-700 group-hover:text-stone-400">
									{filtered[0].condition}
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
					{#if filtered[0].thumbnail}
						<img
							src={filtered[0].thumbnail}
							alt="{filtered[0].address_suburb} — {stripStreetNumber(filtered[0].address_street)}"
							class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
						/>
					{:else if styleFallback(filtered[0].style)}
						<img
							src={styleFallback(filtered[0].style)!}
							alt="Illustrated {filtered[0].style} home"
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
			{#if filtered.length > 1}
				<div class="grid grid-cols-1 gap-px bg-stone-200 border border-stone-200 border-t-0 sm:grid-cols-2 lg:grid-cols-3">
					{#each filtered.slice(1) as house (house.id)}
						<a
							href="/house/{house.id}"
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
			{/if}
		{/if}
	</section>
	{/if}
</main>
