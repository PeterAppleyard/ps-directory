<script lang="ts">
	import { page } from '$app/stores'
	import { enhance } from '$app/forms'
	import type { LayoutData } from './$types'

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props()

	// Dark mode state
	let theme = $state(data.theme ?? 'system')
	let isDark = $state(false)
	let sidebarOpen = $state(false)

	// Resolve actual dark state from theme + OS preference
	$effect(() => {
		if (theme === 'dark') {
			isDark = true
		} else if (theme === 'light') {
			isDark = false
		} else {
			// system
			const mql = window.matchMedia('(prefers-color-scheme: dark)')
			isDark = mql.matches
			const handler = (e: MediaQueryListEvent) => {
				isDark = e.matches
			}
			mql.addEventListener('change', handler)
			return () => mql.removeEventListener('change', handler)
		}
	})

	async function cycleTheme() {
		const next = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system'
		theme = next
		await fetch('/api/set-theme', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ theme: next })
		})
	}

	const themeIcon = $derived(
		theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '💻'
	)
	const themeLabel = $derived(
		theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'System'
	)

	// Nav helpers
	const isAdmin = $derived(data.role === 'admin' || data.role === 'super_admin')
	const isSuperAdmin = $derived(data.role === 'super_admin')

	function isActive(path: string) {
		return $page.url.pathname === path
	}

	function closeSidebar() {
		sidebarOpen = false
	}

	const roleLabel: Record<string, string> = {
		superuser: 'Superuser',
		admin: 'Admin',
		super_admin: 'Super Admin'
	}
</script>

<div class:dark={isDark}>
	<div class="min-h-screen bg-gray-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100">

		<!-- ── TOP BAR ── -->
		<header class="fixed inset-x-0 top-0 z-50 flex h-14 items-center gap-3 bg-slate-900 dark:bg-slate-950 px-4 shadow-lg">

			<!-- Hamburger (mobile only) -->
			{#if data.user}
				<button
					type="button"
					onclick={() => (sidebarOpen = !sidebarOpen)}
					class="lg:hidden flex h-8 w-8 items-center justify-center rounded text-slate-400 hover:bg-slate-800 hover:text-white"
					aria-label="Toggle sidebar"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
					</svg>
				</button>
			{/if}

			<!-- Logo -->
			<a href="/admin" class="flex items-center gap-2 shrink-0">
				<span class="text-xs font-bold uppercase tracking-widest text-slate-400">Project Sydney</span>
				<span class="text-slate-600">/</span>
				<span class="text-sm font-bold text-white">Admin</span>
			</a>

			<div class="ml-auto flex items-center gap-2">
				{#if data.user}
					<!-- Role badge -->
					<span class="hidden sm:block rounded bg-slate-800 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
						{roleLabel[data.role ?? ''] ?? data.role}
					</span>

					<!-- Theme toggle -->
					<button
						type="button"
						onclick={cycleTheme}
						title="Theme: {themeLabel}"
						class="flex h-8 items-center gap-1.5 rounded px-2 text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition"
					>
						<span>{themeIcon}</span>
						<span class="hidden sm:block">{themeLabel}</span>
					</button>

					<!-- View site -->
					<a
						href="/"
						target="_blank"
						rel="noopener noreferrer"
						class="hidden sm:flex h-8 items-center gap-1 rounded px-2 text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition"
					>
						View Site
						<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
						</svg>
					</a>

					<!-- Logout -->
					<form method="POST" action="/admin?/logout" use:enhance>
						<button
							type="submit"
							class="flex h-8 items-center rounded px-3 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition"
						>
							Log out
						</button>
					</form>
				{/if}
			</div>
		</header>

		{#if data.user}
			<!-- ── MOBILE OVERLAY ── -->
			{#if sidebarOpen}
				<div
					class="fixed inset-0 z-40 bg-black/60 lg:hidden"
					role="button"
					tabindex="-1"
					onclick={closeSidebar}
					onkeydown={(e) => e.key === 'Escape' && closeSidebar()}
				></div>
			{/if}

			<!-- ── SIDEBAR ── -->
			<aside
				class="fixed left-0 top-14 bottom-0 z-40 w-64 bg-slate-800 dark:bg-slate-900 flex flex-col transition-transform duration-200
					{sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0"
			>
				<nav class="flex-1 overflow-y-auto px-3 py-4 space-y-1">

					<!-- Dashboard -->
					<a
						href="/admin"
						onclick={closeSidebar}
						class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition
							{isActive('/admin')
								? 'bg-slate-700 dark:bg-slate-800 text-white'
								: 'text-slate-300 hover:bg-slate-700 dark:hover:bg-slate-800 hover:text-white'}"
					>
						<svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
						</svg>
						Dashboard
					</a>

					{#if isAdmin}
						<!-- Pending -->
						<a
							href="/admin#pending"
							onclick={closeSidebar}
							class="flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition text-slate-300 hover:bg-slate-700 dark:hover:bg-slate-800 hover:text-white"
						>
							<span class="flex items-center gap-3">
								<svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								Pending Review
							</span>
						</a>
					{/if}

					<!-- Published -->
					<a
						href="/admin#published"
						onclick={closeSidebar}
						class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition text-slate-300 hover:bg-slate-700 dark:hover:bg-slate-800 hover:text-white"
					>
						<svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
						</svg>
						Published
					</a>

					<!-- Quick Add -->
					<a
						href="/admin#quickadd"
						onclick={closeSidebar}
						class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition text-slate-300 hover:bg-slate-700 dark:hover:bg-slate-800 hover:text-white"
					>
						<svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
						</svg>
						Quick Add
					</a>

					<!-- Bulk Import -->
					<a
						href="/admin/import"
						onclick={closeSidebar}
						class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition
							{isActive('/admin/import')
								? 'bg-slate-700 dark:bg-slate-800 text-white'
								: 'text-slate-300 hover:bg-slate-700 dark:hover:bg-slate-800 hover:text-white'}"
					>
						<svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
						</svg>
						Bulk Import
					</a>

					<!-- Divider -->
					<div class="my-2 border-t border-slate-700"></div>

					{#if isAdmin}
						<!-- Users -->
						<a
							href="/admin/users"
							onclick={closeSidebar}
							class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition
								{isActive('/admin/users')
									? 'bg-slate-700 dark:bg-slate-800 text-white'
									: 'text-slate-300 hover:bg-slate-700 dark:hover:bg-slate-800 hover:text-white'}"
						>
							<svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
							</svg>
							Users
						</a>
					{/if}

					<!-- Settings -->
					<a
						href="/admin/settings"
						onclick={closeSidebar}
						class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition
							{isActive('/admin/settings')
								? 'bg-slate-700 dark:bg-slate-800 text-white'
								: 'text-slate-300 hover:bg-slate-700 dark:hover:bg-slate-800 hover:text-white'}"
					>
						<svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
						</svg>
						Settings
					</a>

					<!-- Divider -->
					<div class="my-2 border-t border-slate-700"></div>

					<!-- View Site -->
					<a
						href="/"
						target="_blank"
						rel="noopener noreferrer"
						class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-700 dark:hover:bg-slate-800 hover:text-white transition"
					>
						<svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
						</svg>
						View Site ↗
					</a>
				</nav>

				<!-- Sidebar footer: user email -->
				<div class="border-t border-slate-700 px-4 py-3">
					<p class="text-xs text-slate-500 truncate">{data.user?.email}</p>
				</div>
			</aside>
		{/if}

		<!-- ── MAIN CONTENT ── -->
		<div class="{data.user ? 'lg:pl-64' : ''} pt-14 min-h-screen">
			{@render children()}
		</div>

	</div>
</div>
