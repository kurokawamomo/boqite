<script lang="ts">
	import Numpad from '$lib/components/numpad/Numpad.svelte';
	import { formatAmount } from '$lib/components/numpad/calculator';

	let amount = $state(0);
</script>

<div class="page">
	<h1>電卓テンキー デモ</h1>
	<p class="value">確定値: <strong>{formatAmount(amount)}円</strong></p>
	<Numpad bind:value={amount} />
</div>

<style>
	.page {
		box-sizing: border-box;
		min-height: 100dvh;
		padding: 1.5rem 1rem 3rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		background: #ffffff;
	}

	h1 {
		font-size: 1.1rem;
		margin: 0;
	}

	.value {
		font-size: 1rem;
		margin: 0 0 0.5rem;
	}
</style>
