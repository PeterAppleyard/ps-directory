<script lang="ts">
	import type { House } from '$lib/types'
	import Map from '$lib/components/Map.svelte'

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
	<section class="border-b border-stone-200 bg-white px-6 py-20 text-center {view === 'map' ? 'hidden' : ''}">
		<p class="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-stone-400">A Living Archive</p>
		<h2 class="font-black text-6xl uppercase tracking-tight text-stone-900 md:text-9xl">
			The Directory
		</h2>
		<p class="mx-auto mt-5 max-w-xl text-base text-stone-500 leading-relaxed">
			Documenting Pettit &amp; Sevitt homes across Sydney — one suburb at a time.
		</p>
	</section>

	<!-- Filters -->
	<section class="sticky top-0 z-10 border-b border-stone-200 bg-stone-100 px-6 py-4">
		<div class="mx-auto flex max-w-6xl flex-wrap items-center gap-4">

			<!-- Search -->
			<div class="flex items-center gap-3 flex-1 min-w-[180px]">
				<label for="search" class="text-[10px] font-bold uppercase tracking-[0.25em] text-stone-400 shrink-0">
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
				<label for="suburb" class="text-[10px] font-bold uppercase tracking-[0.25em] text-stone-400">
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
				<label for="style" class="text-[10px] font-bold uppercase tracking-[0.25em] text-stone-400">
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
					class="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition
						{view === 'grid' ? 'bg-stone-900 text-white' : 'text-stone-400 hover:text-stone-900'}"
					aria-label="Grid view"
				>
					Grid
				</button>
				<button
					onclick={() => (view = 'map')}
					class="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition
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
				<p class="text-sm uppercase tracking-widest text-stone-400">No homes in the directory yet.</p>
				<a
					href="/submit"
					class="mt-6 inline-block border-2 border-stone-900 px-6 py-3 text-xs font-bold uppercase tracking-widest text-stone-900 transition hover:bg-stone-900 hover:text-white"
				>
					Submit a Home
				</a>
			</div>
		{:else if filtered.length === 0}
			<div class="py-24 text-center">
				<p class="text-sm uppercase tracking-widest text-stone-400">No homes match your search.</p>
				<button
					onclick={() => { selectedSuburb = ''; selectedStyle = ''; searchQuery = '' }}
					class="mt-6 inline-block border-2 border-stone-900 px-6 py-3 text-xs font-bold uppercase tracking-widest text-stone-900 transition hover:bg-stone-900 hover:text-white"
				>
					Clear Search
				</button>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-px bg-stone-200 border border-stone-200 sm:grid-cols-2 lg:grid-cols-3">
				{#each filtered as house (house.id)}
					<a
						href="/house/{house.id}"
						class="group flex flex-col bg-white transition-colors hover:bg-stone-50"
					>
						<!-- Thumbnail -->
						<div class="aspect-[4/3] w-full bg-stone-100 overflow-hidden">
							{#if house.thumbnail}
								<img
									src={house.thumbnail}
									alt="{house.address_suburb} — {house.address_street}"
									class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
									loading="lazy"
								/>
							{:else}
								<div class="flex h-full w-full items-center justify-center">
									<span class="text-[10px] uppercase tracking-widest text-stone-300">No image</span>
								</div>
							{/if}
						</div>

						<!-- Card body -->
						<div class="flex flex-1 flex-col p-6">
							<p class="text-[10px] font-bold uppercase tracking-[0.25em] text-stone-400">
								{house.style}
							</p>
							<h3 class="mt-1 text-xl font-black uppercase tracking-tight text-stone-900 group-hover:underline underline-offset-2">
								{house.address_suburb}
							</h3>
							{#if house.year_built}
								<p class="mt-2 text-sm text-stone-500">{house.year_built}</p>
							{/if}
							<div class="mt-auto pt-4 flex items-center justify-between">
								{#if house.condition}
									<span class="border border-stone-200 px-2 py-0.5 text-[10px] uppercase tracking-wider text-stone-500">
										{house.condition}
									</span>
								{/if}
								<span class="ml-auto text-xs font-bold uppercase tracking-widest text-stone-400 group-hover:text-stone-900 transition-colors">
									View →
								</span>
							</div>
						</div>
					</a>
				{/each}
			</div>
		{/if}
	</section>
	{/if}
</main>
