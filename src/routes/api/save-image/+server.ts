import { json } from '@sveltejs/kit'
import { supabaseAdmin } from '$lib/supabase-admin'
import type { RequestHandler } from './$types'

const MAX_IMAGES_PER_HOUSE = 5
/** Images can only be attached while a submission is fresh — stops anyone re-targeting old houses. */
const SUBMISSION_WINDOW_MS = 60 * 60 * 1000

export const POST: RequestHandler = async ({ request, locals }) => {
	let body: unknown
	try {
		body = await request.json()
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 })
	}

	const { house_id, storage_path, is_primary, sort_order } = body as Record<string, unknown>

	if (typeof house_id !== 'string' || typeof storage_path !== 'string') {
		return json({ error: 'Missing required fields' }, { status: 400 })
	}

	// The submit form uploads to `<house_id>/<uuid>.webp`; reject anything pointing elsewhere
	if (!new RegExp(`^${house_id}/[0-9a-f-]{36}\\.webp$`, 'i').test(storage_path)) {
		return json({ error: 'Invalid storage path' }, { status: 400 })
	}

	const isAdmin = locals.role !== null

	// For the public, this endpoint is unauthenticated (it runs with the service role), so only
	// allow attaching images to a house that is still pending and was submitted moments ago
	const [{ data: house }, { count }] = await Promise.all([
		supabaseAdmin.from('houses').select('status, created_at').eq('id', house_id).maybeSingle(),
		supabaseAdmin.from('images').select('id', { count: 'exact', head: true }).eq('house_id', house_id)
	])

	if (!house) {
		return json({ error: 'House not found' }, { status: 404 })
	}
	const isFresh = Date.now() - new Date(house.created_at).getTime() < SUBMISSION_WINDOW_MS
	if (!isAdmin && (house.status !== 'pending' || !isFresh)) {
		return json({ error: 'Images can only be added to a new submission' }, { status: 403 })
	}
	if (!isAdmin && (count ?? 0) >= MAX_IMAGES_PER_HOUSE) {
		return json({ error: `A submission can have at most ${MAX_IMAGES_PER_HOUSE} images` }, { status: 400 })
	}

	const { data: image, error } = await supabaseAdmin.from('images').insert({
		house_id,
		storage_path,
		is_primary: is_primary === true,
		sort_order: Number.isInteger(sort_order) ? sort_order : 0,
		caption: null
	}).select('id').single()

	if (error || !image) {
		console.error('[save-image] DB error:', error)
		return json({ error: 'Could not save image' }, { status: 500 })
	}

	return json({ ok: true, id: image.id })
}
