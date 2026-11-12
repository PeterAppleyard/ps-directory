import { fail, redirect } from '@sveltejs/kit'
import { supabaseAdmin } from '$lib/supabase-admin'
import { hasRole } from '$lib/server/auth'
import type { Actions, PageServerLoad } from './$types'

export interface TakedownRequest {
	id: string
	created_at: string
	request_type: 'full_removal' | 'image_removal' | 'address_removal'
	house_address: string | null
	house_url: string | null
	requester_name: string
	requester_email: string
	reason: string | null
	status: string
}

export const load: PageServerLoad = async ({ locals }) => {
	if (!hasRole(locals.role, 'admin')) redirect(303, '/admin')

	const { data, error } = await supabaseAdmin
		.from('takedown_requests')
		.select('*')
		.order('created_at', { ascending: false })
		.limit(200)

	if (error) console.error('Takedowns load error:', error)
	return { requests: (data ?? []) as TakedownRequest[] }
}

export const actions: Actions = {
	setStatus: async ({ request, locals }) => {
		if (!hasRole(locals.role, 'admin')) return fail(403, { error: 'Unauthorized' })

		const form = await request.formData()
		const id = form.get('id')
		const status = form.get('status')
		if (typeof id !== 'string' || (status !== 'pending' && status !== 'resolved')) {
			return fail(400, { error: 'Invalid request' })
		}

		const { error } = await supabaseAdmin.from('takedown_requests').update({ status }).eq('id', id)
		if (error) {
			console.error('Takedown status error:', error)
			return fail(500, { error: 'Could not update the request.' })
		}
	}
}
