import { redirect } from '@sveltejs/kit'
import { PRIVATE_ADMIN_PASSWORD } from '$env/static/private'
import type { PageServerLoad } from './$types'

const COOKIE = 'ps_admin'

export const load: PageServerLoad = async ({ cookies }) => {
	if (cookies.get(COOKIE) !== PRIVATE_ADMIN_PASSWORD) {
		redirect(303, '/admin')
	}
	return {}
}
