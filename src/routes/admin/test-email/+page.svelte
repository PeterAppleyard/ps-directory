<script lang="ts">
	import { enhance } from '$app/forms'
	import type { PageData, ActionData } from './$types'

	let { data, form }: { data: PageData; form: ActionData } = $props()
	let sending = $state(false)
</script>

<div class="p-6 max-w-xl">
	<div class="mb-6">
		<a href="/admin/settings" class="text-xs text-slate-400 hover:text-slate-200 transition">← Settings</a>
	</div>

	<h1 class="text-xl font-bold text-slate-100 mb-1">Email Test</h1>
	<p class="text-sm text-slate-400 mb-8">Send a test email to verify your Resend configuration is working end-to-end.</p>

	<!-- Config summary -->
	<div class="rounded-lg border border-slate-700 bg-slate-800 p-4 mb-8 space-y-2">
		<p class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Current Config</p>

		<div class="flex items-center justify-between">
			<span class="text-xs text-slate-400">API Key</span>
			{#if data.apiKeySet}
				<span class="text-xs font-mono text-green-400">{data.apiKeyHint} ✓</span>
			{:else}
				<span class="text-xs text-red-400 font-semibold">NOT SET</span>
			{/if}
		</div>

		<div class="flex items-center justify-between">
			<span class="text-xs text-slate-400">From address</span>
			{#if data.fromEmail}
				<span class="text-xs font-mono text-slate-200">{data.fromEmail}</span>
			{:else}
				<span class="text-xs text-red-400 font-semibold">NOT SET</span>
			{/if}
		</div>
	</div>

	<!-- Send form -->
	<form
		method="POST"
		action="?/send"
		use:enhance={() => {
			sending = true
			return async ({ update }) => {
				await update()
				sending = false
			}
		}}
		class="space-y-4"
	>
		<div>
			<label for="to" class="block text-xs font-semibold text-slate-300 mb-1.5">Send test to</label>
			<input
				id="to"
				name="to"
				type="email"
				required
				placeholder="you@example.com"
				value={form?.to ?? ''}
				class="w-full rounded bg-slate-700 border border-slate-600 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400"
			/>
		</div>

		<button
			type="submit"
			disabled={sending || !data.apiKeySet}
			class="w-full rounded bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
		>
			{sending ? 'Sending…' : 'Send Test Email'}
		</button>
	</form>

	<!-- Result -->
	{#if form?.sent}
		<div class="mt-6 rounded-lg border border-green-700 bg-green-950 p-4">
			<p class="text-sm font-semibold text-green-400 mb-1">Sent successfully</p>
			<p class="text-xs text-green-300">To: <span class="font-mono">{form.to}</span></p>
			{#if form.messageId}
				<p class="text-xs text-green-300 mt-1">Resend message ID: <span class="font-mono">{form.messageId}</span></p>
			{/if}
			<p class="text-xs text-green-500 mt-2">Check your inbox — if it doesn't arrive within 2 minutes, check the Resend dashboard → Emails for delivery status.</p>
		</div>
	{/if}

	{#if form?.error}
		<div class="mt-6 rounded-lg border border-red-700 bg-red-950 p-4">
			<p class="text-sm font-semibold text-red-400 mb-1">Send failed</p>
			<p class="text-xs text-red-300">{form.error}</p>
			{#if form.resendError}
				<pre class="mt-2 text-[11px] text-red-400 whitespace-pre-wrap break-all overflow-auto">{form.resendError}</pre>
			{/if}
		</div>
	{/if}
</div>
