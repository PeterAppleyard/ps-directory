import { supabase } from '$lib/supabase'
import type { HouseStyleRecord } from '$lib/types'
import type { PageLoad } from './$types'

export const load: PageLoad = async () => {
	const { data } = await supabase
		.from('house_styles')
		.select('id, name, sort_order')
		.order('sort_order')

	return {
		styles: (data ?? []) as HouseStyleRecord[]
	}
}
