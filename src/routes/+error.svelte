<script lang="ts">
	import { page } from '$app/stores'
</script>

<main class="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center">
	<p class="text-[10px] font-bold uppercase tracking-[0.4em] text-stone-400">
		Error {$page.status}
	</p>
	<h1
		class="mt-4 font-black uppercase leading-none tracking-tight text-stone-900"
		style="font-size: clamp(5rem, 20vw, 16rem); line-height: 0.9;"
	>
		{$page.status}
	</h1>
	<p class="mt-8 max-w-sm text-sm text-stone-500">
		{$page.error?.message ?? 'Something went wrong. Please try again.'}
	</p>
	<div class="mt-10 flex flex-wrap justify-center gap-4">
		<a
			href="/"
			class="border-2 border-stone-900 px-6 py-3 text-xs font-bold uppercase tracking-widest text-stone-900 transition hover:bg-stone-900 hover:text-white"
		>
			Back to Directory
		</a>
		<button
			type="button"
			onclick={() => window.location.reload()}
			class="border-2 border-stone-200 px-6 py-3 text-xs font-bold uppercase tracking-widest text-stone-400 transition hover:border-stone-900 hover:text-stone-900"
		>
			Try Again
		</button>
	</div>
</main>
