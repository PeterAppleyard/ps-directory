import { supabaseAdmin } from '$lib/supabase-admin'
import { fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(303, '/admin/login')
	if (locals.role !== 'admin' && locals.role !== 'super_admin') redirect(303, '/admin')

	const { data: profiles } = await supabaseAdmin
		.from('profiles')
		.select('id, role, email_on_new_submission, email_on_approval, created_at')
		.order('created_at')

	// Get emails from auth.users via admin API
	const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()

	const emailMap: Record<string, string> = {}
	for (const u of authUsers?.users ?? []) {
		emailMap[u.id] = u.email ?? ''
	}

	const users = (profiles ?? []).map((p) => ({
		...p,
		email: emailMap[p.id] ?? '(unknown)'
	}))

	return { users, currentRole: locals.role, currentUserId: locals.user.id }
}

export const actions: Actions = {
	invite: async ({ request, locals, url }) => {
		if (locals.role !== 'admin' && locals.role !== 'super_admin') {
			return fail(403, { error: 'Unauthorized' })
		}

		const form = await request.formData()
		const email = (form.get('email') as string)?.trim().toLowerCase()
		const role = form.get('role') as string

		if (!email) return fail(400, { error: 'Email is required.' })

		// Admins can only invite superusers; super_admins can invite up to admin
		const allowedRoles =
			locals.role === 'super_admin' ? ['superuser', 'admin'] : ['superuser']

		if (!allowedRoles.includes(role)) {
			return fail(400, { error: 'You cannot assign that role.' })
		}

		const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
			redirectTo: `${url.origin}/auth/callback?next=/admin/reset-password`
		})

		if (error) {
			console.error('[invite] error:', error)
			return fail(500, { error: error.message })
		}

		// Set the role in profiles (trigger creates the row, but we need to update role)
		if (data.user) {
			await supabaseAdmin
				.from('profiles')
				.upsert({ id: data.user.id, role })
		}

		return { inviteSent: true, invitedEmail: email }
	},

	setRole: async ({ request, locals }) => {
		if (locals.role !== 'admin' && locals.role !== 'super_admin') {
			return fail(403, { error: 'Unauthorized' })
		}

		const form = await request.formData()
		const userId = form.get('user_id') as string
		const newRole = form.get('role') as string

		// Prevent self-demotion
		if (userId === locals.user?.id) {
			return fail(400, { error: 'You cannot change your own role.' })
		}

		// Admins can only assign superuser; super_admins can assign up to admin
		const allowedRoles =
			locals.role === 'super_admin' ? ['superuser', 'admin'] : ['superuser']

		if (!allowedRoles.includes(newRole)) {
			return fail(400, { error: 'You cannot assign that role.' })
		}

		const { error } = await supabaseAdmin
			.from('profiles')
			.update({ role: newRole })
			.eq('id', userId)

		if (error) {
			console.error('[setRole] error:', error)
			return fail(500, { error: 'Failed to update role.' })
		}

		return { roleUpdated: true }
	},

	removeUser: async ({ request, locals }) => {
		if (locals.role !== 'super_admin') {
			return fail(403, { error: 'Only Super Admins can remove users.' })
		}

		const form = await request.formData()
		const userId = form.get('user_id') as string

		if (userId === locals.user?.id) {
			return fail(400, { error: 'You cannot remove yourself.' })
		}

		const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

		if (error) {
			console.error('[removeUser] error:', error)
			return fail(500, { error: 'Failed to remove user.' })
		}
	}
}
