import { redirect } from '@sveltejs/kit'
import type { LayoutServerLoad } from './$types'

// These paths don't require authentication
const PUBLIC_PATHS = ['/admin/login', '/admin/reset-password']

export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (PUBLIC_PATHS.some((p) => url.pathname.startsWith(p))) {
		return { user: locals.user, role: locals.role }
	}

	if (!locals.user) {
		redirect(303, '/admin/login')
	}

	return { user: locals.user, role: locals.role }
}
