import type { SupabaseClient, User } from '@supabase/supabase-js'

declare global {
	namespace App {
		interface Locals {
			supabase: SupabaseClient
			user: User | null
			role: 'superuser' | 'admin' | 'super_admin' | null
			profile: {
				role: string
				email_on_new_submission: boolean
				email_on_approval: boolean
			} | null
		}
	}
}

export {}
