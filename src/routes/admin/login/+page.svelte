<script lang="ts">
	import { enhance } from '$app/forms'
	import type { ActionData, PageData } from './$types'

	let { data, form }: { data: PageData; form: ActionData } = $props()

	let mode = $state<'login' | 'forgot'>('login')
</script>

<main class="flex min-h-screen items-center justify-center bg-stone-50 px-6">
	<div class="w-full max-w-sm">
		<!-- Header -->
		<div class="mb-10">
			<p class="mb-2 text-[10px] font-bold uppercase tracking-[0.35em] text-stone-400">
				Project Sydney
			</p>
			<h1 class="font-black text-4xl uppercase tracking-tight text-stone-900">
				{mode === 'login' ? 'Sign In' : 'Reset Password'}
			</h1>
		</div>

		{#if data.linkExpired}
			<div class="mb-6 border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-700">
				That link has expired. Request a new one below.
			</div>
		{/if}

		{#if mode === 'login'}
			<!-- ── Login form ── -->
			<form method="POST" action="?/login" use:enhance class="space-y-5">
				<div>
					<label
						for="email"
						class="mb-1.5 block text-xs font-bold uppercase tracking-widest text-stone-600"
					>
						Email
					</label>
					<input
						id="email"
						name="email"
						type="email"
						required
						autocomplete="email"
						class="w-full border px-4 py-3 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900
							{form?.error ? 'border-red-400 bg-red-50' : 'border-stone-300 bg-white'}"
					/>
				</div>

				<div>
					<label
						for="password"
						class="mb-1.5 block text-xs font-bold uppercase tracking-widest text-stone-600"
					>
						Password
					</label>
					<input
						id="password"
						name="password"
						type="password"
						required
						autocomplete="current-password"
						class="w-full border px-4 py-3 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900
							{form?.error ? 'border-red-400 bg-red-50' : 'border-stone-300 bg-white'}"
					/>
					{#if form?.error}
						<p class="mt-1.5 text-xs text-red-500">{form.error}</p>
					{/if}
				</div>

				<button
					type="submit"
					class="w-full border-2 border-stone-900 bg-stone-900 px-6 py-4 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-white hover:text-stone-900"
				>
					Sign In
				</button>
			</form>

			<button
				type="button"
				onclick={() => (mode = 'forgot')}
				class="mt-6 w-full text-center text-xs text-stone-400 underline hover:text-stone-900"
			>
				Forgot password?
			</button>

		{:else}
			<!-- ── Forgot password form ── -->
			{#if form?.forgotSent}
				<div class="border-2 border-stone-900 p-8 text-center">
					<p class="text-[10px] font-bold uppercase tracking-[0.3em] text-stone-400">Check your inbox</p>
					<p class="mt-3 text-sm text-stone-600">
						If that email is registered, a reset link is on its way.
					</p>
				</div>
			{:else}
				<form method="POST" action="?/forgotPassword" use:enhance class="space-y-5">
					<div>
						<label
							for="forgot-email"
							class="mb-1.5 block text-xs font-bold uppercase tracking-widest text-stone-600"
						>
							Email
						</label>
						<input
							id="forgot-email"
							name="email"
							type="email"
							required
							autocomplete="email"
							class="w-full border px-4 py-3 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900
								{form?.forgotError ? 'border-red-400 bg-red-50' : 'border-stone-300 bg-white'}"
						/>
						{#if form?.forgotError}
							<p class="mt-1.5 text-xs text-red-500">{form.forgotError}</p>
						{/if}
					</div>

					<button
						type="submit"
						class="w-full border-2 border-stone-900 bg-stone-900 px-6 py-4 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-white hover:text-stone-900"
					>
						Send Reset Link
					</button>
				</form>
			{/if}

			<button
				type="button"
				onclick={() => (mode = 'login')}
				class="mt-6 w-full text-center text-xs text-stone-400 underline hover:text-stone-900"
			>
				Back to sign in
			</button>
		{/if}
	</div>
</main>
