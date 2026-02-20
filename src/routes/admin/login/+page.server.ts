import { fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) redirect(303, '/admin')
	const linkExpired = url.searchParams.get('error') === 'link_expired'
	return { linkExpired }
}

export const actions: Actions = {
	login: async ({ request, locals }) => {
		const form = await request.formData()
		const email = form.get('email') as string
		const password = form.get('password') as string

		if (!email || !password) {
			return fail(400, { error: 'Email and password are required.' })
		}

		const { error } = await locals.supabase.auth.signInWithPassword({ email, password })

		if (error) {
			return fail(400, { error: 'Invalid email or password.' })
		}

		redirect(303, '/admin')
	},

	forgotPassword: async ({ request, locals, url }) => {
		const form = await request.formData()
		const email = (form.get('email') as string)?.trim()

		if (!email) {
			return fail(400, { forgotError: 'Please enter your email address.' })
		}

		// Always return success to avoid email enumeration
		await locals.supabase.auth.resetPasswordForEmail(email, {
			redirectTo: `${url.origin}/auth/callback?next=/admin/reset-password`
		})

		return { forgotSent: true }
	}
}
