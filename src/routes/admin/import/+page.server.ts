import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(303, '/admin/login')

	// Bulk import requires at least superuser role
	const allowed = locals.role === 'superuser' || locals.role === 'admin' || locals.role === 'super_admin'
	if (!allowed) redirect(303, '/admin')

	return {}
}
