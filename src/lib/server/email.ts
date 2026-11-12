import { Resend } from 'resend'
import { RESEND_API_KEY, RESEND_FROM_EMAIL } from '$env/static/private'
import { env } from '$env/dynamic/private'

const FONT = 'Helvetica, Arial, sans-serif'

/** Addresses and notes come from public submissions — escape before putting them in HTML. */
function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')
}

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
const REPLY_TO = env.RESEND_REPLY_TO || undefined

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
		<p style="color: #111;"><strong>${escapeHtml(opts.address)}, ${escapeHtml(opts.suburb)}</strong></p>
		<p><a href="${adminUrl}" style="color: #000; font-weight: bold;">Review in Admin →</a></p>
	`

	const resend = getResend()
	const { error } = await resend.emails.send({
		from: FROM,
		replyTo: REPLY_TO,
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
	houseSlug: string
}) {
	if (!RESEND_API_KEY || !opts.to) {
		if (!RESEND_API_KEY) console.warn('[email] Skipped: RESEND_API_KEY not set')
		return
	}

	const approved = opts.status === 'published'
	const bodyHtml = `
		<p style="color: #111;">${approved ? 'Great news!' : 'Thanks for your submission.'}</p>
		<p style="color: #111;">
			Your submission for <strong>${escapeHtml(opts.address)}, ${escapeHtml(opts.suburb)}</strong> has been
			<strong>${approved ? 'published to the directory' : 'reviewed but not approved at this time'}</strong>.
		</p>
		${opts.notes ? `<p style="color: #555;">${escapeHtml(opts.notes)}</p>` : ''}
		${
			approved
				? `<p><a href="${opts.siteUrl}/house/${opts.houseSlug}" style="color: #000; font-weight: bold;">View your listing →</a></p>`
				: ''
		}
	`

	const resend = getResend()
	const { error } = await resend.emails.send({
		from: FROM,
		replyTo: REPLY_TO,
		to: [opts.to],
		subject: approved
			? `Your submission has been approved — ${opts.suburb}`
			: `Update on your submission — ${opts.suburb}`,
		html: renderEmailLayout({ bodyHtml, siteUrl: opts.siteUrl })
	})

	if (error) console.error('[email] Status update send failed:', error.message)
}

const TAKEDOWN_LABELS: Record<string, string> = {
	full_removal: 'Remove the listing entirely',
	image_removal: 'Remove images',
	address_removal: 'Remove or hide the address'
}

export async function sendTakedownEmail(opts: {
	to: string[]
	requestType: string
	house: string
	requesterName: string
	requesterEmail: string
	reason: string | null
	siteUrl: string
}) {
	if (!RESEND_API_KEY || opts.to.length === 0) {
		if (!RESEND_API_KEY) console.warn('[email] Skipped: RESEND_API_KEY not set')
		return
	}

	const bodyHtml = `
		<p style="color: #111;"><strong>New takedown request</strong> — please action promptly.</p>
		<p style="color: #111;">
			<strong>Request:</strong> ${escapeHtml(TAKEDOWN_LABELS[opts.requestType] ?? opts.requestType)}<br/>
			<strong>Listing:</strong> ${escapeHtml(opts.house)}<br/>
			<strong>From:</strong> ${escapeHtml(opts.requesterName)} &lt;${escapeHtml(opts.requesterEmail)}&gt;
		</p>
		${opts.reason ? `<p style="color: #555; white-space: pre-wrap;">${escapeHtml(opts.reason)}</p>` : ''}
		<p><a href="${opts.siteUrl}/admin/takedowns" style="color: #000; font-weight: bold;">View takedown requests →</a></p>
	`

	const { error } = await getResend().emails.send({
		from: FROM,
		// Reply goes straight to the person who asked
		replyTo: opts.requesterEmail,
		to: opts.to,
		subject: `Takedown request: ${opts.house.slice(0, 80)}`,
		html: renderEmailLayout({ bodyHtml, siteUrl: opts.siteUrl })
	})

	if (error) console.error('[email] Takedown notify failed:', error.message)
}
