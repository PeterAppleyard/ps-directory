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
		const { data: profile } = await supabaseAdmin
			.from('profiles')
			.select('role, email_on_new_submission, email_on_approval')
			.eq('id', user.id)
			.single()

		event.locals.role = (profile?.role as App.Locals['role']) ?? null
		event.locals.profile = profile ?? null
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
