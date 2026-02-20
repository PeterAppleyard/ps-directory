import { Resend } from 'resend'
import { RESEND_API_KEY, RESEND_FROM_EMAIL } from '$env/static/private'

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
	if (!RESEND_API_KEY || opts.to.length === 0) return

	const resend = getResend()
	const adminUrl = `${opts.siteUrl}/admin`

	await resend.emails.send({
		from: RESEND_FROM_EMAIL,
		to: opts.to,
		subject: `New submission: ${opts.address}, ${opts.suburb}`,
		html: `
			<p style="font-family: Helvetica, Arial, sans-serif; color: #111;">
				A new Pettit &amp; Sevitt home has been submitted for review.
			</p>
			<p style="font-family: Helvetica, Arial, sans-serif; color: #111;">
				<strong>${opts.address}, ${opts.suburb}</strong>
			</p>
			<p style="font-family: Helvetica, Arial, sans-serif;">
				<a href="${adminUrl}" style="color: #000; font-weight: bold;">Review in Admin →</a>
			</p>
			<hr style="border: 1px solid #eee; margin: 24px 0;" />
			<p style="font-family: Helvetica, Arial, sans-serif; font-size: 12px; color: #999;">
				Project Sydney — <a href="${opts.siteUrl}" style="color: #999;">${opts.siteUrl}</a>
			</p>
		`
	})
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
	if (!RESEND_API_KEY || !opts.to) return

	const resend = getResend()
	const approved = opts.status === 'published'

	await resend.emails.send({
		from: RESEND_FROM_EMAIL,
		to: opts.to,
		subject: approved
			? `Your submission has been approved — ${opts.suburb}`
			: `Update on your submission — ${opts.suburb}`,
		html: `
			<p style="font-family: Helvetica, Arial, sans-serif; color: #111;">
				${approved ? 'Great news!' : 'Thanks for your submission.'}
			</p>
			<p style="font-family: Helvetica, Arial, sans-serif; color: #111;">
				Your submission for <strong>${opts.address}, ${opts.suburb}</strong> has been
				<strong>${approved ? 'published to the directory' : 'reviewed but not approved at this time'}</strong>.
			</p>
			${opts.notes ? `<p style="font-family: Helvetica, Arial, sans-serif; color: #555;">${opts.notes}</p>` : ''}
			${
				approved
					? `<p style="font-family: Helvetica, Arial, sans-serif;">
				<a href="${opts.siteUrl}/house/${opts.houseId}" style="color: #000; font-weight: bold;">View your listing →</a>
			</p>`
					: ''
			}
			<hr style="border: 1px solid #eee; margin: 24px 0;" />
			<p style="font-family: Helvetica, Arial, sans-serif; font-size: 12px; color: #999;">
				Project Sydney — <a href="${opts.siteUrl}" style="color: #999;">${opts.siteUrl}</a>
			</p>
		`
	})
}
