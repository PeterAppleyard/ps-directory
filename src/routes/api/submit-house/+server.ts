import { json } from '@sveltejs/kit'
import { supabaseAdmin } from '$lib/supabase-admin'
import { sendNewSubmissionEmail } from '$lib/server/email'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ request, url }) => {
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
		submitter_email
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
			sold_listing_url: typeof sold_listing_url === 'string' ? sold_listing_url || null : null,
			submitter_email: typeof submitter_email === 'string' ? submitter_email.trim() || null : null
		})
		.select('id')
		.single()

	if (houseErr || !house) {
		console.error('[submit-house] DB error:', houseErr)
		return json({ error: houseErr?.message ?? 'Insert failed' }, { status: 500 })
	}

	// Notify admins/super_admins who have submission emails enabled
	const { data: recipients } = await supabaseAdmin
		.from('profiles')
		.select('id, email_on_new_submission')
		.in('role', ['admin', 'super_admin'])
		.eq('email_on_new_submission', true)

	if (recipients && recipients.length > 0) {
		const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
		const emailMap: Record<string, string> = {}
		for (const u of authUsers?.users ?? []) {
			if (u.email) emailMap[u.id] = u.email
		}

		const toEmails = recipients
			.map((r) => emailMap[r.id])
			.filter(Boolean) as string[]

		if (toEmails.length > 0) {
			await sendNewSubmissionEmail({
				to: toEmails,
				address: address_street as string,
				suburb: address_suburb as string,
				houseId: house.id,
				siteUrl: url.origin
			}).catch((e) => console.error('[email] new submission notify failed:', e))
		}
	}

	return json({ id: house.id })
}
