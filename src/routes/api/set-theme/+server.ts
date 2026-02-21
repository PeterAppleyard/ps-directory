import { json } from '@sveltejs/kit'
import { supabaseAdmin } from '$lib/supabase-admin'
import type { RequestHandler } from '@sveltejs/kit'

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 403 })

	let body: { theme?: string }
	try {
		body = await request.json()
	} catch {
		return json({ error: 'Invalid body' }, { status: 400 })
	}

	const theme = body.theme
	if (!['light', 'dark', 'system'].includes(theme ?? '')) {
		return json({ error: 'Invalid theme' }, { status: 400 })
	}

	await supabaseAdmin.from('profiles').update({ theme }).eq('id', locals.user.id)

	return json({ ok: true })
}
