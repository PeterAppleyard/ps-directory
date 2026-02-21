<script lang="ts">
	import { enhance } from '$app/forms'
	import type { ActionData, PageData } from './$types'

	let { data, form }: { data: PageData; form: ActionData } = $props()

	const canReceiveSubmissionEmails = $derived(
		data.profile?.role === 'admin' || data.profile?.role === 'super_admin'
	)

	const roleLabels: Record<string, string> = {
		superuser: 'Superuser',
		admin: 'Admin',
		super_admin: 'Super Admin'
	}

	const themeOptions = [
		{ value: 'system', label: 'System default', icon: '💻', description: 'Follows your OS dark/light setting' },
		{ value: 'light', label: 'Light', icon: '☀️', description: 'Always use light mode' },
		{ value: 'dark', label: 'Dark', icon: '🌙', description: 'Always use dark mode' }
	]

	const frequencyOptions = [
		{ value: 'instant', label: 'Instant', description: 'Email immediately on each new submission' },
		{ value: 'daily', label: 'Daily digest', description: 'One email per day with all new submissions' },
		{ value: 'none', label: 'None', description: 'No submission emails (can still see in admin)' }
	]
</script>

<div class="mx-auto max-w-2xl p-4 sm:p-6 space-y-6">

	<!-- Page title -->
	<div>
		<h1 class="text-xl font-bold text-gray-900 dark:text-white">Settings</h1>
		<p class="mt-1 text-sm text-gray-500 dark:text-slate-400">Manage your account preferences and notifications</p>
	</div>

	<!-- Account card -->
	<div class="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
		<div class="border-b border-gray-100 dark:border-slate-700 px-5 py-3">
			<h2 class="text-sm font-semibold text-gray-700 dark:text-slate-300">Account</h2>
		</div>
		<div class="px-5 py-4 flex items-center justify-between">
			<div>
				<p class="text-sm font-medium text-gray-900 dark:text-white">{data.email}</p>
				<p class="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
					{roleLabels[data.profile?.role ?? ''] ?? data.profile?.role}
				</p>
			</div>
			<span class="rounded-full bg-indigo-100 dark:bg-indigo-900/40 px-3 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-400">
				{roleLabels[data.profile?.role ?? ''] ?? 'User'}
			</span>
		</div>
	</div>

	<!-- Appearance card -->
	<div class="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
		<div class="border-b border-gray-100 dark:border-slate-700 px-5 py-3">
			<h2 class="text-sm font-semibold text-gray-700 dark:text-slate-300">Appearance</h2>
		</div>
		<div class="px-5 py-4">
			{#if form?.themeSaved}
				<div class="mb-4 rounded-md border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-4 py-2.5 text-sm text-green-700 dark:text-green-400">
					Theme saved.
				</div>
			{/if}
			<form method="POST" action="?/saveTheme" use:enhance class="space-y-3">
				<p class="text-xs font-medium text-gray-600 dark:text-slate-400 mb-3">Admin panel theme</p>
				<div class="grid grid-cols-3 gap-3">
					{#each themeOptions as opt}
						<label class="relative cursor-pointer">
							<input
								type="radio"
								name="theme"
								value={opt.value}
								checked={data.profile?.theme === opt.value || (!data.profile?.theme && opt.value === 'system')}
								class="peer sr-only"
							/>
							<div class="rounded-lg border-2 p-3 text-center transition
								peer-checked:border-indigo-600 peer-checked:bg-indigo-50 dark:peer-checked:bg-indigo-900/20
								border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500">
								<span class="block text-xl">{opt.icon}</span>
								<span class="mt-1 block text-xs font-medium text-gray-700 dark:text-slate-300">{opt.label}</span>
							</div>
						</label>
					{/each}
				</div>
				<p class="text-xs text-gray-400 dark:text-slate-500">
					You can also toggle the theme quickly using the button in the top bar.
				</p>
				<button
					type="submit"
					class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
				>
					Save Theme
				</button>
			</form>
		</div>
	</div>

	<!-- Notification settings (admin+ only) -->
	{#if canReceiveSubmissionEmails}
		<div class="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
			<div class="border-b border-gray-100 dark:border-slate-700 px-5 py-3">
				<h2 class="text-sm font-semibold text-gray-700 dark:text-slate-300">Email Notifications</h2>
			</div>
			<div class="px-5 py-4">
				{#if form?.saved}
					<div class="mb-4 rounded-md border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-4 py-2.5 text-sm text-green-700 dark:text-green-400">
						Notification preferences saved.
					</div>
				{/if}

				<form method="POST" action="?/saveNotifications" use:enhance class="space-y-5">

					<!-- Frequency selector -->
					<div>
						<p class="mb-3 text-xs font-medium text-gray-600 dark:text-slate-400">New submission frequency</p>
						<div class="space-y-2">
							{#each frequencyOptions as opt}
								<label class="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 dark:border-slate-600 p-3 transition hover:bg-gray-50 dark:hover:bg-slate-700">
									<input
										type="radio"
										name="notification_frequency"
										value={opt.value}
										checked={data.profile?.notification_frequency === opt.value || (!data.profile?.notification_frequency && opt.value === 'instant')}
										class="mt-0.5 h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
									/>
									<div>
										<p class="text-sm font-medium text-gray-900 dark:text-white">{opt.label}</p>
										<p class="text-xs text-gray-400 dark:text-slate-500">{opt.description}</p>
									</div>
								</label>
							{/each}
						</div>
					</div>

					<!-- Toggle switches -->
					<div class="space-y-3 border-t border-gray-100 dark:border-slate-700 pt-4">
						<p class="text-xs font-medium text-gray-600 dark:text-slate-400">Additional alerts</p>

						<label class="flex cursor-pointer items-start gap-4">
							<input
								type="checkbox"
								name="email_on_new_submission"
								checked={data.profile?.email_on_new_submission}
								class="mt-0.5 h-4 w-4 rounded border-gray-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
							/>
							<div>
								<p class="text-sm font-medium text-gray-900 dark:text-white">New submission alert</p>
								<p class="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
									Email me when someone submits a new house for review.
								</p>
							</div>
						</label>

						<label class="flex cursor-pointer items-start gap-4">
							<input
								type="checkbox"
								name="email_on_approval"
								checked={data.profile?.email_on_approval}
								class="mt-0.5 h-4 w-4 rounded border-gray-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
							/>
							<div>
								<p class="text-sm font-medium text-gray-900 dark:text-white">Approval confirmation</p>
								<p class="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
									Email me when a listing is approved or rejected (for records).
								</p>
							</div>
						</label>
					</div>

					{#if form?.error}
						<p class="text-sm text-red-500">{form.error}</p>
					{/if}

					<button
						type="submit"
						class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
					>
						Save Preferences
					</button>
				</form>
			</div>
		</div>
	{/if}

	<!-- Change password -->
	<div class="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
		<div class="border-b border-gray-100 dark:border-slate-700 px-5 py-3">
			<h2 class="text-sm font-semibold text-gray-700 dark:text-slate-300">Change Password</h2>
		</div>
		<div class="px-5 py-4">
			{#if form?.passwordSaved}
				<div class="rounded-md border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-4 py-2.5 text-sm text-green-700 dark:text-green-400">
					Password updated successfully.
				</div>
			{:else}
				<form method="POST" action="?/changePassword" use:enhance class="space-y-4">
					<div>
						<label for="password" class="mb-1.5 block text-xs font-medium text-gray-600 dark:text-slate-400">
							New Password
						</label>
						<input
							id="password"
							name="password"
							type="password"
							required
							minlength="8"
							autocomplete="new-password"
							class="w-full rounded-md border px-4 py-2.5 text-sm text-gray-900 dark:text-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500
								{form?.passwordError ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-slate-600 bg-white'}"
						/>
					</div>

					<div>
						<label for="confirm" class="mb-1.5 block text-xs font-medium text-gray-600 dark:text-slate-400">
							Confirm Password
						</label>
						<input
							id="confirm"
							name="confirm"
							type="password"
							required
							minlength="8"
							autocomplete="new-password"
							class="w-full rounded-md border px-4 py-2.5 text-sm text-gray-900 dark:text-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500
								{form?.passwordError ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-slate-600 bg-white'}"
						/>
						{#if form?.passwordError}
							<p class="mt-1.5 text-xs text-red-500">{form.passwordError}</p>
						{/if}
					</div>

					<button
						type="submit"
						class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
					>
						Update Password
					</button>
				</form>
			{/if}
		</div>
	</div>
</div>
