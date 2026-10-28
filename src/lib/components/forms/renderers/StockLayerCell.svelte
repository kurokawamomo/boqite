<script lang="ts">
	import type { RuleLine, StockLayer } from '$lib/content/documents';
	import { refFor } from '../refs';
	import { getFormFillContext } from '../formFillContext';

	/**
	 * 商品有高帳の受入・払出・残高セル。1 行に複数レイヤ（先入先出法）が
	 * 縦積みで入るため、通常の FormCell では表現できず専用セルにした。
	 */
	let {
		rowKey,
		group,
		field,
		layers,
		ruledAfter
	}: {
		rowKey: string;
		group: 'received' | 'shipped' | 'balance';
		field: 'quantity' | 'unitPrice' | 'amount';
		layers: StockLayer[];
		ruledAfter?: RuleLine;
	} = $props();

	const ctx = getFormFillContext();
</script>

<td class="layer-cell" class:ruled-single={ruledAfter === 'single'} class:ruled-double={ruledAfter === 'double'}>
	{#each layers as layer, i (i)}
		{@const ref = refFor(rowKey, group, i, field)}
		{@const blank = ctx.blanksByRef.get(ref)}
		<div class="layer-line">
			{#if blank}
				<button
					type="button"
					class="blank-btn"
					class:filled={ctx.answers[ref] !== undefined}
					onclick={() => ctx.onActivate(blank)}
				>
					{ctx.answers[ref] ?? '？'}
				</button>
			{:else}
				{layer[field] ?? ''}
			{/if}
		</div>
	{/each}
</td>

<style>
	.layer-cell {
		border: 1px solid #999;
		padding: 4px 8px;
		font-size: 13px;
		text-align: right;
		font-variant-numeric: tabular-nums;
		vertical-align: top;
	}

	.layer-cell.ruled-single {
		border-bottom: 1px solid #333;
	}

	.layer-cell.ruled-double {
		border-bottom: 4px double #333;
	}

	.layer-line {
		white-space: nowrap;
		line-height: 1.6;
	}

	.blank-btn {
		appearance: none;
		min-width: 40px;
		padding: 1px 8px;
		border: 2px dashed #55c50d;
		border-radius: 6px;
		background: #f3fff0;
		color: #2a7d02;
		font-weight: 700;
		font-size: 12px;
		font-variant-numeric: tabular-nums;
		cursor: pointer;
		touch-action: manipulation;
	}

	.blank-btn.filled {
		border-style: solid;
		background: #eaffea;
	}
</style>
