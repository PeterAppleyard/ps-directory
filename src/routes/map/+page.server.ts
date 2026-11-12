import { error } from '@sveltejs/kit'
import { fetchMapHouses } from '$lib/houses'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
	try {
		return {
			houses: await fetchMapHouses({ q: '', suburb: '', style: '' }),
			meta: { title: 'Map', description: 'Every documented Pettit & Sevitt home on one map.' }
		}
	} catch (err) {
		console.error('Failed to fetch houses for map:', err)
		error(500, 'Unable to load the map right now. Please try again.')
	}
}
