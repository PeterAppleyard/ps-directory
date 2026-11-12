import { json } from '@sveltejs/kit'
import { supabaseAdmin } from '$lib/supabase-admin'
import { getAdminEmails } from '$lib/server/admins'
import { sendTakedownEmail } from '$lib/server/email'
import type { RequestHandler } from './$types'

const REQUEST_TYPES = ['full_removal', 'image_removal', 'address_removal']
const MIN_FILL_MS = 3000

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/** Takedown requests go through the server so admins are emailed — a request nobody sees is a legal risk. */
export const POST: RequestHandler = async ({ request, url }) => {
	let body: Record<string, unknown>
	try {
		body = await request.json()
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 })
	}

	if (text(body.website, 200) || (typeof body.elapsed_ms === 'number' && body.elapsed_ms < MIN_FILL_MS)) {
		return json({ error: 'Request rejected' }, { status: 400 })
	}

	const requestType = text(body.request_type, 50)
	const house = text(body.house_address, 500)
	const name = text(body.requester_name, 200)
	const email = text(body.requester_email, 254)
	const reason = text(body.reason, 5000) || null

	if (!REQUEST_TYPES.includes(requestType) || !house || !name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		return json({ error: 'Please complete all required fields.' }, { status: 400 })
	}

	const { error } = await supabaseAdmin.from('takedown_requests').insert({
		request_type: requestType,
		house_address: house,
		requester_name: name,
		requester_email: email,
		reason
	})

	if (error) {
		console.error('[takedown] DB error:', error)
		return json({ error: 'Could not send your request. Please email hello@psvitt.com.' }, { status: 500 })
	}

	// Every admin gets these, regardless of notification preferences
	const to = await getAdminEmails()
	await sendTakedownEmail({
		to,
		requestType,
		house,
		requesterName: name,
		requesterEmail: email,
		reason,
		siteUrl: url.origin
	}).catch((e) => console.error('[email] takedown notify failed:', e))

	return json({ ok: true })
}
