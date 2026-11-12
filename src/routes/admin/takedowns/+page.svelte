<script lang="ts">
	import { enhance } from '$app/forms'
	import type { ActionData, PageData } from './$types'

	let { data, form }: { data: PageData; form: ActionData } = $props()

	const labels: Record<string, string> = {
		full_removal: 'Remove listing',
		image_removal: 'Remove images',
		address_removal: 'Hide address'
	}

	let showResolved = $state(false)
	const open = $derived(data.requests.filter((r) => r.status !== 'resolved'))
	const visible = $derived(showResolved ? data.requests : open)

	const formatDate = (iso: string) =>
		new Date(iso).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })
</script>

<div class="mx-auto max-w-3xl p-4 sm:p-6 space-y-6">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="text-xl font-bold text-gray-900 dark:text-white">Takedown Requests</h1>
			<p class="mt-1 text-sm text-gray-500 dark:text-slate-400">
				{open.length} open · requests from owners to remove or change a listing
			</p>
		</div>
		<label class="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
			<input type="checkbox" bind:checked={showResolved} class="rounded border-gray-300" />
			Show resolved
		</label>
	</div>

	{#if form?.error}
		<p class="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{form.error}</p>
	{/if}

	{#if visible.length === 0}
		<div class="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-10 text-center text-sm text-gray-500 dark:text-slate-400">
			{showResolved ? 'No takedown requests yet.' : 'No open requests.'}
		</div>
	{:else}
		<ul class="space-y-4">
			{#each visible as req (req.id)}
				<li class="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
					<div class="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 dark:border-slate-700 px-5 py-3">
						<div class="min-w-0">
							<p class="text-sm font-semibold text-gray-900 dark:text-white break-words">
								{req.house_address ?? req.house_url ?? '(no listing given)'}
							</p>
							<p class="mt-0.5 text-xs text-gray-500 dark:text-slate-400">
								{labels[req.request_type] ?? req.request_type} · {formatDate(req.created_at)}
							</p>
						</div>
						<span
							class="rounded px-2 py-0.5 text-xs font-medium
								{req.status === 'resolved'
									? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
									: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'}"
						>
							{req.status === 'resolved' ? 'Resolved' : 'Open'}
						</span>
					</div>
					<div class="space-y-3 px-5 py-4 text-sm">
						<p class="text-gray-700 dark:text-slate-300">
							<span class="font-medium">{req.requester_name}</span> ·
							<a href="mailto:{req.requester_email}" class="underline underline-offset-2">{req.requester_email}</a>
						</p>
						{#if req.reason}
							<p class="whitespace-pre-wrap text-gray-600 dark:text-slate-400">{req.reason}</p>
						{/if}
						<form method="POST" action="?/setStatus" use:enhance>
							<input type="hidden" name="id" value={req.id} />
							<input type="hidden" name="status" value={req.status === 'resolved' ? 'pending' : 'resolved'} />
							<button
								type="submit"
								class="rounded-md border border-gray-300 dark:border-slate-600 px-4 py-2 text-xs font-medium text-gray-700 dark:text-slate-300 transition hover:bg-gray-50 dark:hover:bg-slate-700"
							>
								{req.status === 'resolved' ? 'Reopen' : 'Mark resolved'}
							</button>
						</form>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>
