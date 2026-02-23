import { supabaseAdmin } from '$lib/supabase-admin'
import { sendStatusUpdateEmail } from '$lib/server/email'
import { fail, redirect } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'
import type { House, Image, HouseStyleRecord, PropertyStory } from '$lib/types'

function requireRole(
	role: App.Locals['role'],
	minimum: 'superuser' | 'admin' | 'super_admin'
): boolean {
	const levels = { superuser: 1, admin: 2, super_admin: 3 }
	return (levels[role ?? 'superuser'] ?? 0) >= levels[minimum]
}

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(303, '/admin/login')

	const isAdmin = requireRole(locals.role, 'admin')

	const publishedQuery = supabaseAdmin
		.from('houses')
		.select('*')
		.eq('status', 'published')
		.order('address_suburb')

	let pending: House[] = []

	if (isAdmin) {
		const { data, error } = await supabaseAdmin
			.from('houses')
			.select('*')
			.eq('status', 'pending')
			.order('created_at', { ascending: false })
		if (error) console.error('Admin load (pending) error:', error)
		pending = (data ?? []) as House[]
	}

	const { data: publishedData, error: publishedErr } = await publishedQuery
	if (publishedErr) console.error('Admin load (published) error:', publishedErr)
	const published = (publishedData ?? []) as House[]

	const allHouses = [...pending, ...published]
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

	const missingPhotos = published.filter((h) => !imagesByHouse[h.id]?.length).length
	const missingLocation = published.filter((h) => !h.latitude).length

	const { data: stylesData } = await supabaseAdmin
		.from('house_styles')
		.select('id, name, sort_order')
		.order('sort_order')

	// Pending property stories (Know this property?) — admins can approve
	let pendingStories: (PropertyStory & { house: House | null })[] = []
	if (isAdmin) {
		const { data: storiesData } = await supabaseAdmin
			.from('property_stories')
			.select('*')
			.eq('status', 'pending')
			.order('created_at', { ascending: false })
		const stories = (storiesData ?? []) as PropertyStory[]
		const allHouses = [...pending, ...published]
		pendingStories = stories.map((s) => ({
			...s,
			house: allHouses.find((h) => h.id === s.house_id) ?? null
		}))
	}

	return {
		role: locals.role,
		user: { email: locals.user.email },
		pending,
		published,
		imagesByHouse,
		missingPhotos,
		missingLocation,
		pendingStories,
		styles: (stylesData ?? []) as HouseStyleRecord[]
	}
}

export const actions: Actions = {
	logout: async ({ locals }) => {
		await locals.supabase.auth.signOut()
		redirect(303, '/admin/login')
	},

	approve: async ({ request, locals, url }) => {
		if (!requireRole(locals.role, 'admin')) return fail(403, { error: 'Unauthorized' })

		const form = await request.formData()
		const id = form.get('id') as string
		const notes = (form.get('notes') as string)?.trim() || null

		const { data: house, error } = await supabaseAdmin
			.from('houses')
			.update({ status: 'published', verification_notes: notes })
			.eq('id', id)
			.select('address_street, address_suburb, submitter_email')
			.single()

		if (error) {
			console.error('Approve error:', error)
			return fail(500, { error: 'Failed to approve submission.' })
		}

		if (house?.submitter_email) {
			await sendStatusUpdateEmail({
				to: house.submitter_email,
				address: house.address_street,
				suburb: house.address_suburb,
				status: 'published',
				notes,
				siteUrl: url.origin,
				houseId: id
			}).catch((e) => console.error('[email] approve notify failed:', e))
		}
	},

	reject: async ({ request, locals, url }) => {
		if (!requireRole(locals.role, 'admin')) return fail(403, { error: 'Unauthorized' })

		const form = await request.formData()
		const id = form.get('id') as string
		const notes = (form.get('notes') as string)?.trim() || null

		const { data: house, error } = await supabaseAdmin
			.from('houses')
			.update({ status: 'rejected', verification_notes: notes })
			.eq('id', id)
			.select('address_street, address_suburb, submitter_email')
			.single()

		if (error) {
			console.error('Reject error:', error)
			return fail(500, { error: 'Failed to reject submission.' })
		}

		if (house?.submitter_email) {
			await sendStatusUpdateEmail({
				to: house.submitter_email,
				address: house.address_street,
				suburb: house.address_suburb,
				status: 'rejected',
				notes,
				siteUrl: url.origin,
				houseId: id
			}).catch((e) => console.error('[email] reject notify failed:', e))
		}
	},

	approveStory: async ({ request, locals }) => {
		if (!requireRole(locals.role, 'admin')) return fail(403, { error: 'Unauthorized' })

		const form = await request.formData()
		const id = form.get('id') as string
		if (!id) return fail(400, { error: 'Missing story id' })

		const { error } = await supabaseAdmin
			.from('property_stories')
			.update({ status: 'approved' })
			.eq('id', id)

		if (error) {
			console.error('Approve story error:', error)
			return fail(500, { error: 'Failed to approve story.' })
		}
	},

	deleteImage: async ({ request, locals }) => {
		if (!requireRole(locals.role, 'superuser')) return fail(403, { error: 'Unauthorized' })

		const form = await request.formData()
		const imageId = form.get('image_id') as string
		const storagePath = form.get('storage_path') as string

		await supabaseAdmin.storage.from('house-images').remove([storagePath])

		const { error } = await supabaseAdmin.from('images').delete().eq('id', imageId)

		if (error) {
			console.error('Delete image error:', error)
			return fail(500, { deleteImageError: 'Failed to delete image.' })
		}
	},

	addStyle: async ({ request, locals }) => {
		if (!requireRole(locals.role, 'superuser')) return fail(403, { error: 'Unauthorized' })

		const form = await request.formData()
		const name = (form.get('name') as string)?.trim()

		if (!name) return fail(400, { styleError: 'Style name is required.' })

		const { data: existing } = await supabaseAdmin
			.from('house_styles')
			.select('id')
			.eq('name', name)
			.maybeSingle()

		if (existing) return fail(400, { styleError: `"${name}" already exists.` })

		const { data: last } = await supabaseAdmin
			.from('house_styles')
			.select('sort_order')
			.order('sort_order', { ascending: false })
			.limit(1)
			.maybeSingle()

		const nextOrder = (last?.sort_order ?? 0) + 1

		const { error } = await supabaseAdmin
			.from('house_styles')
			.insert({ name, sort_order: nextOrder })

		if (error) {
			console.error('Add style error:', error)
			return fail(500, { styleError: 'Failed to add style.' })
		}

		return { styleAdded: name }
	},

	deleteStyle: async ({ request, locals }) => {
		if (!requireRole(locals.role, 'admin')) return fail(403, { error: 'Unauthorized' })

		const form = await request.formData()
		const id = form.get('id') as string

		// Block deletion if any house uses this style
		const { data: styleRow } = await supabaseAdmin
			.from('house_styles')
			.select('name')
			.eq('id', id)
			.single()

		if (styleRow) {
			const { count } = await supabaseAdmin
				.from('houses')
				.select('id', { count: 'exact', head: true })
				.eq('style', styleRow.name)

			if ((count ?? 0) > 0) {
				return fail(400, { styleError: `Cannot delete "${styleRow.name}" — it is used by ${count} listing${count !== 1 ? 's' : ''}.` })
			}
		}

		const { error } = await supabaseAdmin.from('house_styles').delete().eq('id', id)

		if (error) {
			console.error('Delete style error:', error)
			return fail(500, { styleError: 'Failed to delete style.' })
		}

		return { styleDeleted: id }
	},

	setFeatured: async ({ request, locals }) => {
		if (!requireRole(locals.role, 'admin')) return fail(403, { error: 'Unauthorized' })

		const form = await request.formData()
		const id = form.get('id') as string

		// Clear any existing featured house first, then set the new one
		await supabaseAdmin.from('houses').update({ is_featured: false }).eq('is_featured', true)

		const { error } = await supabaseAdmin
			.from('houses')
			.update({ is_featured: true })
			.eq('id', id)

		if (error) {
			console.error('Set featured error:', error)
			return fail(500, { error: 'Failed to set featured listing.' })
		}

		return { featuredId: id }
	},

	edit: async ({ request, locals }) => {
		if (!requireRole(locals.role, 'superuser')) return fail(403, { error: 'Unauthorized' })

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
