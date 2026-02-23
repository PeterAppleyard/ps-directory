import { supabase } from '$lib/supabase'
import type { House } from '$lib/types'
import type { PageLoad } from './$types'

/** Know a property — public page; user finds a house (via ?house=id or paste URL) then submits a story. */
export const load: PageLoad = async ({ url }) => {
	const houseId = url.searchParams.get('house')
	if (!houseId) return { house: null as House | null }

	const { data, error } = await supabase
		.from('houses')
		.select('*')
		.eq('id', houseId)
		.eq('status', 'published')
		.single()

	if (error || !data) return { house: null }
	return { house: data as House }
}
