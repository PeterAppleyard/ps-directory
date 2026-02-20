<script lang="ts">
	import { enhance } from '$app/forms'
	import type { ActionData, PageData } from './$types'

	let { data, form }: { data: PageData; form: ActionData } = $props()

	// Only admins+ receive submission emails (superusers don't approve)
	const canReceiveSubmissionEmails = $derived(
		data.profile?.role === 'admin' || data.profile?.role === 'super_admin'
	)
</script>

<main class="min-h-screen bg-stone-50">
	<!-- Header -->
	<div class="border-b-2 border-stone-900 bg-stone-900 px-6 py-5">
		<div class="mx-auto flex max-w-2xl items-center justify-between">
			<div>
				<p class="text-[10px] font-bold uppercase tracking-[0.35em] text-stone-500">Project Sydney</p>
				<h1 class="font-black text-2xl uppercase tracking-tight text-white">Settings</h1>
			</div>
			<a
				href="/admin"
				class="border border-stone-600 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-stone-400 transition hover:border-white hover:text-white"
			>
				← Admin
			</a>
		</div>
	</div>

	<div class="mx-auto max-w-2xl px-6 py-10 space-y-10">

		<!-- Account info -->
		<div class="border border-stone-200 bg-white px-6 py-5">
			<p class="text-[10px] font-bold uppercase tracking-[0.25em] text-stone-400">Signed in as</p>
			<p class="mt-1 font-bold text-stone-900">{data.email}</p>
			<p class="text-xs text-stone-400 capitalize">{data.profile?.role?.replace('_', ' ')}</p>
		</div>

		<!-- Notification settings (admin+ only) -->
		{#if canReceiveSubmissionEmails}
			<div class="border-2 border-stone-900 bg-white p-6">
				<h2 class="mb-6 font-black text-xl uppercase tracking-tight text-stone-900">Email Notifications</h2>

				{#if form?.saved}
					<div class="mb-6 border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
						Settings saved.
					</div>
				{/if}

				<form method="POST" action="?/saveNotifications" use:enhance class="space-y-5">
					<label class="flex cursor-pointer items-start gap-4">
						<input
							type="checkbox"
							name="email_on_new_submission"
							checked={data.profile?.email_on_new_submission}
							class="mt-0.5 h-4 w-4 border-stone-300 text-stone-900 focus:ring-stone-900"
						/>
						<div>
							<p class="font-bold text-sm text-stone-900">New submission alert</p>
							<p class="text-xs text-stone-400 mt-0.5">
								Email me when someone submits a new house for review.
							</p>
						</div>
					</label>

					<label class="flex cursor-pointer items-start gap-4">
						<input
							type="checkbox"
							name="email_on_approval"
							checked={data.profile?.email_on_approval}
							class="mt-0.5 h-4 w-4 border-stone-300 text-stone-900 focus:ring-stone-900"
						/>
						<div>
							<p class="font-bold text-sm text-stone-900">Approval confirmation</p>
							<p class="text-xs text-stone-400 mt-0.5">
								Email me when a listing is approved or rejected (for records).
							</p>
						</div>
					</label>

					{#if form?.error}
						<p class="text-sm text-red-500">{form.error}</p>
					{/if}

					<button
						type="submit"
						class="border-2 border-stone-900 bg-stone-900 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-white hover:text-stone-900"
					>
						Save Preferences
					</button>
				</form>
			</div>
		{/if}

		<!-- Change password -->
		<div class="border-2 border-stone-200 bg-white p-6">
			<h2 class="mb-6 font-black text-xl uppercase tracking-tight text-stone-900">Change Password</h2>

			{#if form?.passwordSaved}
				<div class="border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
					Password updated successfully.
				</div>
			{:else}
				<form method="POST" action="?/changePassword" use:enhance class="space-y-5">
					<div>
						<label for="password" class="mb-1.5 block text-xs font-bold uppercase tracking-widest text-stone-600">
							New Password
						</label>
						<input
							id="password"
							name="password"
							type="password"
							required
							minlength="8"
							autocomplete="new-password"
							class="w-full border px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900
								{form?.passwordError ? 'border-red-400 bg-red-50' : 'border-stone-300 bg-white'}"
						/>
					</div>

					<div>
						<label for="confirm" class="mb-1.5 block text-xs font-bold uppercase tracking-widest text-stone-600">
							Confirm Password
						</label>
						<input
							id="confirm"
							name="confirm"
							type="password"
							required
							minlength="8"
							autocomplete="new-password"
							class="w-full border px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900
								{form?.passwordError ? 'border-red-400 bg-red-50' : 'border-stone-300 bg-white'}"
						/>
						{#if form?.passwordError}
							<p class="mt-1.5 text-xs text-red-500">{form.passwordError}</p>
						{/if}
					</div>

					<button
						type="submit"
						class="border-2 border-stone-900 bg-stone-900 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-white hover:text-stone-900"
					>
						Update Password
					</button>
				</form>
			{/if}
		</div>
	</div>
</main>
