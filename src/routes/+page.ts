import { error } from '@sveltejs/kit'
import { fetchFilterOptions, fetchHousePage, fetchMapHouses, filtersFromUrl } from '$lib/houses'
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ url }) => {
	const filters = filtersFromUrl(url)
	const view = url.searchParams.get('view') === 'map' ? 'map' : 'grid'

	try {
		// Map view needs every matching pin; grid view only needs the first page of cards
		const [options, page, mapHouses] = await Promise.all([
			fetchFilterOptions(),
			view === 'grid' ? fetchHousePage(filters) : null,
			view === 'map' ? fetchMapHouses(filters) : null
		])

		return {
			filters,
			view,
			options,
			houses: page?.houses ?? [],
			count: page?.count ?? mapHouses?.length ?? 0,
			mapHouses: mapHouses ?? []
		}
	} catch (err) {
		console.error('Failed to fetch houses:', err)
		error(500, 'Unable to load the directory right now. Please try again.')
	}
}
