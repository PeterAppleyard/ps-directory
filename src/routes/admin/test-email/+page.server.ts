import { fail, redirect } from '@sveltejs/kit'
import { Resend } from 'resend'
import { RESEND_API_KEY, RESEND_FROM_EMAIL, RESEND_REPLY_TO } from '$env/static/private'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(303, '/admin/login')

	return {
		fromEmail: RESEND_FROM_EMAIL || null,
		apiKeySet: !!RESEND_API_KEY,
		// Show first/last 4 chars of the key so you can confirm which key is active
		apiKeyHint: RESEND_API_KEY
			? `${RESEND_API_KEY.slice(0, 7)}…${RESEND_API_KEY.slice(-4)}`
			: null
	}
}

export const actions: Actions = {
	send: async ({ request, url }) => {
		const form = await request.formData()
		const to = (form.get('to') as string)?.trim()

		if (!to || !to.includes('@')) {
			return fail(400, { error: 'Enter a valid email address.' })
		}

		if (!RESEND_API_KEY) {
			return fail(500, { error: 'RESEND_API_KEY is not set in environment variables.' })
		}

		const resend = new Resend(RESEND_API_KEY)

		const { data, error } = await resend.emails.send({
			from: `PS Archive <${RESEND_FROM_EMAIL}>`,
			reply_to: RESEND_REPLY_TO || undefined,
			to: [to],
			subject: 'PS Archive — email test',
			html: `
				<div style="font-family: Helvetica, Arial, sans-serif; max-width: 560px; padding: 24px 16px;">
					<p style="color: #111; font-weight: bold;">This is a test email from PS Archive.</p>
					<p style="color: #555;">
						Sent from: <code>${RESEND_FROM_EMAIL}</code><br/>
						Sent at: ${new Date().toISOString()}<br/>
						Origin: ${url.origin}
					</p>
					<hr style="border: 1px solid #eee; margin: 24px 0;" />
					<p style="font-size: 12px; color: #999;">
						PS Archive — <a href="${url.origin}" style="color: #999;">${url.origin}</a>
					</p>
				</div>
			`
		})

		if (error) {
			return fail(500, {
				error: error.message,
				resendError: JSON.stringify(error, null, 2)
			})
		}

		return {
			sent: true,
			to,
			messageId: data?.id ?? null
		}
	}
}
