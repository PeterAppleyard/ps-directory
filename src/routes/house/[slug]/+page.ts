import { supabase } from '$lib/supabase'
import { error, redirect } from '@sveltejs/kit'
import { isUUID } from '$lib/utils/slug'
import type { PageLoad } from './$types'
import type { Image, PropertyStory } from '$lib/types'

export const load: PageLoad = async ({ params }) => {
	const param = params.slug

	// Backward compatibility: if param is a UUID, look up the house and redirect to its slug URL
	if (isUUID(param)) {
		const { data: house } = await supabase
			.from('houses')
			.select('slug')
			.eq('id', param)
			.eq('status', 'published')
			.single()

		if (house?.slug) {
			redirect(301, `/house/${house.slug}`)
		}
		// No slug yet (pre-migration house) — fall through and load by ID below
	}

	// Try slug first, then fall back to ID for houses not yet backfilled
	const isId = isUUID(param)
	const { data: house, error: houseErr } = await supabase
		.from('houses')
		.select('*')
		.eq(isId ? 'id' : 'slug', param)
		.eq('status', 'published')
		.single()

	if (houseErr || !house) {
		error(404, 'House not found')
	}

	const { data: images, error: imagesError } = await supabase
		.from('images')
		.select('*')
		.eq('house_id', house.id)
		.order('sort_order')

	if (imagesError) {
		console.error('Failed to fetch images for house', house.id, imagesError)
	}

	const imagesWithUrls = ((images ?? []) as Image[]).map((img) => ({
		...img,
		url: supabase.storage.from('house-images').getPublicUrl(img.storage_path).data.publicUrl
	}))

	const { data: stories } = await supabase
		.from('property_stories')
		.select('*')
		.eq('house_id', house.id)
		.eq('status', 'approved')
		.order('created_at', { ascending: true })

	return { house, images: imagesWithUrls, stories: (stories ?? []) as PropertyStory[] }
}
