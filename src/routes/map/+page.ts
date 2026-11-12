import { error } from '@sveltejs/kit'
import { fetchMapHouses } from '$lib/houses'
import type { PageLoad } from './$types'

export const load: PageLoad = async () => {
	try {
		return { houses: await fetchMapHouses({ q: '', suburb: '', style: '' }) }
	} catch (err) {
		console.error('Failed to fetch houses for map:', err)
		error(500, 'Unable to load the map right now. Please try again.')
	}
}
