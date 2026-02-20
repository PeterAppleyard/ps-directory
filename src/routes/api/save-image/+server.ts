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

	const { house_id, storage_path, is_primary, sort_order, caption } = body as Record<
		string,
		unknown
	>

	if (!house_id || !storage_path) {
		return json({ error: 'Missing required fields' }, { status: 400 })
	}

	const { error } = await supabaseAdmin.from('images').insert({
		house_id,
		storage_path,
		is_primary: is_primary ?? false,
		sort_order: sort_order ?? 0,
		caption: caption ?? null
	})

	if (error) {
		console.error('[save-image] DB error:', error)
		return json({ error: error.message }, { status: 500 })
	}

	return json({ ok: true })
}
