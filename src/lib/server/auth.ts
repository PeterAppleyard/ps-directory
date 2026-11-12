export type Role = NonNullable<App.Locals['role']>

const LEVELS: Record<Role, number> = { superuser: 1, admin: 2, super_admin: 3 }

/**
 * True when the user's role is at least `minimum`. A signed-in user with no role in
 * `profiles` (e.g. someone who signed up through the public Supabase auth API) gets nothing.
 */
export function hasRole(role: App.Locals['role'], minimum: Role): boolean {
	if (!role) return false
	return LEVELS[role] >= LEVELS[minimum]
}
