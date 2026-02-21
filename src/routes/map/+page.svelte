<script lang="ts">
	import type { House } from '$lib/types'
	import Map from '$lib/components/Map.svelte'

	let { data }: { data: { houses: (House & { thumbnail: string | null })[] } } = $props()

	const mappable = $derived(data.houses.filter((h) => h.latitude != null && h.longitude != null))
</script>

<!-- Header strip — nav is ~74px, this strip is ~56px = 130px total offset -->
<div class="flex items-center justify-between border-b-2 border-stone-900 bg-white px-6 py-4">
	<div class="flex items-baseline gap-4">
		<h1 class="font-black text-xl tracking-tight text-stone-900">Map</h1>
		<p class="text-[10px] font-bold tracking-normal text-stone-400">
			{mappable.length} home{mappable.length !== 1 ? 's' : ''} plotted
		</p>
	</div>
	<a
		href="/"
		class="text-[10px] font-bold tracking-normal text-stone-400 transition hover:text-stone-900"
	>
		← Directory
	</a>
</div>

<!-- Map — explicit height avoids flex/percentage resolution issues -->
<div style="position: relative; height: calc(100vh - 130px);">
	<Map houses={data.houses} />
</div>
