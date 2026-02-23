export type UserRole = 'superuser' | 'admin' | 'super_admin'

export interface House {
	id: string
	created_at: string
	address_street: string
	address_suburb: string
	address_state: string
	address_postcode: string
	latitude: number | null
	longitude: number | null
	style: string
	year_built: number | null
	builder_name: string | null
	description: string | null
	condition: string | null
	status: 'pending' | 'published' | 'rejected'
	contributor_id: string | null
	verified_by: string | null
	verification_notes: string | null
	listing_url: string | null
	sold_listing_url: string | null
	submitter_email: string | null
	is_featured: boolean
}

export interface Image {
	id: string
	created_at: string
	house_id: string
	storage_path: string
	caption: string | null
	is_primary: boolean
	sort_order: number
	contributor_id: string | null
}

export interface HouseStyleRecord {
	id: string
	name: string
	sort_order: number
}

export type HouseCondition = 'Original' | 'Renovated' | 'At Risk' | 'Demolished'

export interface PropertyStory {
	id: string
	created_at: string
	house_id: string
	author_name: string
	story: string
	period_or_context: string | null
	status: 'pending' | 'approved'
}
