import { createSupabaseServerClient } from '$lib/server/supabase'
import { supabaseAdmin } from '$lib/supabase-admin'
import type { Handle } from '@sveltejs/kit'

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createSupabaseServerClient(event.cookies)

	const {
		data: { user }
	} = await event.locals.supabase.auth.getUser()

	event.locals.user = user ?? null

	if (user) {
		const { data: rawProfile } = await supabaseAdmin
			.from('profiles')
			.select('role, email_on_new_submission, email_on_approval, notification_frequency, theme')
			.eq('id', user.id)
			.single()

		// Cast to include new columns (notification_frequency, theme) that may not yet be in generated types
		const profile = rawProfile as {
			role: string
			email_on_new_submission: boolean
			email_on_approval: boolean
			notification_frequency?: string
			theme?: string
		} | null

		event.locals.role = (profile?.role as App.Locals['role']) ?? null
		event.locals.profile = profile
			? {
					role: profile.role,
					email_on_new_submission: profile.email_on_new_submission ?? true,
					email_on_approval: profile.email_on_approval ?? true,
					notification_frequency: (profile.notification_frequency ?? 'instant') as 'instant' | 'daily' | 'none',
					theme: (profile.theme ?? 'system') as 'light' | 'dark' | 'system'
				}
			: null
	} else {
		event.locals.role = null
		event.locals.profile = null
	}

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version'
		}
	})
}
