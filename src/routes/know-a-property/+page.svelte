<script lang="ts">
	import { supabase } from '$lib/supabase'
	import type { House } from '$lib/types'

	let { data }: { data: { house: House | null } } = $props()

	const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

	// House from URL param (?house=id) is passed via data.house
	const prefilledHouse = $derived(data.house)
	let foundHouse = $state<House | null>(null)
	let ignorePrefill = $state(false) // true when user clicked "Choose a different property"
	const theHouse = $derived(ignorePrefill ? foundHouse : (prefilledHouse ?? foundHouse))

	let urlInput = $state('')
	let findError = $state('')
	let loading = $state(false)

	let authorName = $state('')
	let storyText = $state('')
	let periodOrContext = $state('')
	let formErrors = $state<Record<string, string>>({})
	let formSubmitting = $state(false)
	let formSubmitted = $state(false)

	function extractHouseId(input: string): string | null {
		const trimmed = input.trim()
		// Match UUID in path like /house/abc-123-def-...
		const match = trimmed.match(UUID_REGEX)
		return match ? match[0] : null
	}

	async function findProperty() {
		const id = extractHouseId(urlInput)
		if (!id) {
			findError = 'Paste the full link to a property page (e.g. …/house/…) and we’ll find it.'
			return
		}
		findError = ''
		loading = true
		const { data, error } = await supabase
			.from('houses')
			.select('*')
			.eq('id', id)
			.eq('status', 'published')
			.single()
		loading = false
		if (error || !data) {
			findError = 'We couldn’t find that property. Check the link or open it from the directory.'
			foundHouse = null
			return
		}
		foundHouse = data as House
	}

	async function submitStory(e: Event) {
		e.preventDefault()
		if (!theHouse || formSubmitting || formSubmitted) return
		const err: Record<string, string> = {}
		if (!authorName.trim()) err.authorName = 'Please enter your name.'
		if (!storyText.trim()) err.storyText = 'Please share your story.'
		formErrors = err
		if (Object.keys(err).length > 0) return
		formSubmitting = true
		const { error } = await supabase.from('property_stories').insert({
			house_id: theHouse.id,
			author_name: authorName.trim(),
			story: storyText.trim(),
			period_or_context: periodOrContext.trim() || null
		})
		formSubmitting = false
		if (error) {
			formErrors = { submit: error.message }
			return
		}
		formSubmitted = true
	}
</script>

<main class="min-h-screen bg-white">
	<section class="border-b-2 border-stone-900 bg-white px-6 py-16 md:py-24">
		<div class="mx-auto max-w-2xl">
			<p class="mb-3 text-[10px] font-bold tracking-normal text-stone-400">Stories</p>
			<h1 class="font-black text-4xl tracking-tight text-stone-900 md:text-5xl">
				Know a property?
			</h1>
			<p class="mt-6 text-stone-600 leading-relaxed">
				We’d love to hear what you know — or your experiences living, visiting, or building. Paste the link to a property page below, or use the <strong>Share your story</strong> button on any listing.
			</p>
		</div>
	</section>

	<section class="border-b-2 border-stone-900 bg-white px-6 py-12 md:py-16">
		<div class="mx-auto max-w-2xl">
			{#if !theHouse && !formSubmitted}
				<div>
					<label for="property-url" class="mb-1.5 block text-xs font-bold tracking-normal text-stone-600">
						Link to the property page
					</label>
					<div class="flex gap-3">
						<input
							id="property-url"
							type="url"
							bind:value={urlInput}
							placeholder="https://yoursite.com/house/..."
							class="flex-1 border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900"
						/>
						<button
							type="button"
							onclick={findProperty}
							disabled={loading}
							class="shrink-0 border-2 border-stone-900 bg-stone-900 px-6 py-2.5 text-xs font-bold tracking-normal text-white transition hover:bg-white hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{loading ? 'Finding…' : 'Find property'}
						</button>
					</div>
					{#if findError}<p class="mt-2 text-sm text-red-500">{findError}</p>{/if}
					<p class="mt-3 text-xs text-stone-500">
						Or go to the <a href="/" class="font-bold text-stone-900 underline hover:text-accent">directory</a>, open a listing, and click <strong>Share your story</strong>.
					</p>
				</div>
			{:else if theHouse && !formSubmitted}
				<div>
					<p class="text-[10px] font-bold tracking-normal text-stone-400">Property</p>
					<p class="mt-1 font-black text-xl tracking-tight text-stone-900">
						{theHouse.address_suburb}
					</p>
					<p class="text-sm text-stone-500">
						<a href="/house/{theHouse.id}" class="underline hover:text-stone-900">View listing →</a>
					</p>
					<button
						type="button"
						onclick={() => { ignorePrefill = true; foundHouse = null; urlInput = ''; findError = ''; }}
						class="mt-4 text-xs font-bold tracking-normal text-stone-400 hover:text-stone-900"
					>
						Choose a different property
					</button>
				</div>

				<form onsubmit={submitStory} novalidate class="mt-8 space-y-5">
					<div>
						<label for="story-author" class="mb-1.5 block text-xs font-bold tracking-normal text-stone-600">
							Your name <span class="text-red-500">*</span>
						</label>
						<input
							id="story-author"
							type="text"
							bind:value={authorName}
							class="w-full border px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900 {formErrors.authorName ? 'border-red-400 bg-red-50' : 'border-stone-300 bg-white'}"
						/>
						{#if formErrors.authorName}<p class="mt-1 text-xs text-red-500">{formErrors.authorName}</p>{/if}
					</div>
					<div>
						<label for="story-period" class="mb-1.5 block text-xs font-bold tracking-normal text-stone-600">
							When or how you knew it <span class="text-stone-400">(optional)</span>
						</label>
						<input
							id="story-period"
							type="text"
							bind:value={periodOrContext}
							placeholder="e.g. 1980–1995, or 'I lived here', 'visited in the 70s'"
							class="w-full border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900"
						/>
					</div>
					<div>
						<label for="story-text" class="mb-1.5 block text-xs font-bold tracking-normal text-stone-600">
							Your story <span class="text-red-500">*</span>
						</label>
						<textarea
							id="story-text"
							bind:value={storyText}
							rows="5"
							placeholder="Share your memories or what you know about this place..."
							class="w-full resize-y border px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900 {formErrors.storyText ? 'border-red-400 bg-red-50' : 'border-stone-300 bg-white'}"
						></textarea>
						{#if formErrors.storyText}<p class="mt-1 text-xs text-red-500">{formErrors.storyText}</p>{/if}
					</div>
					{#if formErrors.submit}<p class="text-sm text-red-500">{formErrors.submit}</p>{/if}
					<button
						type="submit"
						disabled={formSubmitting}
						class="border-2 border-stone-900 bg-stone-900 px-6 py-3 text-xs font-bold tracking-normal text-white transition hover:bg-white hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{formSubmitting ? 'Sending…' : 'Submit'}
					</button>
				</form>
			{:else if formSubmitted}
				<div class="rounded border-2 border-stone-200 bg-stone-50 px-6 py-8">
					<p class="text-[10px] font-bold tracking-normal text-stone-400">Received</p>
					<h2 class="mt-3 text-2xl font-black tracking-tight text-stone-900">
						Thank you
					</h2>
					<p class="mt-4 text-stone-600 leading-relaxed">
						Your story has been submitted and will appear on the listing once we’ve reviewed it.
					</p>
					<div class="mt-6 flex flex-wrap gap-4">
						{#if theHouse}
							<a
								href="/house/{theHouse.id}"
								class="inline-block border-2 border-stone-900 bg-stone-900 px-6 py-3 text-xs font-bold tracking-normal text-white transition hover:bg-white hover:text-stone-900"
							>
								View listing
							</a>
						{/if}
						<a
							href="/"
							class="inline-block border-2 border-stone-300 px-6 py-3 text-xs font-bold tracking-normal text-stone-500 transition hover:border-stone-900 hover:text-stone-900"
						>
							Back to directory
						</a>
					</div>
				</div>
			{/if}
		</div>
	</section>
</main>
