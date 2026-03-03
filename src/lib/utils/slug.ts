import { stripStreetNumber } from './compress'

/**
 * Generates a URL-safe base slug from suburb + street.
 * e.g. "West Pymble", "37 Todman Avenue" → "west-pymble-todman-avenue"
 */
export function generateBaseSlug(suburb: string, street: string): string {
	const streetName = stripStreetNumber(street)
	return `${suburb}-${streetName}`
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '') // strip diacritics
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
}

/** Returns true if the string looks like a UUID */
export function isUUID(str: string): boolean {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}
