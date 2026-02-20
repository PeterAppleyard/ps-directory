import { json } from '@sveltejs/kit'
import { supabaseAdmin } from '$lib/supabase-admin'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ request }) => {
	let body: unknown
	try {
		body = await request.json()
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 })
	}

	const {
		address_street,
		address_suburb,
		address_state,
		address_postcode,
		style,
		year_built,
		builder_name,
		condition,
		description,
		latitude,
		longitude,
		listing_url,
		sold_listing_url
	} = body as Record<string, unknown>

	if (!address_street || !address_suburb || !address_state || !address_postcode) {
		return json({ error: 'Missing required fields' }, { status: 400 })
	}

	const { data: house, error: houseErr } = await supabaseAdmin
		.from('houses')
		.insert({
			address_street,
			address_suburb,
			address_state,
			address_postcode,
			style: style || null,
			year_built: year_built || null,
			builder_name: builder_name || null,
			condition: condition || null,
			description: description || null,
			status: 'pending',
			latitude: typeof latitude === 'number' ? latitude : null,
			longitude: typeof longitude === 'number' ? longitude : null,
			listing_url: typeof listing_url === 'string' ? listing_url || null : null,
			sold_listing_url: typeof sold_listing_url === 'string' ? sold_listing_url || null : null
		})
		.select('id')
		.single()

	if (houseErr || !house) {
		console.error('[submit-house] DB error:', houseErr)
		return json({ error: houseErr?.message ?? 'Insert failed' }, { status: 500 })
	}

	return json({ id: house.id })
}
