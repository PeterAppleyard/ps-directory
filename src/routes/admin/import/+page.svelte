<script lang="ts">
	import { PUBLIC_MAPBOX_TOKEN } from '$env/static/public'
	import type { HouseCondition } from '$lib/types'

	// ── Types ────────────────────────────────────────────────────────────────
	type RowStatus = 'pending' | 'geocoding' | 'importing' | 'done' | 'error'

	type ImportRow = {
		suburb: string
		street: string
		state: string
		postcode: string
		style: string
		year: string
		condition: string
		description: string
		listing_url: string
		sold_listing_url: string
		// resolved after geocoding
		latitude: number | null
		longitude: number | null
		// UI state
		status: RowStatus
		error: string
		id: string // assigned after insert
	}

	// ── State ────────────────────────────────────────────────────────────────
	let csvText = $state('')
	let rows: ImportRow[] = $state([])
	let parsed = $state(false)
	let running = $state(false)
	let done = $state(false)

	const total = $derived(rows.length)
	const succeeded = $derived(rows.filter((r) => r.status === 'done').length)
	const failed = $derived(rows.filter((r) => r.status === 'error').length)
	const remaining = $derived(rows.filter((r) => r.status === 'pending').length)

	// ── CSV parsing ──────────────────────────────────────────────────────────
	const EXPECTED_HEADERS = [
		'suburb', 'street', 'state', 'postcode',
		'style', 'year', 'condition', 'description',
		'listing_url', 'sold_listing_url'
	]

	let parseError = $state('')

	function parseCSV(text: string): string[][] {
		const lines = text.trim().split(/\r?\n/)
		return lines.map((line) => {
			const cols: string[] = []
			let cur = ''
			let inQuote = false
			for (let i = 0; i < line.length; i++) {
				const ch = line[i]
				if (ch === '"') {
					inQuote = !inQuote
				} else if (ch === ',' && !inQuote) {
					cols.push(cur.trim())
					cur = ''
				} else {
					cur += ch
				}
			}
			cols.push(cur.trim())
			return cols
		})
	}

	function handleParse() {
		parseError = ''
		rows = []
		parsed = false
		done = false

		if (!csvText.trim()) {
			parseError = 'Paste some CSV first.'
			return
		}

		const all = parseCSV(csvText)
		if (all.length < 2) {
			parseError = 'Need at least a header row and one data row.'
			return
		}

		const headers = all[0].map((h) => h.toLowerCase().replace(/\s+/g, '_'))
		const missing = EXPECTED_HEADERS.filter((h) => !headers.includes(h))
		if (missing.length) {
			parseError = `Missing columns: ${missing.join(', ')}`
			return
		}

		const idx = (name: string) => headers.indexOf(name)

		rows = all.slice(1).map((cols) => ({
			suburb: cols[idx('suburb')] ?? '',
			street: cols[idx('street')] ?? '',
			state: cols[idx('state')] || 'NSW',
			postcode: cols[idx('postcode')] ?? '',
			style: cols[idx('style')] ?? '',
			year: cols[idx('year')] ?? '',
			condition: cols[idx('condition')] ?? '',
			description: cols[idx('description')] ?? '',
			listing_url: cols[idx('listing_url')] ?? '',
			sold_listing_url: cols[idx('sold_listing_url')] ?? '',
			latitude: null,
			longitude: null,
			status: 'pending' as RowStatus,
			error: '',
			id: ''
		})).filter((r) => r.suburb.trim()) // skip blank rows

		if (rows.length === 0) {
			parseError = 'No valid rows found (suburb is required).'
			return
		}

		parsed = true
	}

	function handleFileUpload(e: Event) {
		const input = e.currentTarget as HTMLInputElement
		const file = input.files?.[0]
		if (!file) return
		const reader = new FileReader()
		reader.onload = () => {
			csvText = reader.result as string
			handleParse()
		}
		reader.readAsText(file)
	}

	// ── Geocoding ────────────────────────────────────────────────────────────
	async function geocodeRow(row: ImportRow): Promise<void> {
		const parts = [row.street, row.suburb, row.state, row.postcode, 'Australia']
			.filter(Boolean)
			.join(', ')
		try {
			const res = await fetch(
				`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(parts)}.json?access_token=${PUBLIC_MAPBOX_TOKEN}&country=AU&limit=1`
			)
			const json = await res.json()
			const feature = json.features?.[0]
			if (feature) {
				row.latitude = feature.center[1]
				row.longitude = feature.center[0]
			}
		} catch {
			// geocoding is best-effort — continue without coords
		}
	}

	// ── Import ───────────────────────────────────────────────────────────────
	async function importRow(row: ImportRow): Promise<void> {
		const payload = {
			address_street: row.street || row.suburb,
			address_suburb: row.suburb,
			address_state: row.state || 'NSW',
			address_postcode: row.postcode || '',
			style: row.style || null,
			year_built: row.year ? parseInt(row.year) : null,
			builder_name: null,
			condition: (row.condition as HouseCondition) || null,
			description: row.description || null,
			status: 'pending',
			latitude: row.latitude,
			longitude: row.longitude,
			listing_url: row.listing_url || null,
			sold_listing_url: row.sold_listing_url || null
		}

		const res = await fetch('/api/submit-house', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		})
		const json = await res.json()

		if (!res.ok || !json.id) {
			throw new Error(json.error ?? `HTTP ${res.status}`)
		}
		row.id = json.id
	}

	async function runImport() {
		if (running) return
		running = true
		done = false

		// Process rows concurrently in batches of 5
		const BATCH = 5
		for (let i = 0; i < rows.length; i += BATCH) {
			const batch = rows.slice(i, i + BATCH).filter((r) => r.status === 'pending')
			await Promise.all(
				batch.map(async (row) => {
					try {
						row.status = 'geocoding'
						await geocodeRow(row)
						row.status = 'importing'
						await importRow(row)
						row.status = 'done'
					} catch (err) {
						row.status = 'error'
						row.error = err instanceof Error ? err.message : 'Unknown error'
					}
				})
			)
		}

		running = false
		done = true
	}

	function reset() {
		csvText = ''
		rows = []
		parsed = false
		done = false
		parseError = ''
	}

	const TEMPLATE = `suburb,street,state,postcode,style,year,condition,description,listing_url,sold_listing_url
Kellyville,42 Sample St,NSW,2155,Lowline,1967,Original,Original brick and timber.,https://realestate.com.au/…,
Castle Hill,7 Example Rd,NSW,2154,Split-level,1971,Renovated,Renovated kitchen.,,,`
</script>

<!-- ── Layout ──────────────────────────────────────────────────────────────── -->
<div class="p-4 sm:p-6">
	<div class="mb-6">
		<h1 class="text-xl font-bold text-gray-900 dark:text-white">Bulk Import</h1>
		<p class="mt-1 text-sm text-gray-500 dark:text-slate-400">Import multiple listings via CSV</p>
	</div>

	<div class="max-w-5xl space-y-8">

		<!-- ── Step 1: paste CSV ── -->
		{#if !parsed}
			<section class="space-y-6">
				<div>
					<h2 class="font-black text-2xl uppercase tracking-tight text-stone-900">1. Paste your CSV</h2>
					<p class="mt-1 text-sm text-stone-500">
						Required columns (exact header names): <code class="rounded bg-stone-100 px-1 text-xs">suburb</code>,
						<code class="rounded bg-stone-100 px-1 text-xs">street</code>,
						<code class="rounded bg-stone-100 px-1 text-xs">state</code>,
						<code class="rounded bg-stone-100 px-1 text-xs">postcode</code>,
						<code class="rounded bg-stone-100 px-1 text-xs">style</code>,
						<code class="rounded bg-stone-100 px-1 text-xs">year</code>,
						<code class="rounded bg-stone-100 px-1 text-xs">condition</code>,
						<code class="rounded bg-stone-100 px-1 text-xs">description</code>,
						<code class="rounded bg-stone-100 px-1 text-xs">listing_url</code>,
						<code class="rounded bg-stone-100 px-1 text-xs">sold_listing_url</code>.
						Empty cells are fine — only <code class="rounded bg-stone-100 px-1 text-xs">suburb</code> is required.
					</p>
				</div>

				<!-- Template download -->
				<div class="flex items-center gap-4">
					<button
						type="button"
						onclick={() => { csvText = TEMPLATE }}
						class="border border-stone-300 bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-stone-500 transition hover:border-stone-900 hover:text-stone-900"
					>
						Load example
					</button>
					<a
						href="data:text/csv;charset=utf-8,{encodeURIComponent(TEMPLATE)}"
						download="ps-import-template.csv"
						class="text-[10px] font-bold uppercase tracking-widest text-stone-400 underline hover:text-stone-900"
					>
						Download template
					</a>
					<span class="text-stone-200">|</span>
					<label for="csv-file" class="cursor-pointer text-[10px] font-bold uppercase tracking-widest text-stone-400 underline hover:text-stone-900">
						Upload .csv file
						<input id="csv-file" type="file" accept=".csv,text/csv" class="sr-only" onchange={handleFileUpload} />
					</label>
				</div>

				<textarea
					bind:value={csvText}
					rows="10"
					placeholder="Paste CSV here…"
					class="w-full resize-y border-2 border-stone-200 bg-white px-4 py-3 font-mono text-xs text-stone-800 placeholder:text-stone-300 focus:border-stone-900 focus:outline-none"
					spellcheck="false"
				></textarea>

				{#if parseError}
					<p class="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{parseError}</p>
				{/if}

				<button
					type="button"
					onclick={handleParse}
					class="border-2 border-stone-900 bg-stone-900 px-8 py-3 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-white hover:text-stone-900"
				>
					Parse & Preview →
				</button>
			</section>
		{/if}

		<!-- ── Step 2: preview + run ── -->
		{#if parsed}
			<section class="space-y-6">
				<div class="flex flex-wrap items-baseline justify-between gap-4">
					<div>
						<h2 class="font-black text-2xl uppercase tracking-tight text-stone-900">2. Preview</h2>
						<p class="mt-1 text-sm text-stone-500">
							{total} row{total !== 1 ? 's' : ''} ready.
							Each will be geocoded then inserted as a <strong>pending</strong> submission.
						</p>
					</div>
					{#if !running && !done}
						<div class="flex gap-3">
							<button
								type="button"
								onclick={reset}
								class="border border-stone-200 px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-stone-400 transition hover:border-stone-900 hover:text-stone-900"
							>
								← Back
							</button>
							<button
								type="button"
								onclick={runImport}
								class="border-2 border-stone-900 bg-stone-900 px-8 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-white hover:text-stone-900"
							>
								Import {total} Houses →
							</button>
						</div>
					{/if}
				</div>

				<!-- Progress bar while running -->
				{#if running || done}
					<div class="space-y-2">
						<div class="flex justify-between text-[10px] font-bold uppercase tracking-widest text-stone-500">
							<span>{running ? 'Importing…' : 'Complete'}</span>
							<span>{succeeded + failed} / {total}</span>
						</div>
						<div class="h-1.5 w-full bg-stone-200">
							<div
								class="h-1.5 bg-stone-900 transition-all duration-300"
								style="width: {total ? Math.round(((succeeded + failed) / total) * 100) : 0}%"
							></div>
						</div>
						<div class="flex gap-6 text-[10px] uppercase tracking-widest">
							<span class="text-green-600 font-bold">{succeeded} imported</span>
							{#if failed > 0}<span class="text-red-500 font-bold">{failed} failed</span>{/if}
							{#if remaining > 0}<span class="text-stone-400">{remaining} pending</span>{/if}
						</div>
					</div>
				{/if}

				<!-- Done actions -->
				{#if done}
					<div class="flex flex-wrap gap-4 border-t border-stone-200 pt-4">
						<a
							href="/admin?tab=pending"
							class="border-2 border-stone-900 bg-stone-900 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-white hover:text-stone-900"
						>
							Review in Admin →
						</a>
						{#if failed > 0}
							<button
								type="button"
								onclick={() => { rows.forEach((r) => { if (r.status === 'error') r.status = 'pending' }); runImport() }}
								class="border-2 border-stone-200 px-6 py-3 text-xs font-bold uppercase tracking-widest text-stone-500 transition hover:border-stone-900 hover:text-stone-900"
							>
								Retry {failed} failed
							</button>
						{/if}
						<button
							type="button"
							onclick={reset}
							class="border border-stone-200 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-stone-400 transition hover:border-stone-900 hover:text-stone-900"
						>
							Import another batch
						</button>
					</div>
				{/if}

				<!-- Preview table -->
				<div class="overflow-x-auto border-2 border-stone-200">
					<table class="w-full text-left text-xs">
						<thead class="border-b-2 border-stone-900 bg-stone-900 text-white">
							<tr>
								<th class="px-3 py-2 font-bold uppercase tracking-wider">Status</th>
								<th class="px-3 py-2 font-bold uppercase tracking-wider">Suburb</th>
								<th class="px-3 py-2 font-bold uppercase tracking-wider">Street</th>
								<th class="px-3 py-2 font-bold uppercase tracking-wider">Style</th>
								<th class="px-3 py-2 font-bold uppercase tracking-wider">Year</th>
								<th class="px-3 py-2 font-bold uppercase tracking-wider">Condition</th>
								<th class="px-3 py-2 font-bold uppercase tracking-wider">Coords</th>
								<th class="px-3 py-2 font-bold uppercase tracking-wider">Links</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-stone-100">
							{#each rows as row, i (i)}
								<tr class="
									{row.status === 'done' ? 'bg-green-50' : ''}
									{row.status === 'error' ? 'bg-red-50' : ''}
									{row.status === 'geocoding' || row.status === 'importing' ? 'bg-amber-50' : ''}
								">
									<td class="px-3 py-2 font-bold uppercase tracking-wider">
										{#if row.status === 'pending'}
											<span class="text-stone-300">—</span>
										{:else if row.status === 'geocoding'}
											<span class="text-amber-600">Locating…</span>
										{:else if row.status === 'importing'}
											<span class="text-amber-600">Saving…</span>
										{:else if row.status === 'done'}
											<span class="text-green-600">✓</span>
										{:else}
											<span class="text-red-500" title={row.error}>✕ Error</span>
										{/if}
									</td>
									<td class="px-3 py-2 font-bold text-stone-900">{row.suburb}</td>
									<td class="px-3 py-2 text-stone-500">{row.street || '—'}</td>
									<td class="px-3 py-2 text-stone-500">{row.style || '—'}</td>
									<td class="px-3 py-2 text-stone-500">{row.year || '—'}</td>
									<td class="px-3 py-2 text-stone-500">{row.condition || '—'}</td>
									<td class="px-3 py-2 text-stone-400">
										{row.latitude ? '📍' : '—'}
									</td>
									<td class="px-3 py-2">
										{#if row.listing_url || row.sold_listing_url}
											<span class="text-stone-400">✓</span>
										{:else}
											<span class="text-stone-200">—</span>
										{/if}
									</td>
								</tr>
								{#if row.status === 'error' && row.error}
									<tr class="bg-red-50">
										<td colspan="8" class="px-3 py-1 text-[10px] text-red-500">{row.error}</td>
									</tr>
								{/if}
							{/each}
						</tbody>
					</table>
				</div>
			</section>
		{/if}

	</div>
</div>
