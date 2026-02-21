import { redirect } from '@sveltejs/kit'
import type { LayoutServerLoad } from './$types'

const PUBLIC_PATHS = ['/admin/login', '/admin/reset-password']

export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (PUBLIC_PATHS.some((p) => url.pathname.startsWith(p))) {
		return { user: null, role: null, theme: 'system' as const }
	}

	if (!locals.user) {
		redirect(303, '/admin/login')
	}

	return {
		user: { email: locals.user.email },
		role: locals.role,
		theme: locals.profile?.theme ?? 'system'
	}
}
