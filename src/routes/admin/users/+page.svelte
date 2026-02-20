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

<main class="min-h-screen bg-stone-50">
	<!-- Header -->
	<div class="border-b-2 border-stone-900 bg-stone-900 px-6 py-5">
		<div class="mx-auto flex max-w-4xl items-center justify-between">
			<div>
				<p class="text-[10px] font-bold uppercase tracking-[0.35em] text-stone-500">Project Sydney</p>
				<h1 class="font-black text-2xl uppercase tracking-tight text-white">User Management</h1>
			</div>
			<a
				href="/admin"
				class="border border-stone-600 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-stone-400 transition hover:border-white hover:text-white"
			>
				← Admin
			</a>
		</div>
	</div>

	<div class="mx-auto max-w-4xl px-6 py-10 space-y-10">

		<!-- Invite form -->
		<div class="border-2 border-stone-900 bg-white p-6">
			<h2 class="mb-6 font-black text-xl uppercase tracking-tight text-stone-900">Invite User</h2>

			{#if form?.inviteSent}
				<div class="border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
					Invite sent to <strong>{form.invitedEmail}</strong>. They'll receive an email to set their password.
				</div>
			{:else}
				<form method="POST" action="?/invite" use:enhance class="flex flex-wrap gap-4">
					<div class="flex-1 min-w-[200px]">
						<label for="invite-email" class="mb-1.5 block text-xs font-bold uppercase tracking-widest text-stone-600">
							Email
						</label>
						<input
							id="invite-email"
							name="email"
							type="email"
							required
							bind:value={inviteEmail}
							placeholder="name@example.com"
							class="w-full border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900"
						/>
					</div>

					<div class="w-40">
						<label for="invite-role" class="mb-1.5 block text-xs font-bold uppercase tracking-widest text-stone-600">
							Role
						</label>
						<select
							id="invite-role"
							name="role"
							bind:value={inviteRole}
							class="w-full border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900"
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
							class="border-2 border-stone-900 bg-stone-900 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-white hover:text-stone-900"
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

		<!-- Role guide -->
		<div class="border border-stone-200 bg-white p-6">
			<h3 class="mb-4 font-black text-xs uppercase tracking-[0.25em] text-stone-400">Role Guide</h3>
			<div class="grid gap-3 sm:grid-cols-3 text-sm">
				<div>
					<p class="font-bold text-stone-900">Superuser</p>
					<p class="text-stone-500 text-xs mt-1">Quick Add, Bulk Import, edit listings</p>
				</div>
				<div>
					<p class="font-bold text-stone-900">Admin</p>
					<p class="text-stone-500 text-xs mt-1">All above + approve/reject, notification settings, add superusers</p>
				</div>
				<div>
					<p class="font-bold text-stone-900">Super Admin</p>
					<p class="text-stone-500 text-xs mt-1">All above + add admins, remove users</p>
				</div>
			</div>
		</div>

		<!-- Users list -->
		<div class="border-2 border-stone-200 bg-white">
			<div class="border-b border-stone-100 px-6 py-4">
				<h2 class="font-black text-xl uppercase tracking-tight text-stone-900">
					Team
					<span class="ml-2 text-sm font-bold text-stone-400">{data.users.length}</span>
				</h2>
			</div>

			{#if data.users.length === 0}
				<p class="px-6 py-12 text-center text-sm text-stone-400">No users yet.</p>
			{:else}
				<div class="divide-y divide-stone-100">
					{#each data.users as user (user.id)}
						<div class="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
							<div>
								<p class="font-bold text-stone-900 text-sm">{user.email}</p>
								<p class="text-[10px] font-bold uppercase tracking-widest text-stone-400 mt-0.5">
									{roleLabels[user.role] ?? user.role}
									{#if user.id === data.currentUserId}
										<span class="ml-2 text-stone-300">(you)</span>
									{/if}
								</p>
							</div>

							{#if user.id !== data.currentUserId}
								<div class="flex items-center gap-2">
									<!-- Role change -->
									<form method="POST" action="?/setRole" use:enhance class="flex items-center gap-2">
										<input type="hidden" name="user_id" value={user.id} />
										<select
											name="role"
											value={user.role}
											class="border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-600 focus:outline-none focus:ring-2 focus:ring-stone-900"
										>
											<option value="superuser">Superuser</option>
											{#if isSuperAdmin}
												<option value="admin">Admin</option>
											{/if}
										</select>
										<button
											type="submit"
											class="border border-stone-200 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-400 transition hover:border-stone-900 hover:text-stone-900"
										>
											Update
										</button>
									</form>

									<!-- Remove (super_admin only) -->
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
												class="border border-red-200 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-red-400 transition hover:border-red-500 hover:text-red-600"
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
</main>
