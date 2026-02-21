<script lang="ts">
	import './layout.css'
	import favicon from '$lib/assets/favicon.svg'
	import { page, navigating } from '$app/stores'

	let { children } = $props()

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
	<title>Project Sydney — A Pettit &amp; Sevitt Directory</title>
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
	<header class="border-b-2 border-stone-900 bg-white">
		<div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
			<!-- Wordmark -->
			<a href="/" class="flex flex-col leading-none group">
				<span class="text-[9px] font-bold uppercase tracking-[0.35em] text-stone-400 group-hover:text-stone-600 transition-colors">
					Project
				</span>
				<span class="text-2xl font-black uppercase tracking-tight text-stone-900">
					Sydney
				</span>
			</a>

			<!-- Nav -->
			<nav aria-label="Main navigation">
				<ul class="flex items-center gap-8">
					{#each navLinks as link}
						<li>
							<a
								href={link.href}
							class="text-[10px] font-bold uppercase tracking-[0.25em] transition-colors
								{$page.url.pathname === link.href
									? 'text-accent underline underline-offset-4 decoration-2 decoration-accent'
									: 'text-stone-400 hover:text-stone-900'}"
							>
								{link.label}
							</a>
						</li>
					{/each}
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
			<p class="text-[10px] uppercase tracking-[0.3em] text-stone-400">
				Project Sydney
			</p>
			<p class="text-[10px] uppercase tracking-[0.3em] text-stone-400">
				A Pettit &amp; Sevitt Archive
			</p>
		</div>
	</footer>
	{/if}
</div>
