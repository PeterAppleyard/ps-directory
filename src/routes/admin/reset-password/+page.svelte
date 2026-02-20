<script lang="ts">
	import { enhance } from '$app/forms'
	import type { ActionData } from './$types'

	let { form }: { form: ActionData } = $props()
</script>

<main class="flex min-h-screen items-center justify-center bg-stone-50 px-6">
	<div class="w-full max-w-sm">
		<div class="mb-10">
			<p class="mb-2 text-[10px] font-bold uppercase tracking-[0.35em] text-stone-400">
				Project Sydney
			</p>
			<h1 class="font-black text-4xl uppercase tracking-tight text-stone-900">New Password</h1>
		</div>

		<form method="POST" use:enhance class="space-y-5">
			<div>
				<label
					for="password"
					class="mb-1.5 block text-xs font-bold uppercase tracking-widest text-stone-600"
				>
					New Password
				</label>
				<input
					id="password"
					name="password"
					type="password"
					required
					minlength="8"
					autocomplete="new-password"
					class="w-full border px-4 py-3 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900
						{form?.error ? 'border-red-400 bg-red-50' : 'border-stone-300 bg-white'}"
				/>
			</div>

			<div>
				<label
					for="confirm"
					class="mb-1.5 block text-xs font-bold uppercase tracking-widest text-stone-600"
				>
					Confirm Password
				</label>
				<input
					id="confirm"
					name="confirm"
					type="password"
					required
					minlength="8"
					autocomplete="new-password"
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
				Set Password
			</button>
		</form>
	</div>
</main>
