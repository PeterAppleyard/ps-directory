import { supabaseAdmin } from '$lib/supabase-admin'

/**
 * Email addresses of admins/super_admins. With `submissionAlertsOnly`, only those who
 * opted into new-submission emails (and haven't set frequency to 'none').
 */
export async function getAdminEmails({ submissionAlertsOnly = false } = {}): Promise<string[]> {
	let query = supabaseAdmin.from('profiles').select('id').in('role', ['admin', 'super_admin'])
	if (submissionAlertsOnly) {
		query = query.eq('email_on_new_submission', true).neq('notification_frequency', 'none')
	}

	const { data: recipients } = await query
	if (!recipients?.length) return []

	const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
	const emailById = new Map((authUsers?.users ?? []).map((u) => [u.id, u.email]))
	return recipients.map((r) => emailById.get(r.id)).filter((e): e is string => !!e)
}
