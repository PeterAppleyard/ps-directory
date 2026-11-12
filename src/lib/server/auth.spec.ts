import { describe, expect, it } from 'vitest'
import { hasRole } from './auth'

describe('hasRole', () => {
	it('denies a signed-in user with no role', () => {
		expect(hasRole(null, 'superuser')).toBe(false)
	})

	it('grants a role everything at or below its level', () => {
		expect(hasRole('superuser', 'superuser')).toBe(true)
		expect(hasRole('superuser', 'admin')).toBe(false)
		expect(hasRole('admin', 'superuser')).toBe(true)
		expect(hasRole('admin', 'super_admin')).toBe(false)
		expect(hasRole('super_admin', 'admin')).toBe(true)
	})
})
