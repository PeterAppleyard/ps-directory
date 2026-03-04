<script lang="ts">
	import './layout.css'
	import favicon from '$lib/assets/favicon.svg'
	import { page, navigating } from '$app/stores'

	let { children, data } = $props()

	const navLinks = [
		{ href: '/', label: 'Home' },
		{ href: '/map', label: 'Map' },
		{ href: '/about', label: 'About' },
		{ href: '/submit', label: 'Submit' }
	]

	// Navigation progress bar
	let progressWidth = $state(0)
	let progressVisible = $state(false)

	$effect(() => {
		if ($navigating) {
			progressVisible = true
			progressWidth = 0
			// Small delay so the transition fires
			setTimeout(() => { progressWidth = 80 }, 30)
		} else if (progressVisible) {
			progressWidth = 100
			setTimeout(() => {
				progressVisible = false
				progressWidth = 0
			}, 250)
		}
	})
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>PS Archive — A Pettit &amp; Sevitt Directory</title>
	<!-- TODO: REMOVE BEFORE LAUNCH — site is work in progress, dummy content present -->
	<meta name="robots" content="noindex, nofollow" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href="https://fonts.googleapis.com/css2?family=Inter:wght@100;200&family=Oswald:wght@400;500;600;700&family=Rethink+Sans:ital,wght@0,400..800;1,400..800&display=swap" rel="stylesheet" />
</svelte:head>

<!-- Navigation progress bar -->
{#if progressVisible}
	<div
		class="fixed top-0 left-0 z-50 h-[2px] bg-stone-900"
		style="width: {progressWidth}%; transition: width {progressWidth === 100 ? 200 : 1400}ms {progressWidth === 100 ? 'ease-in' : 'ease-out'}"
	></div>
{/if}

<div class="flex min-h-screen flex-col">
	{#if !$page.url.pathname.startsWith('/admin')}
	<header class="border-b-2 border-stone-900 bg-[#faf2e5]">
		<div class="flex items-center justify-between px-8 py-5">
			<!-- Logo -->
			<a href="/" class="flex flex-col gap-1 transition-opacity hover:opacity-70">
				<img src="/images/psa-logo.svg" alt="PS Archive" height="41" class="h-[41px] w-auto" />
				<span class="text-[10px] font-bold tracking-normal text-stone-400 text-center">Pettit &amp; Sevitt Archive</span>
			</a>

			<!-- Nav -->
			<nav aria-label="Main navigation">
				<ul class="flex items-center gap-8">
					{#each navLinks as link}
						<li>
							<a
								href={link.href}
								class="text-[10px] font-bold tracking-normal transition-colors
									{$page.url.pathname === link.href
										? 'text-accent underline underline-offset-4 decoration-2 decoration-accent'
										: 'text-stone-400 hover:text-stone-900'}"
							>
								{link.label}
							</a>
						</li>
					{/each}
					{#if data.user}
						<li>
							<a
								href="/admin"
								class="text-[10px] font-bold tracking-normal transition-colors
									{$page.url.pathname.startsWith('/admin')
										? 'text-accent underline underline-offset-4 decoration-2 decoration-accent'
										: 'text-stone-400 hover:text-stone-900'}"
							>
								Admin
							</a>
						</li>
					{/if}
				</ul>
			</nav>
		</div>
	</header>
	{/if}

	<div class="flex-1">
		{@render children()}
	</div>

	{#if !$page.url.pathname.startsWith('/admin')}
	<footer class="border-t-2 border-stone-900 bg-white px-6 py-8">
		<div class="mx-auto flex max-w-6xl items-center justify-between">
			<p class="text-[10px] tracking-normal text-stone-400">
				PS Archive
			</p>
			<div class="flex gap-6">
				<a href="/know-a-property" class="text-[10px] tracking-normal text-stone-400 hover:text-stone-900 transition-colors">
					Know a property?
				</a>
				<a href="/privacy" class="text-[10px] tracking-normal text-stone-400 hover:text-stone-900 transition-colors">
					Privacy policy
				</a>
				<a href="/takedown" class="text-[10px] tracking-normal text-stone-400 hover:text-stone-900 transition-colors">
					Request removal
				</a>
			</div>
			<p class="text-[10px] tracking-normal text-stone-400">
				A Pettit &amp; Sevitt Archive
			</p>
		</div>
	</footer>
	{/if}
</div>
