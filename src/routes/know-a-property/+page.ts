import { supabase } from '$lib/supabase'
import { isUUID } from '$lib/utils/slug'
import { PUBLIC_HOUSE_COLUMNS } from '$lib/houses'
import type { PublicHouse } from '$lib/types'
import type { PageLoad } from './$types'

/** Know a property — public page; user finds a house (via ?house=slug) then submits a story. */
const meta = { title: 'Know a Property?', description: 'Lived in or grew up in a Pettit & Sevitt home? Share your memories of it with the archive.' }

export const load: PageLoad = async ({ url }) => {
	const houseParam = url.searchParams.get('house')
	if (!houseParam) return { house: null as PublicHouse | null, meta }

	// Support both slug and legacy UUID
	const { data, error } = await supabase
		.from('houses')
		.select(PUBLIC_HOUSE_COLUMNS)
		.eq(isUUID(houseParam) ? 'id' : 'slug', houseParam)
		.eq('status', 'published')
		.single()

	if (error || !data) return { house: null, meta }
	return { house: data as unknown as PublicHouse, meta }
}
