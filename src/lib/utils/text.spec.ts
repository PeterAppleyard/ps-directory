import { describe, expect, it } from 'vitest'
import { normaliseState, tidySuburb } from './text'

describe('tidySuburb', () => {
	it('merges capitalisation variants into one suburb', () => {
		expect(tidySuburb('WEST PYMBLE')).toBe('West Pymble')
		expect(tidySuburb('  west   pymble ')).toBe('West Pymble')
		expect(tidySuburb('West Pymble')).toBe('West Pymble')
	})

	it('capitalises after an apostrophe but not after a hyphen', () => {
		expect(tidySuburb("o'connor")).toBe("O'Connor")
		expect(tidySuburb('KU-RING-GAI')).toBe('Ku-ring-gai')
	})

	it('keeps small joining words lowercase unless first', () => {
		expect(tidySuburb('BAY OF ISLANDS')).toBe('Bay of Islands')
		expect(tidySuburb('the entrance')).toBe('The Entrance')
	})
})

describe('normaliseState', () => {
	it('accepts full names and abbreviations in any case', () => {
		expect(normaliseState('New South Wales')).toBe('NSW')
		expect(normaliseState(' nsw ')).toBe('NSW')
		expect(normaliseState('Australian Capital Territory')).toBe('ACT')
	})

	it('returns an empty string for anything unrecognised', () => {
		expect(normaliseState('Narnia')).toBe('')
		expect(normaliseState('')).toBe('')
	})
})
