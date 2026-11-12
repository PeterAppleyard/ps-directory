import { supabase } from '$lib/supabase'
import type { HouseStyleRecord } from '$lib/types'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
	const { data } = await supabase
		.from('house_styles')
		.select('id, name, sort_order')
		.order('sort_order')

	return {
		styles: (data ?? []) as HouseStyleRecord[],
		meta: {
			title: 'Submit a Home',
			description: 'Know a Pettit & Sevitt home? Add it to the archive — every submission is reviewed before publishing.'
		}
	}
}
