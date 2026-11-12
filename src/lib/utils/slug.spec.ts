import { describe, expect, it } from 'vitest'
import { stripStreetNumber } from './compress'
import { generateBaseSlug, isUUID } from './slug'

describe('generateBaseSlug', () => {
	it('joins suburb and street name, without the street number', () => {
		expect(generateBaseSlug('West Pymble', '37 Todman Avenue')).toBe('west-pymble-todman-avenue')
		expect(generateBaseSlug('Seaforth', '14A Main St')).toBe('seaforth-main-st')
	})

	it('strips diacritics and punctuation', () => {
		expect(generateBaseSlug("O'Connor", 'Café  Road')).toBe('o-connor-cafe-road')
	})
})

describe('isUUID', () => {
	it('recognises legacy id URLs but not slugs', () => {
		expect(isUUID('4ececa51-4c60-4e1f-86ee-9a7514b5dd81')).toBe(true)
		expect(isUUID('west-pymble-todman-avenue')).toBe(false)
	})
})

describe('stripStreetNumber', () => {
	it('removes a leading number and tolerates missing values', () => {
		expect(stripStreetNumber('37 Gould Ave')).toBe('Gould Ave')
		expect(stripStreetNumber('Gould Ave')).toBe('Gould Ave')
		expect(stripStreetNumber(null)).toBe('')
	})
})
