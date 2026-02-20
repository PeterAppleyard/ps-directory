import { supabase } from '$lib/supabase'
import { error } from '@sveltejs/kit'
import type { House } from '$lib/types'
import type { PageLoad } from './$types'

export const load: PageLoad = async () => {
	const [{ data: houses, error: housesError }, { data: primaryImages }] = await Promise.all([
		supabase.from('houses').select('*').eq('status', 'published').order('address_suburb'),
		supabase.from('images').select('house_id, storage_path').eq('is_primary', true)
	])

	if (housesError) {
		console.error('Failed to fetch houses for map:', housesError)
		error(500, 'Unable to load the map right now. Please try again.')
	}

	const primaryByHouse: Record<string, string> = {}
	;(primaryImages ?? []).forEach((img) => {
		primaryByHouse[img.house_id] = img.storage_path
	})

	const housesWithThumbs = ((houses ?? []) as House[]).map((h) => ({
		...h,
		thumbnail: primaryByHouse[h.id]
			? supabase.storage.from('house-images').getPublicUrl(primaryByHouse[h.id]).data.publicUrl
			: null
	}))

	return { houses: housesWithThumbs }
}
