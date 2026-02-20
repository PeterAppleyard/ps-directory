<script lang="ts">
	import { onMount, onDestroy } from 'svelte'
	import { PUBLIC_MAPBOX_TOKEN } from '$env/static/public'
	import type { House } from '$lib/types'
	import 'mapbox-gl/dist/mapbox-gl.css'

	type HouseWithThumb = House & { thumbnail: string | null }

	let { houses }: { houses: HouseWithThumb[] } = $props()

	let mapContainer: HTMLDivElement
	let map: mapboxgl.Map | null = null

	const mappable = $derived(houses.filter((h) => h.latitude != null && h.longitude != null))
	const unmappedCount = $derived(houses.length - mappable.length)

	onMount(async () => {
		const mapboxgl = (await import('mapbox-gl')).default
		mapboxgl.accessToken = PUBLIC_MAPBOX_TOKEN

		map = new mapboxgl.Map({
			container: mapContainer,
			style: 'mapbox://styles/mapbox/light-v11',
			center: [151.05, -33.83],
			zoom: 9,
			attributionControl: false
		})

		map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-left')
		map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')

		map.on('load', () => {
			if (!map) return

			map.addSource('houses', {
				type: 'geojson',
				cluster: true,
				clusterMaxZoom: 14,
				clusterRadius: 40,
				data: {
					type: 'FeatureCollection',
					features: mappable.map((h) => ({
						type: 'Feature' as const,
						geometry: {
							type: 'Point' as const,
							coordinates: [h.longitude!, h.latitude!]
						},
						properties: {
							id: h.id,
							suburb: h.address_suburb,
							style: h.style,
							year: h.year_built,
							thumbnail: h.thumbnail,
							condition: h.condition
						}
					}))
				}
			})

			// Cluster circles
			map.addLayer({
				id: 'clusters',
				type: 'circle',
				source: 'houses',
				filter: ['has', 'point_count'],
				paint: {
					'circle-color': '#1c1917',
					'circle-radius': ['step', ['get', 'point_count'], 18, 10, 24, 30, 30]
				}
			})

			// Cluster count labels
			map.addLayer({
				id: 'cluster-count',
				type: 'symbol',
				source: 'houses',
				filter: ['has', 'point_count'],
				layout: {
					'text-field': ['get', 'point_count_abbreviated'],
					'text-font': ['DIN Offc Pro Bold', 'Arial Unicode MS Bold'],
					'text-size': 12
				},
				paint: { 'text-color': '#ffffff' }
			})

			// Individual point markers
			map.addLayer({
				id: 'unclustered-point',
				type: 'circle',
				source: 'houses',
				filter: ['!', ['has', 'point_count']],
				paint: {
					'circle-color': '#1c1917',
					'circle-radius': 7,
					'circle-stroke-width': 2,
					'circle-stroke-color': '#ffffff'
				}
			})

			// Click cluster → zoom in
			map.on('click', 'clusters', (e) => {
				if (!map) return
				const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] })
				if (!features.length) return
				const clusterId = features[0].properties?.cluster_id
				const source = map.getSource('houses') as mapboxgl.GeoJSONSource
				source.getClusterExpansionZoom(clusterId, (err, zoom) => {
					if (err || !map) return
					const coords = (features[0].geometry as GeoJSON.Point).coordinates as [number, number]
					map.easeTo({ center: coords, zoom: zoom ?? 12 })
				})
			})

			// Click individual point → popup
			map.on('click', 'unclustered-point', (e) => {
				if (!map || !e.features?.length) return
				const coords = (e.features[0].geometry as GeoJSON.Point).coordinates as [number, number]
				const p = e.features[0].properties ?? {}

				const img = p.thumbnail
					? `<img src="${p.thumbnail}" alt="${p.suburb}" style="width:100%;aspect-ratio:4/3;object-fit:cover;display:block;margin-bottom:12px;" />`
					: ''
				const year = p.year
					? `<p style="font-size:11px;color:#78716c;margin:4px 0 0;">${p.year}</p>`
					: ''

				new mapboxgl.Popup({ maxWidth: '200px', closeButton: false, offset: 14 })
					.setLngLat(coords)
					.setHTML(
						`<a href="/house/${p.id}" style="display:block;text-decoration:none;color:inherit;">
							${img}
							<p style="font-size:9px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#a8a29e;margin:0;">${p.style ?? ''}</p>
							<p style="font-size:15px;font-weight:900;text-transform:uppercase;letter-spacing:-0.01em;color:#1c1917;margin:3px 0 0;">${p.suburb}</p>
							${year}
							<p style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:#1c1917;margin:12px 0 0;">View →</p>
						</a>`
					)
					.addTo(map)
			})

			// Cursor states
			map.on('mouseenter', 'clusters', () => {
				if (map) map.getCanvas().style.cursor = 'pointer'
			})
			map.on('mouseleave', 'clusters', () => {
				if (map) map.getCanvas().style.cursor = ''
			})
			map.on('mouseenter', 'unclustered-point', () => {
				if (map) map.getCanvas().style.cursor = 'pointer'
			})
			map.on('mouseleave', 'unclustered-point', () => {
				if (map) map.getCanvas().style.cursor = ''
			})
		})
	})

	onDestroy(() => {
		map?.remove()
	})
</script>

<div style="position: relative; width: 100%; height: 100%;">
	<div bind:this={mapContainer} style="position: absolute; top: 0; right: 0; bottom: 0; left: 0;"></div>

	{#if unmappedCount > 0}
		<div
			class="pointer-events-none absolute bottom-10 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap border border-stone-200 bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-400"
		>
			{unmappedCount} home{unmappedCount !== 1 ? 's' : ''} without coordinates
		</div>
	{/if}
</div>

<style>
	:global(.mapboxgl-popup-content) {
		padding: 14px !important;
		border-radius: 0 !important;
		border: 2px solid #1c1917 !important;
		box-shadow: 3px 3px 0 #1c1917 !important;
		font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif !important;
	}

	:global(.mapboxgl-popup-tip) {
		display: none !important;
	}

	:global(.mapboxgl-ctrl-group) {
		border-radius: 0 !important;
		border: 1px solid #e7e5e4 !important;
		box-shadow: none !important;
	}

	:global(.mapboxgl-ctrl-group button) {
		border-radius: 0 !important;
	}

	:global(.mapboxgl-ctrl-attrib) {
		font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif !important;
		font-size: 10px !important;
	}
</style>
