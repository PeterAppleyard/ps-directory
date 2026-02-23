<script lang="ts">
	import { supabase } from '$lib/supabase'

	type RequestType = 'full_removal' | 'image_removal' | 'address_removal'

	let requestType = $state<RequestType | ''>('')
	let houseAddressOrUrl = $state('')
	let requesterName = $state('')
	let requesterEmail = $state('')
	let reason = $state('')
	let errors = $state<Record<string, string>>({})
	let submitting = $state(false)
	let submitted = $state(false)

	function validate(): boolean {
		const e: Record<string, string> = {}
		if (!requestType) e.requestType = 'Please choose a request type.'
		if (!houseAddressOrUrl.trim()) e.houseAddressOrUrl = 'Please provide the address or URL of the listing.'
		if (!requesterName.trim()) e.requesterName = 'Your name is required.'
		if (!requesterEmail.trim()) e.requesterEmail = 'Your email is required.'
		else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requesterEmail)) e.requesterEmail = 'Please enter a valid email address.'
		errors = e
		return Object.keys(e).length === 0
	}

	async function handleSubmit(e: Event) {
		e.preventDefault()
		if (submitting || submitted) return
		if (!validate()) return
		submitting = true
		errors = {}
		const { error } = await supabase.from('takedown_requests').insert({
			request_type: requestType,
			house_address: houseAddressOrUrl.trim() || null,
			requester_name: requesterName.trim(),
			requester_email: requesterEmail.trim(),
			reason: reason.trim() || null
		})
		submitting = false
		if (error) {
			errors.submit = error.message
			return
		}
		submitted = true
	}
</script>

<main class="min-h-screen bg-white">
	<section class="border-b-2 border-stone-900 bg-white px-6 py-16 md:py-24">
		<div class="mx-auto max-w-2xl">
			<p class="mb-3 text-[10px] font-bold tracking-normal text-stone-400">Removal</p>
			<h1 class="font-black text-4xl tracking-tight text-stone-900 md:text-5xl">
				Request removal
			</h1>
			<p class="mt-6 text-stone-600 leading-relaxed">
				If you are the owner or have a legitimate interest in a listed property, you can request removal or changes. We will process your request as soon as we can.
			</p>
		</div>
	</section>

	<section class="border-b-2 border-stone-900 bg-white px-6 py-12 md:py-16">
		<div class="mx-auto max-w-2xl">
			{#if submitted}
				<div class="rounded border-2 border-stone-200 bg-stone-50 px-6 py-8">
					<p class="text-[10px] font-bold tracking-normal text-stone-400">Received</p>
					<h2 class="mt-3 text-2xl font-black tracking-tight text-stone-900">
						Request received
					</h2>
					<p class="mt-4 text-stone-600 leading-relaxed">
						Thank you. We have recorded your request and will be in touch using the email you provided if we need any clarification.
					</p>
					<div class="mt-6 flex gap-4">
						<a
							href="/"
							class="inline-block border-2 border-stone-900 bg-stone-900 px-6 py-3 text-xs font-bold tracking-normal text-white transition hover:bg-white hover:text-stone-900"
						>
							Back to directory
						</a>
						<a
							href="/privacy"
							class="inline-block border-2 border-stone-300 px-6 py-3 text-xs font-bold tracking-normal text-stone-500 transition hover:border-stone-900 hover:text-stone-900"
						>
							Privacy policy
						</a>
					</div>
				</div>
			{:else}
				<form onsubmit={handleSubmit} novalidate class="space-y-8">
					<fieldset class="space-y-4">
						<legend class="w-full border-b border-stone-200 pb-2 text-[10px] font-bold tracking-normal text-stone-400">
							Type of request <span class="text-red-500">*</span>
						</legend>
						<div class="space-y-3">
							<label class="flex cursor-pointer items-start gap-3">
								<input
									type="radio"
									name="requestType"
									value="full_removal"
									bind:group={requestType}
									class="mt-1 border-stone-300 text-stone-900 focus:ring-stone-900"
								/>
								<span class="text-sm font-medium text-stone-800">Complete removal</span>
							</label>
							<p class="ml-6 text-xs text-stone-500">Remove the listing entirely from the directory.</p>
							<label class="flex cursor-pointer items-start gap-3">
								<input
									type="radio"
									name="requestType"
									value="image_removal"
									bind:group={requestType}
									class="mt-1 border-stone-300 text-stone-900 focus:ring-stone-900"
								/>
								<span class="text-sm font-medium text-stone-800">Image removal</span>
							</label>
							<p class="ml-6 text-xs text-stone-500">Keep the listing but remove all associated photos.</p>
							<label class="flex cursor-pointer items-start gap-3">
								<input
									type="radio"
									name="requestType"
									value="address_removal"
									bind:group={requestType}
									class="mt-1 border-stone-300 text-stone-900 focus:ring-stone-900"
								/>
								<span class="text-sm font-medium text-stone-800">Address removal</span>
							</label>
							<p class="ml-6 text-xs text-stone-500">Keep the listing but show suburb only (no full address).</p>
						</div>
						{#if errors.requestType}
							<p class="text-xs text-red-500">{errors.requestType}</p>
						{/if}
					</fieldset>

					<div>
						<label for="houseAddressOrUrl" class="mb-1.5 block text-xs font-bold tracking-normal text-stone-600">
							House address or URL <span class="text-red-500">*</span>
						</label>
						<input
							id="houseAddressOrUrl"
							type="text"
							bind:value={houseAddressOrUrl}
							placeholder="e.g. 42 Sample Street, Suburb or https://..."
							class="w-full border px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900 {errors.houseAddressOrUrl ? 'border-red-400 bg-red-50' : 'border-stone-300 bg-white'}"
						/>
						{#if errors.houseAddressOrUrl}
							<p class="mt-1 text-xs text-red-500">{errors.houseAddressOrUrl}</p>
						{/if}
					</div>

					<div class="grid gap-6 sm:grid-cols-2">
						<div>
							<label for="requesterName" class="mb-1.5 block text-xs font-bold tracking-normal text-stone-600">
								Your name <span class="text-red-500">*</span>
							</label>
							<input
								id="requesterName"
								type="text"
								bind:value={requesterName}
								class="w-full border px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900 {errors.requesterName ? 'border-red-400 bg-red-50' : 'border-stone-300 bg-white'}"
							/>
							{#if errors.requesterName}
								<p class="mt-1 text-xs text-red-500">{errors.requesterName}</p>
							{/if}
						</div>
						<div>
							<label for="requesterEmail" class="mb-1.5 block text-xs font-bold tracking-normal text-stone-600">
								Your email <span class="text-red-500">*</span>
							</label>
							<input
								id="requesterEmail"
								type="email"
								bind:value={requesterEmail}
								class="w-full border px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900 {errors.requesterEmail ? 'border-red-400 bg-red-50' : 'border-stone-300 bg-white'}"
							/>
							{#if errors.requesterEmail}
								<p class="mt-1 text-xs text-red-500">{errors.requesterEmail}</p>
							{/if}
						</div>
					</div>

					<div>
						<label for="reason" class="mb-1.5 block text-xs font-bold tracking-normal text-stone-600">
							Reason or additional context <span class="text-stone-400">(optional)</span>
						</label>
						<textarea
							id="reason"
							bind:value={reason}
							rows="4"
							placeholder="Any details that help us process your request..."
							class="w-full resize-y border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900"
						></textarea>
					</div>

					{#if errors.submit}
						<p class="text-sm text-red-500">{errors.submit}</p>
					{/if}

					<button
						type="submit"
						disabled={submitting}
						class="w-full border-2 border-stone-900 bg-stone-900 px-6 py-4 text-xs font-bold tracking-normal text-white transition hover:bg-white hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
					>
						{submitting ? 'Sending…' : 'Submit request'}
					</button>
				</form>
			{/if}
		</div>
	</section>
</main>
