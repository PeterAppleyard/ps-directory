import { supabase } from '$lib/supabase'
import type { PublicHouse } from '$lib/types'

/**
 * Columns the public (anon) role may read on `houses`.
 * Must match the column grant in supabase/migrations/20261002_restrict_public_house_columns.sql —
 * a column added here without a grant makes every public query fail with "permission denied".
 */
export const PUBLIC_HOUSE_COLUMNS =
	'id, slug, created_at, address_street, address_suburb, address_state, address_postcode, latitude, longitude, style, year_built, builder_name, description, condition, status, listing_url, sold_listing_url, is_featured'

/** Fields shown on a directory card, plus the primary image embedded via the images FK. */
const CARD_SELECT =
	'id, slug, address_street, address_suburb, style, year_built, condition, is_featured, images(storage_path)'

/** Fields the map needs for markers and popups. */
const MAP_SELECT =
	'id, slug, address_suburb, style, year_built, condition, latitude, longitude, images(storage_path)'

export const PAGE_SIZE = 18

export type CardHouse = Pick<
	PublicHouse,
	'id' | 'slug' | 'address_street' | 'address_suburb' | 'style' | 'year_built' | 'condition' | 'is_featured'
> & { thumbnail: string | null }

export type MapHouse = Pick<
	PublicHouse,
	'id' | 'slug' | 'address_suburb' | 'style' | 'year_built' | 'condition' | 'latitude' | 'longitude'
> & { thumbnail: string | null }

export interface HouseFilters {
	q: string
	suburb: string
	style: string
}

export function filtersFromUrl(url: URL): HouseFilters {
	return {
		q: url.searchParams.get('q')?.trim() ?? '',
		suburb: url.searchParams.get('suburb') ?? '',
		style: url.searchParams.get('style') ?? ''
	}
}

export function publicImageUrl(storagePath: string): string {
	return supabase.storage.from('house-images').getPublicUrl(storagePath).data.publicUrl
}

/**
 * Strips characters that would break PostgREST's `or()` filter syntax (commas, parens, dots
 * inside operators) or act as LIKE wildcards. Letters, digits, spaces, hyphens and apostrophes
 * cover every real suburb/street/style search.
 */
function sanitiseSearch(q: string): string {
	return q.replace(/[^\p{L}\p{N}\s'-]/gu, ' ').replace(/\s+/g, ' ').trim()
}

type Row = Record<string, unknown> & { images?: { storage_path: string }[] | null }

function withThumbnail<T extends Row>({ images, ...rest }: T): Omit<T, 'images'> & { thumbnail: string | null } {
	const path = images?.[0]?.storage_path
	return { ...rest, thumbnail: path ? publicImageUrl(path) : null }
}

/** Base query for published houses with the given filters applied. */
function publishedHouses(select: string, filters: HouseFilters, count = false) {
	let query = supabase
		.from('houses')
		.select(select, count ? { count: 'exact' } : undefined)
		.eq('status', 'published')
		.eq('images.is_primary', true)

	if (filters.suburb) query = query.eq('address_suburb', filters.suburb)
	if (filters.style) query = query.eq('style', filters.style)

	const q = sanitiseSearch(filters.q)
	if (q) {
		const pattern = `%${q}%`
		query = query.or(
			['address_suburb', 'address_street', 'style', 'description', 'builder_name']
				.map((col) => `${col}.ilike.${pattern}`)
				.join(',')
		)
	}
	return query
}

/** One page of directory cards, featured first. `offset` is the number of cards already shown. */
export async function fetchHousePage(filters: HouseFilters, offset = 0) {
	const { data, count, error } = await publishedHouses(CARD_SELECT, filters, true)
		.order('is_featured', { ascending: false })
		.order('address_suburb')
		.order('id')
		.range(offset, offset + PAGE_SIZE - 1)

	if (error) throw error
	return { houses: ((data ?? []) as unknown as Row[]).map(withThumbnail) as unknown as CardHouse[], count: count ?? 0 }
}

/** Every published house matching the filters, with only the fields the map needs. */
export async function fetchMapHouses(filters: HouseFilters) {
	const { data, error } = await publishedHouses(MAP_SELECT, filters).order('address_suburb')
	if (error) throw error
	return ((data ?? []) as unknown as Row[]).map(withThumbnail) as unknown as MapHouse[]
}

/** Distinct suburbs and styles across all published houses, for the filter dropdowns. */
export async function fetchFilterOptions() {
	const { data, error } = await supabase
		.from('houses')
		.select('address_suburb, style')
		.eq('status', 'published')

	if (error) throw error
	const rows = data ?? []
	const distinct = (values: (string | null)[]) =>
		[...new Set(values.filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b))

	return {
		suburbs: distinct(rows.map((r) => r.address_suburb)),
		styles: distinct(rows.map((r) => r.style)),
		total: rows.length
	}
}
