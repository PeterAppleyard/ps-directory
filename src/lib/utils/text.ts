/** Words kept lowercase inside a suburb name, unless first ("Point Piper", "Bay of Islands"). */
const SMALL_WORDS = new Set(['of', 'on', 'the', 'and'])

/**
 * Normalises suburb capitalisation so "WEST PYMBLE", "west pymble" and "West Pymble"
 * are stored (and filtered) as one suburb. Letters after a hyphen stay lowercase (Ku-ring-gai).
 */
export function tidySuburb(input: string): string {
	return input
		.trim()
		.replace(/\s+/g, ' ')
		.toLowerCase()
		.split(' ')
		.map((word, i) =>
			i > 0 && SMALL_WORDS.has(word)
				? word
				: word.replace(/(^|')(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase())
		)
		.join(' ')
}

const STATE_ABBREVIATIONS: Record<string, string> = {
	'new south wales': 'NSW',
	victoria: 'VIC',
	queensland: 'QLD',
	'south australia': 'SA',
	'western australia': 'WA',
	tasmania: 'TAS',
	'northern territory': 'NT',
	'australian capital territory': 'ACT'
}

/** "New South Wales" (Mapbox) or "nsw" (forms/CSV) → "NSW". Returns '' when unrecognised. */
export function normaliseState(input: string): string {
	const value = input.trim().toLowerCase()
	const abbr = STATE_ABBREVIATIONS[value] ?? value.toUpperCase()
	return Object.values(STATE_ABBREVIATIONS).includes(abbr) ? abbr : ''
}
