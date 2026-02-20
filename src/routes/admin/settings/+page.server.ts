import { supabaseAdmin } from '$lib/supabase-admin'
import { fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(303, '/admin/login')

	const { data: profile } = await supabaseAdmin
		.from('profiles')
		.select('role, email_on_new_submission, email_on_approval')
		.eq('id', locals.user.id)
		.single()

	return {
		email: locals.user.email,
		profile: profile ?? { role: locals.role, email_on_new_submission: true, email_on_approval: true }
	}
}

export const actions: Actions = {
	saveNotifications: async ({ request, locals }) => {
		if (!locals.user) return fail(403, { error: 'Unauthorized' })

		const form = await request.formData()
		const emailOnNewSubmission = form.get('email_on_new_submission') === 'on'
		const emailOnApproval = form.get('email_on_approval') === 'on'

		const { error } = await supabaseAdmin
			.from('profiles')
			.update({ email_on_new_submission: emailOnNewSubmission, email_on_approval: emailOnApproval })
			.eq('id', locals.user.id)

		if (error) {
			console.error('[settings] error:', error)
			return fail(500, { error: 'Failed to save settings.' })
		}

		return { saved: true }
	},

	changePassword: async ({ request, locals }) => {
		if (!locals.user) return fail(403, { error: 'Unauthorized' })

		const form = await request.formData()
		const password = form.get('password') as string
		const confirm = form.get('confirm') as string

		if (!password || password.length < 8) {
			return fail(400, { passwordError: 'Password must be at least 8 characters.' })
		}

		if (password !== confirm) {
			return fail(400, { passwordError: 'Passwords do not match.' })
		}

		const { error } = await locals.supabase.auth.updateUser({ password })

		if (error) {
			return fail(500, { passwordError: 'Failed to update password.' })
		}

		return { passwordSaved: true }
	}
}
