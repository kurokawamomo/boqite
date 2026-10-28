<script lang="ts">
	import type { JournalTask } from '$lib/content/types';
	import { playChipClick } from '$lib/audio';
	import AccountChip from './AccountChip.svelte';
	import Numpad from '$lib/components/numpad/Numpad.svelte';
	import {
		calcDisplayValue,
		createInitialCalcState,
		formatAmount,
		settleCalc
	} from '$lib/components/numpad/calculator';
	import {
		type EnteredJournal,
		type JournalSide,
		type Slot,
		type SlotField,
		addLine,
		canSubmit,
		createEmptyEntry,
		hasDuplicateAccount,
		lineSum,
		placeAccount,
		placeAmount,
		removeLine
	} from './journal';

	let { task, onsubmit }: { task: JournalTask; onsubmit: (entry: EnteredJournal) => void } = $props();

	let entry = $state<EnteredJournal>(createEmptyEntry());
	let activeSlot = $state<Slot | null>({ side: 'debit', index: 0, field: 'account' });
	// 電卓の状態はここで持つ。「=」で欄に入れたあとも表示を残し、次の欄で同じ金額を使える
	let calc = $state(createInitialCalcState());
	let numpadCurrent = $state<number | null>(0);

	const debitSum = $derived(lineSum(entry.debit));
	const creditSum = $derived(lineSum(entry.credit));
	const balanced = $derived(debitSum > 0 && debitSum === creditSum);
	const debitDup = $derived(hasDuplicateAccount(entry.debit));
	const creditDup = $derived(hasDuplicateAccount(entry.credit));
	const ready = $derived(canSubmit(entry) && !debitDup && !creditDup);

	const amountOptions = $derived(
		[...new Set([...task.debit, ...task.credit].map((l) => l.amount))].sort((a, b) => a - b)
	);

	function selectSlot(side: JournalSide, index: number, field: SlotField) {
		activeSlot = { side, index, field };
	}

	function placeAccountChip(account: string) {
		playChipClick();
		({ entry, activeSlot } = placeAccount(entry, activeSlot, account));
	}

	function placeAmountChip(amount: number) {
		playChipClick();
		({ entry, activeSlot } = placeAmount(entry, activeSlot, amount));
	}

	/** 電卓の「=」: 表示中の値（式なら計算結果）を金額欄に入れる。表示は残す */
	function confirmNumpad() {
		if (numpadCurrent === null || numpadCurrent <= 0) return;
		calc = settleCalc(calc);
		({ entry, activeSlot } = placeAmount(entry, activeSlot, calcDisplayValue(calc)));
	}

	function handleRemoveLine(side: JournalSide, index: number) {
		entry = removeLine(entry, side, index);
		if (activeSlot?.side === side && activeSlot.index === index) activeSlot = null;
	}

	function submit() {
		if (!ready) return;
		onsubmit(entry);
	}
</script>

{#snippet side(sideName: JournalSide, label: string)}
	{@const lines = sideName === 'debit' ? entry.debit : entry.credit}
	{@const dup = sideName === 'debit' ? debitDup : creditDup}
	<div class="side">
		<p class="side-header {sideName}">{label}</p>
		{#each lines as line, i (i)}
			<div class="line">
				<button
					type="button"
					class="slot"
					class:active={activeSlot?.side === sideName && activeSlot.index === i && activeSlot.field === 'account'}
					class:filled={line.account !== null}
					onclick={() => selectSlot(sideName, i, 'account')}
				>
					{line.account ?? '科目'}
				</button>
				<button
					type="button"
					class="slot amount"
					class:active={activeSlot?.side === sideName && activeSlot.index === i && activeSlot.field === 'amount'}
					class:filled={line.amount !== null}
					onclick={() => selectSlot(sideName, i, 'amount')}
				>
					{line.amount !== null ? formatAmount(line.amount) : '金額'}
				</button>
				{#if lines.length > 1}
					<button type="button" class="remove" aria-label="{label}の行を削除" onclick={() => handleRemoveLine(sideName, i)}>×</button>
				{/if}
			</div>
		{/each}
		{#if lines.length < 4}
			<button type="button" class="add-line" onclick={() => (entry = addLine(entry, sideName))}>+ 行追加</button>
		{/if}
		{#if dup}<p class="warn">同じ科目が重複しています</p>{/if}
	</div>
{/snippet}

<div class="journal-form">
	<div class="columns">
		{@render side('debit', '借方')}
		{@render side('credit', '貸方')}
	</div>

	<div class="totals" class:balanced>
		<span>借方 {formatAmount(debitSum)}</span>
		<span class="eq">{balanced ? '✓' : '≠'}</span>
		<span>貸方 {formatAmount(creditSum)}</span>
	</div>

	<div class="word-bank">
		{#each task.accountOptions as account (account)}
			<AccountChip label={account} onclick={() => placeAccountChip(account)} />
		{/each}
	</div>

	{#if task.amountInput === 'chips'}
		<div class="word-bank amount-bank">
			{#each amountOptions as amount (amount)}
				<AccountChip label={formatAmount(amount)} onclick={() => placeAmountChip(amount)} />
			{/each}
		</div>
	{:else}
		<Numpad bind:calc bind:current={numpadCurrent} onequals={confirmNumpad} />
	{/if}

	<button type="button" class="submit" disabled={!ready} onclick={submit}>こたえる</button>
</div>

<style>
	.journal-form {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.columns {
		display: flex;
		gap: 10px;
	}

	.side {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.side-header {
		margin: 0;
		font-size: 0.8rem;
		font-weight: 800;
		color: #6b6b6b;
	}

	.side-header.debit {
		color: #1fa9ee;
	}

	.side-header.credit {
		color: #c97bf9;
	}

	.line {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.slot {
		flex: 1;
		min-width: 0;
		appearance: none;
		border: 2px solid #e3e3e1;
		border-radius: 0.75rem;
		padding: 0.55rem 0.5rem;
		font-size: 0.85rem;
		font-weight: 700;
		background: #f7f8fa;
		color: #adadab;
		text-align: left;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		touch-action: manipulation;
	}

	.slot.amount {
		text-align: right;
	}

	.slot.filled {
		background: #ffffff;
		color: #3b3b3a;
	}

	.slot.active {
		border-color: #1fa9ee;
	}

	.remove {
		appearance: none;
		border: none;
		background: transparent;
		color: #adadab;
		font-size: 1.1rem;
		line-height: 1;
		padding: 0 2px;
	}

	.add-line {
		align-self: flex-start;
		appearance: none;
		border: none;
		background: transparent;
		color: #1fa9ee;
		font-size: 0.8rem;
		font-weight: 800;
		padding: 4px 0;
	}

	.warn {
		margin: 0;
		font-size: 0.75rem;
		color: #e22f2f;
	}

	.totals {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		font-size: 0.85rem;
		font-weight: 700;
		color: #6b6b6b;
	}

	.totals.balanced {
		color: #4caa00;
	}

	.eq {
		font-weight: 900;
	}

	.word-bank {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		justify-content: center;
		padding: 6px 0;
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
