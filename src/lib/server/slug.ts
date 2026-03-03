import { supabaseAdmin } from '$lib/supabase-admin'
import { generateBaseSlug } from '$lib/utils/slug'

/**
 * Generates a unique slug for a house, checking the DB for collisions.
 * Appends -2, -3, etc. if the base slug is already taken.
 */
export async function generateUniqueSlug(suburb: string, street: string): Promise<string> {
	const base = generateBaseSlug(suburb, street)
	let slug = base
	let counter = 2

	while (true) {
		const { data } = await supabaseAdmin
			.from('houses')
			.select('id')
			.eq('slug', slug)
			.maybeSingle()

		if (!data) break // slug is available
		slug = `${base}-${counter}`
		counter++
	}

	return slug
}
