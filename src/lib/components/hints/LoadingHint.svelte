<script lang="ts">
	import { fade } from 'svelte/transition';
	import { pickHint } from './hints';

	type Props = {
		/** 現在読み込み中のノードが属する Unit の id (例: "b3-u03") */
		unitId: string;
	};

	let { unitId }: Props = $props();

	const hint = $derived.by(() => pickHint(unitId));
</script>

<div class="loading-hint" aria-live="polite">
	{#key unitId}
		<p class="hint-text" in:fade={{ duration: 300 }} out:fade={{ duration: 150 }}>
			💡 {hint}
		</p>
	{/key}
</div>

<style>
	.loading-hint {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 3.5rem;
		padding: 0.75rem 1.25rem;
		text-align: center;
	}

	.hint-text {
		margin: 0;
		font-size: 0.95rem;
		line-height: 1.5;
		color: #444;
	}
</style>
