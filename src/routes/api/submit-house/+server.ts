import { json } from '@sveltejs/kit'
import { supabaseAdmin } from '$lib/supabase-admin'
import { sendNewSubmissionEmail } from '$lib/server/email'
import { getAdminEmails } from '$lib/server/admins'
import { generateUniqueSlug } from '$lib/server/slug'
import { normaliseState, tidySuburb } from '$lib/utils/text'
import type { RequestHandler } from './$types'

/** Faster than any person can fill the form — almost certainly a bot */
const MIN_FILL_MS = 3000
/** Circuit breaker: stop accepting once this many submissions arrive within an hour */
const MAX_PENDING_PER_HOUR = 20
const MAX_TEXT = 2000

const optionalText = (v: unknown, max = 200) =>
	typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null
const optionalUrl = (v: unknown) => {
	const s = optionalText(v, 500)
	return s && /^https?:\/\//i.test(s) ? s : null
}
const optionalNumber = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

export const POST: RequestHandler = async ({ request, url, locals }) => {
	// Admin Quick Add and bulk import also post here, logged in
	const isAdmin = locals.role !== null

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
		sold_listing_url,
		submitter_email,
		website,
		elapsed_ms
	} = body as Record<string, unknown>

	// Honeypot filled or form submitted implausibly fast — reject without detail
	if ((typeof website === 'string' && website.trim()) || (typeof elapsed_ms === 'number' && elapsed_ms < MIN_FILL_MS)) {
		return json({ error: 'Submission rejected' }, { status: 400 })
	}

	const street = optionalText(address_street)
	const suburb = optionalText(address_suburb, 100)
	const state = normaliseState(optionalText(address_state, 50) ?? '')
	const postcode = optionalText(address_postcode, 4)
	if (!street || !suburb || !state || !postcode || !/^\d{4}$/.test(postcode)) {
		return json({ error: 'Missing required fields' }, { status: 400 })
	}

	const year = optionalNumber(year_built)
	const email = optionalText(submitter_email, 254)

	const { count: recent } = isAdmin ? { count: 0 } : await supabaseAdmin
		.from('houses')
		.select('id', { count: 'exact', head: true })
		.eq('status', 'pending')
		.gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
	if ((recent ?? 0) >= MAX_PENDING_PER_HOUR) {
		return json({ error: 'Too many submissions — try again later' }, { status: 429 })
	}

	const slug = await generateUniqueSlug(tidySuburb(suburb), street)

	const { data: house, error: houseErr } = await supabaseAdmin
		.from('houses')
		.insert({
			address_street: street,
			address_suburb: tidySuburb(suburb),
			address_state: state,
			address_postcode: postcode,
			slug,
			style: optionalText(style, 50),
			year_built: year && year >= 1900 && year <= 2000 ? Math.round(year) : null,
			builder_name: optionalText(builder_name),
			condition: optionalText(condition, 50),
			description: optionalText(description, MAX_TEXT),
			status: 'pending',
			latitude: optionalNumber(latitude),
			longitude: optionalNumber(longitude),
			listing_url: optionalUrl(listing_url),
			sold_listing_url: optionalUrl(sold_listing_url),
			submitter_email: email && email.includes('@') ? email : null
		})
		.select('id, slug')
		.single()

	if (houseErr || !house) {
		console.error('[submit-house] DB error:', houseErr)
		return json({ error: 'Could not save the submission' }, { status: 500 })
	}

	// Notify admins/super_admins who have submission emails enabled and frequency is not 'none'
	const toEmails = await getAdminEmails({ submissionAlertsOnly: true })
	if (toEmails.length > 0) {
		await sendNewSubmissionEmail({
			to: toEmails,
			address: street,
			suburb: tidySuburb(suburb),
			houseId: house.id,
			siteUrl: url.origin
		}).catch((e) => console.error('[email] new submission notify failed:', e))
	}

	return json({ id: house.id, slug: house.slug })
}
