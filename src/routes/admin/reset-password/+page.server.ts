import { fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(303, '/admin/login')
	return {}
}

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await request.formData()
		const password = form.get('password') as string
		const confirm = form.get('confirm') as string

		if (!password || password.length < 8) {
			return fail(400, { error: 'Password must be at least 8 characters.' })
		}

		if (password !== confirm) {
			return fail(400, { error: 'Passwords do not match.' })
		}

		const { error } = await locals.supabase.auth.updateUser({ password })

		if (error) {
			console.error('[reset-password] error:', error)
			return fail(500, { error: 'Failed to update password. Please try again.' })
		}

		redirect(303, '/admin')
	}
}
