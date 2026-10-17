<script lang="ts">
	import type { CalcTask } from '$lib/content/types';
	import Numpad from '$lib/components/numpad/Numpad.svelte';

	let { task: _task, onsubmit }: { task: CalcTask; onsubmit: (value: number) => void } = $props();

	let current = $state<number | null>(0);

	// 「=」を押さなくても、表示中の値（式なら計算結果）で答える
	const answerable = $derived(current !== null && current !== 0);

	function submit() {
		if (current === null || !answerable) return;
		onsubmit(current);
	}
</script>

<div class="calc-form">
	<Numpad bind:current />
	<button type="button" class="submit" disabled={!answerable} onclick={submit}>こたえる</button>
</div>

<style>
	.calc-form {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.submit {
		appearance: none;
		border: none;
		border-radius: 1rem;
		padding: 1rem;
		font-size: 1.05rem;
		font-weight: 800;
		color: #ffffff;
		background: #55c50d;
		box-shadow: 0 4px 0 #3f9a0a;
		touch-action: manipulation;
	}

	.submit:disabled {
		background: #e3e3e1;
		box-shadow: 0 4px 0 #cccccc;
		color: #adadab;
	}

	.submit:not(:disabled):active {
		transform: translateY(3px);
		box-shadow: 0 0 0 transparent;
	}
</style>
