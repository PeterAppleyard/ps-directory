import { supabase } from '$lib/supabase'
import { isUUID } from '$lib/utils/slug'
import type { House } from '$lib/types'
import type { PageLoad } from './$types'

/** Know a property — public page; user finds a house (via ?house=slug) then submits a story. */
export const load: PageLoad = async ({ url }) => {
	const houseParam = url.searchParams.get('house')
	if (!houseParam) return { house: null as House | null }

	// Support both slug and legacy UUID
	const { data, error } = await supabase
		.from('houses')
		.select('*')
		.eq(isUUID(houseParam) ? 'id' : 'slug', houseParam)
		.eq('status', 'published')
		.single()

	if (error || !data) return { house: null }
	return { house: data as House }
}
