import { supabaseAdmin } from '$lib/supabase-admin'
import { PRIVATE_ADMIN_PASSWORD } from '$env/static/private'
import { fail } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import type { Image } from '$lib/types'

const COOKIE = 'ps_admin'
const COOKIE_MAX_AGE = 60 * 60 * 8 // 8 hours

function isAuthed(cookies: Parameters<PageServerLoad>[0]['cookies']): boolean {
	return cookies.get(COOKIE) === PRIVATE_ADMIN_PASSWORD
}

export const load: PageServerLoad = async ({ cookies }) => {
	if (!isAuthed(cookies)) {
		return { authed: false, pending: [], published: [], imagesByHouse: {} }
	}

	const [{ data: pending, error: pendingErr }, { data: published, error: publishedErr }] =
		await Promise.all([
			supabaseAdmin
				.from('houses')
				.select('*')
				.eq('status', 'pending')
				.order('created_at', { ascending: false }),
			supabaseAdmin
				.from('houses')
				.select('*')
				.eq('status', 'published')
				.order('address_suburb')
		])

	if (pendingErr) console.error('Admin load (pending) error:', pendingErr)
	if (publishedErr) console.error('Admin load (published) error:', publishedErr)

	const allHouses = [...(pending ?? []), ...(published ?? [])]

	const imagesByHouse: Record<string, (Image & { url: string })[]> = {}

	if (allHouses.length > 0) {
		const { data: images } = await supabaseAdmin
			.from('images')
			.select('*')
			.in(
				'house_id',
				allHouses.map((h) => h.id)
			)
			.order('sort_order')

		for (const img of images ?? []) {
			const { data } = supabaseAdmin.storage.from('house-images').getPublicUrl(img.storage_path)
			if (!imagesByHouse[img.house_id]) imagesByHouse[img.house_id] = []
			imagesByHouse[img.house_id].push({ ...(img as Image), url: data.publicUrl })
		}
	}

	return {
		authed: true,
		pending: pending ?? [],
		published: published ?? [],
		imagesByHouse
	}
}

export const actions: Actions = {
	login: async ({ request, cookies }) => {
		const form = await request.formData()
		const password = form.get('password') as string

		if (!password || password !== PRIVATE_ADMIN_PASSWORD) {
			return fail(403, { loginError: 'Incorrect password.' })
		}

		cookies.set(COOKIE, password, {
			path: '/',
			maxAge: COOKIE_MAX_AGE,
			httpOnly: true,
			sameSite: 'strict',
			secure: false // set to true in production behind HTTPS
		})
	},

	logout: async ({ cookies }) => {
		cookies.delete(COOKIE, { path: '/' })
	},

	approve: async ({ request, cookies }) => {
		if (!isAuthed(cookies)) return fail(403, { error: 'Unauthorized' })

		const form = await request.formData()
		const id = form.get('id') as string
		const notes = (form.get('notes') as string)?.trim() || null

		const { error } = await supabaseAdmin
			.from('houses')
			.update({ status: 'published', verification_notes: notes })
			.eq('id', id)

		if (error) {
			console.error('Approve error:', error)
			return fail(500, { error: 'Failed to approve submission.' })
		}
	},

	reject: async ({ request, cookies }) => {
		if (!isAuthed(cookies)) return fail(403, { error: 'Unauthorized' })

		const form = await request.formData()
		const id = form.get('id') as string
		const notes = (form.get('notes') as string)?.trim() || null

		const { error } = await supabaseAdmin
			.from('houses')
			.update({ status: 'rejected', verification_notes: notes })
			.eq('id', id)

		if (error) {
			console.error('Reject error:', error)
			return fail(500, { error: 'Failed to reject submission.' })
		}
	},

	deleteImage: async ({ request, cookies }) => {
		if (!isAuthed(cookies)) return fail(403, { error: 'Unauthorized' })

		const form = await request.formData()
		const imageId = form.get('image_id') as string
		const storagePath = form.get('storage_path') as string

		// Remove from storage (best effort — don't fail if file missing)
		await supabaseAdmin.storage.from('house-images').remove([storagePath])

		const { error } = await supabaseAdmin.from('images').delete().eq('id', imageId)

		if (error) {
			console.error('Delete image error:', error)
			return fail(500, { deleteImageError: 'Failed to delete image.' })
		}
	},

	edit: async ({ request, cookies }) => {
		if (!isAuthed(cookies)) return fail(403, { error: 'Unauthorized' })

		const form = await request.formData()
		const id = form.get('id') as string

		const rawYear = form.get('year_built') as string
		const rawLat = form.get('latitude') as string
		const rawLng = form.get('longitude') as string

		const rawListingUrl = (form.get('listing_url') as string)?.trim() || null
		const rawSoldUrl = (form.get('sold_listing_url') as string)?.trim() || null

		const { error } = await supabaseAdmin
			.from('houses')
			.update({
				address_street: (form.get('address_street') as string).trim(),
				address_suburb: (form.get('address_suburb') as string).trim(),
				address_state: form.get('address_state') as string,
				address_postcode: (form.get('address_postcode') as string).trim(),
				style: (form.get('style') as string) || null,
				year_built: rawYear ? parseInt(rawYear) : null,
				builder_name: (form.get('builder_name') as string)?.trim() || null,
				condition: (form.get('condition') as string) || null,
				description: (form.get('description') as string)?.trim() || null,
				latitude: rawLat ? parseFloat(rawLat) : null,
				longitude: rawLng ? parseFloat(rawLng) : null,
				listing_url: rawListingUrl,
				sold_listing_url: rawSoldUrl
			})
			.eq('id', id)

		if (error) {
			console.error('Edit error:', error)
			return fail(500, { editError: id })
		}

		return { editSuccess: id }
	}
}
