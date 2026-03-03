import { Resend } from 'resend'
import { RESEND_API_KEY, RESEND_FROM_EMAIL, RESEND_REPLY_TO } from '$env/static/private'

const FONT = 'Helvetica, Arial, sans-serif'

function renderEmailLayout(opts: { bodyHtml: string; siteUrl: string }) {
	return `
		<div style="font-family: ${FONT}; max-width: 560px; padding: 24px 16px;">
			${opts.bodyHtml}
			<hr style="border: 1px solid #eee; margin: 24px 0;" />
			<p style="font-size: 12px; color: #999;">
				PS Archive — <a href="${opts.siteUrl}" style="color: #999;">${opts.siteUrl}</a>
			</p>
		</div>
	`
}

const FROM = `PS Archive <${RESEND_FROM_EMAIL}>`

function getResend() {
	return new Resend(RESEND_API_KEY)
}

export async function sendNewSubmissionEmail(opts: {
	to: string[]
	address: string
	suburb: string
	houseId: string
	siteUrl: string
}) {
	if (!RESEND_API_KEY || opts.to.length === 0) {
		if (!RESEND_API_KEY) console.warn('[email] Skipped: RESEND_API_KEY not set')
		return
	}

	const adminUrl = `${opts.siteUrl}/admin`
	const bodyHtml = `
		<p style="color: #111;">A new Pettit &amp; Sevitt home has been submitted for review.</p>
		<p style="color: #111;"><strong>${opts.address}, ${opts.suburb}</strong></p>
		<p><a href="${adminUrl}" style="color: #000; font-weight: bold;">Review in Admin →</a></p>
	`

	const resend = getResend()
	const { error } = await resend.emails.send({
		from: FROM,
		reply_to: RESEND_REPLY_TO || undefined,
		to: opts.to,
		subject: `New submission: ${opts.address}, ${opts.suburb}`,
		html: renderEmailLayout({ bodyHtml, siteUrl: opts.siteUrl })
	})

	if (error) console.error('[email] New submission send failed:', error.message)
}

export async function sendStatusUpdateEmail(opts: {
	to: string
	address: string
	suburb: string
	status: 'published' | 'rejected'
	notes: string | null
	siteUrl: string
	houseId: string
}) {
	if (!RESEND_API_KEY || !opts.to) {
		if (!RESEND_API_KEY) console.warn('[email] Skipped: RESEND_API_KEY not set')
		return
	}

	const approved = opts.status === 'published'
	const bodyHtml = `
		<p style="color: #111;">${approved ? 'Great news!' : 'Thanks for your submission.'}</p>
		<p style="color: #111;">
			Your submission for <strong>${opts.address}, ${opts.suburb}</strong> has been
			<strong>${approved ? 'published to the directory' : 'reviewed but not approved at this time'}</strong>.
		</p>
		${opts.notes ? `<p style="color: #555;">${opts.notes}</p>` : ''}
		${
			approved
				? `<p><a href="${opts.siteUrl}/house/${opts.houseId}" style="color: #000; font-weight: bold;">View your listing →</a></p>`
				: ''
		}
	`

	const resend = getResend()
	const { error } = await resend.emails.send({
		from: FROM,
		reply_to: RESEND_REPLY_TO || undefined,
		to: [opts.to],
		subject: approved
			? `Your submission has been approved — ${opts.suburb}`
			: `Update on your submission — ${opts.suburb}`,
		html: renderEmailLayout({ bodyHtml, siteUrl: opts.siteUrl })
	})

	if (error) console.error('[email] Status update send failed:', error.message)
}
