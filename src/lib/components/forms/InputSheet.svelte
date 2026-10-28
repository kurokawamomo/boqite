<script lang="ts">
	import { blankOptions, type FormBlank } from '$lib/content/types';
	import Numpad from '$lib/components/numpad/Numpad.svelte';
	import { type CalcState, calcDisplayValue, settleCalc } from '$lib/components/numpad/calculator';
	import AccountChip from '$lib/components/lesson/AccountChip.svelte';

	let {
		blank,
		label,
		calc = $bindable(),
		onCommit,
		onCancel
	}: {
		blank: FormBlank;
		/** 開いている欄の見出し（formColumns の列定義から引いたもの） */
		label: string;
		/** 電卓の状態。親が持つので、「=」で閉じて次の空欄を開いても表示が残る */
		calc: CalcState;
		onCommit: (value: string | number) => void;
		onCancel: () => void;
	} = $props();

	let numpadCurrent = $state<number | null>(0);

	/** 電卓の「=」: 表示中の値（式なら計算結果）を入れる。表示は残す */
	function confirm() {
		if (numpadCurrent === null) return;
		calc = settleCalc(calc);
		onCommit(calcDisplayValue(calc));
	}

	const options = $derived(blankOptions(blank));
</script>

<div class="backdrop" onclick={onCancel} role="presentation"></div>

<div class="sheet" role="dialog" aria-label="空欄の入力">
	<div class="sheet-header">
		<span class="ref-label">{label}</span>
		<button type="button" class="close" onclick={onCancel} aria-label="閉じる">×</button>
	</div>

	{#if blank.input === 'numpad'}
		<Numpad bind:calc bind:current={numpadCurrent} onequals={confirm} />
	{:else if options}
		<div class="chip-grid">
			{#each options as option (option)}
				<AccountChip label={String(option)} onclick={() => onCommit(option)} />
			{/each}
		</div>
	{/if}
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.35);
		z-index: 20;
	}

	.sheet {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 21;
		background: #ffffff;
		border-radius: 16px 16px 0 0;
		padding: 16px;
		box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.15);
		max-height: 70vh;
		overflow-y: auto;
	}

	.sheet-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 12px;
	}

	.ref-label {
		font-size: 13px;
		font-weight: 700;
		color: #666;
	}

	.close {
		appearance: none;
		border: none;
		background: none;
		font-size: 20px;
		color: #999;
		cursor: pointer;
		line-height: 1;
		padding: 4px 8px;
	}

	.chip-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

</style>
