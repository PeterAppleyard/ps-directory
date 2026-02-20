import { redirect } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ url, locals }) => {
	const code = url.searchParams.get('code')
	const next = url.searchParams.get('next') ?? '/admin'

	if (code) {
		const { error } = await locals.supabase.auth.exchangeCodeForSession(code)
		if (error) {
			console.error('[auth/callback] exchange error:', error)
			redirect(303, `/admin/login?error=link_expired`)
		}
	}

	redirect(303, next)
}
