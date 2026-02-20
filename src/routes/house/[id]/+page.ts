import { supabase } from '$lib/supabase'
import { error } from '@sveltejs/kit'
import type { PageLoad } from './$types'
import type { Image } from '$lib/types'

export const load: PageLoad = async ({ params }) => {
	const { data: house, error: houseErr } = await supabase
		.from('houses')
		.select('*')
		.eq('id', params.id)
		.eq('status', 'published')
		.single()

	if (houseErr || !house) {
		error(404, 'House not found')
	}

	const { data: images, error: imagesError } = await supabase
		.from('images')
		.select('*')
		.eq('house_id', params.id)
		.order('sort_order')

	if (imagesError) {
		console.error('Failed to fetch images for house', params.id, imagesError)
	}

	const imagesWithUrls = ((images ?? []) as Image[]).map((img) => ({
		...img,
		url: supabase.storage.from('house-images').getPublicUrl(img.storage_path).data.publicUrl
	}))

	return { house, images: imagesWithUrls }
}
