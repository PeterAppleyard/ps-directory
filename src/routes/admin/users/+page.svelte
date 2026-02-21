<script lang="ts">
	import { enhance } from '$app/forms'
	import type { ActionData, PageData } from './$types'

	let { data, form }: { data: PageData; form: ActionData } = $props()

	const isSuperAdmin = $derived(data.currentRole === 'super_admin')

	const roleLabels: Record<string, string> = {
		superuser: 'Superuser',
		admin: 'Admin',
		super_admin: 'Super Admin'
	}

	let inviteEmail = $state('')
	let inviteRole = $state('superuser')
</script>

<div class="mx-auto max-w-3xl p-4 sm:p-6 space-y-6">

	<!-- Page title -->
	<div>
		<h1 class="text-xl font-bold text-gray-900 dark:text-white">User Management</h1>
		<p class="mt-1 text-sm text-gray-500 dark:text-slate-400">Invite and manage admin team members</p>
	</div>

	<!-- Invite card -->
	<div class="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
		<div class="border-b border-gray-100 dark:border-slate-700 px-5 py-3">
			<h2 class="text-sm font-semibold text-gray-700 dark:text-slate-300">Invite User</h2>
		</div>
		<div class="px-5 py-4">
			{#if form?.inviteSent}
				<div class="rounded-md border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-4 py-3 text-sm text-green-700 dark:text-green-400">
					Invite sent to <strong>{form.invitedEmail}</strong>. They'll receive an email to set their password.
				</div>
			{:else}
				<form method="POST" action="?/invite" use:enhance class="flex flex-wrap gap-4">
					<div class="flex-1 min-w-[200px]">
						<label for="invite-email" class="mb-1.5 block text-xs font-medium text-gray-600 dark:text-slate-400">
							Email
						</label>
						<input
							id="invite-email"
							name="email"
							type="email"
							required
							bind:value={inviteEmail}
							placeholder="name@example.com"
							class="w-full rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
						/>
					</div>

					<div class="w-40">
						<label for="invite-role" class="mb-1.5 block text-xs font-medium text-gray-600 dark:text-slate-400">
							Role
						</label>
						<select
							id="invite-role"
							name="role"
							bind:value={inviteRole}
							class="w-full rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
						>
							<option value="superuser">Superuser</option>
							{#if isSuperAdmin}
								<option value="admin">Admin</option>
							{/if}
						</select>
					</div>

					<div class="flex items-end">
						<button
							type="submit"
							class="rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
						>
							Send Invite
						</button>
					</div>

					{#if form?.error}
						<p class="w-full text-sm text-red-500">{form.error}</p>
					{/if}
				</form>
			{/if}
		</div>
	</div>

	<!-- Role guide -->
	<div class="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
		<div class="border-b border-gray-100 dark:border-slate-700 px-5 py-3">
			<h2 class="text-sm font-semibold text-gray-700 dark:text-slate-300">Role Guide</h2>
		</div>
		<div class="grid gap-4 p-5 sm:grid-cols-3">
			<div class="rounded-md bg-gray-50 dark:bg-slate-900/50 p-3">
				<span class="inline-block rounded bg-slate-200 dark:bg-slate-700 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Superuser</span>
				<p class="text-xs text-gray-500 dark:text-slate-400">Quick Add, Bulk Import, edit listings</p>
			</div>
			<div class="rounded-md bg-gray-50 dark:bg-slate-900/50 p-3">
				<span class="inline-block rounded bg-indigo-100 dark:bg-indigo-900/40 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-400 mb-2">Admin</span>
				<p class="text-xs text-gray-500 dark:text-slate-400">All above + approve/reject, notifications, add superusers</p>
			</div>
			<div class="rounded-md bg-gray-50 dark:bg-slate-900/50 p-3">
				<span class="inline-block rounded bg-purple-100 dark:bg-purple-900/40 px-2 py-0.5 text-xs font-semibold text-purple-700 dark:text-purple-400 mb-2">Super Admin</span>
				<p class="text-xs text-gray-500 dark:text-slate-400">All above + add admins, remove users</p>
			</div>
		</div>
	</div>

	<!-- Team list -->
	<div class="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
		<div class="border-b border-gray-100 dark:border-slate-700 px-5 py-3 flex items-center justify-between">
			<h2 class="text-sm font-semibold text-gray-700 dark:text-slate-300">Team</h2>
			<span class="rounded-full bg-gray-100 dark:bg-slate-700 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:text-slate-400">
				{data.users.length}
			</span>
		</div>

		{#if data.users.length === 0}
			<p class="px-5 py-12 text-center text-sm text-gray-400 dark:text-slate-500">No users yet.</p>
		{:else}
			<div class="divide-y divide-gray-100 dark:divide-slate-700">
				{#each data.users as user (user.id)}
					<div class="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
						<div>
							<p class="text-sm font-medium text-gray-900 dark:text-white">{user.email}</p>
							<p class="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
								{roleLabels[user.role] ?? user.role}
								{#if user.id === data.currentUserId}
									<span class="ml-2 text-gray-300 dark:text-slate-600">(you)</span>
								{/if}
							</p>
						</div>

						{#if user.id !== data.currentUserId}
							<div class="flex items-center gap-2">
								<form method="POST" action="?/setRole" use:enhance class="flex items-center gap-2">
									<input type="hidden" name="user_id" value={user.id} />
									<select
										name="role"
										value={user.role}
										class="rounded-md border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-gray-600 dark:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
									>
										<option value="superuser">Superuser</option>
										{#if isSuperAdmin}
											<option value="admin">Admin</option>
										{/if}
									</select>
									<button
										type="submit"
										class="rounded border border-gray-200 dark:border-slate-600 px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-slate-400 transition hover:border-indigo-400 hover:text-indigo-600"
									>
										Update
									</button>
								</form>

								{#if isSuperAdmin}
									<form
										method="POST"
										action="?/removeUser"
										use:enhance
										onsubmit={(e) => { if (!confirm(`Remove ${user.email}?`)) e.preventDefault() }}
									>
										<input type="hidden" name="user_id" value={user.id} />
										<button
											type="submit"
											class="rounded border border-red-200 dark:border-red-800 px-3 py-1.5 text-xs font-medium text-red-400 dark:text-red-500 transition hover:border-red-400 hover:text-red-600"
										>
											Remove
										</button>
									</form>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
