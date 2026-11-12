import { supabase } from '$lib/supabase'
import { PUBLIC_HOUSE_COLUMNS, publicImageUrl } from '$lib/houses'
import { error, redirect } from '@sveltejs/kit'
import { isUUID } from '$lib/utils/slug'
import { stripStreetNumber } from '$lib/utils/compress'
import type { PageServerLoad } from './$types'
import type { Image, PropertyStory, PublicHouse } from '$lib/types'

export const load: PageServerLoad = async ({ params }) => {
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
		.select(PUBLIC_HOUSE_COLUMNS)
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
		url: publicImageUrl(img.storage_path)
	}))

	const { data: stories } = await supabase
		.from('property_stories')
		.select('*')
		.eq('house_id', house.id)
		.eq('status', 'approved')
		.order('created_at', { ascending: true })

	const h = house as PublicHouse
	const primary = imagesWithUrls.find((img) => img.is_primary) ?? imagesWithUrls[0]

	return {
		house: h,
		images: imagesWithUrls,
		stories: (stories ?? []) as PropertyStory[],
		meta: {
			title: [stripStreetNumber(h.address_street), h.address_suburb].filter(Boolean).join(', '),
			description: describeHouse(h),
			image: primary?.url
		}
	}
}

/** One-sentence summary for search results and link previews (no street number, matching the cards). */
function describeHouse(h: PublicHouse): string {
	const kind = h.style && h.style !== 'Other' ? `${h.style} ` : ''
	const built = h.year_built ? `, built ${h.year_built}` : ''
	const summary = `A ${kind}Pettit & Sevitt home in ${h.address_suburb}${built}.`
	if (!h.description) return summary
	const extra = h.description.replace(/\s+/g, ' ').trim()
	const full = `${summary} ${extra}`
	return full.length > 160 ? full.slice(0, 157).replace(/\s+\S*$/, '') + '…' : full
}
