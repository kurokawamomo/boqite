<script lang="ts">
	import type { CellRef } from '$lib/content/types';
	import type { RuleLine } from '$lib/content/documents';
	import { getFormFillContext } from './formFillContext';

	let {
		value,
		ref,
		align = 'left',
		bold = false,
		indent = false,
		italic = false,
		ruledAfter
	}: {
		value: string | number | null | undefined;
		ref: CellRef;
		align?: 'left' | 'right' | 'center';
		bold?: boolean;
		indent?: boolean;
		italic?: boolean;
		ruledAfter?: RuleLine;
	} = $props();

	const ctx = getFormFillContext();
	const blank = $derived(ctx.blanksByRef.get(ref));
	const answered = $derived(blank ? ctx.answers[ref] : undefined);
</script>

<td
	class="cell"
	class:right={align === 'right'}
	class:center={align === 'center'}
	class:bold
	class:indent
	class:italic
	class:ruled-single={ruledAfter === 'single'}
	class:ruled-double={ruledAfter === 'double'}
>
	{#if blank}
		<button
			type="button"
			class="blank-btn"
			class:filled={answered !== undefined}
			onclick={() => ctx.onActivate(blank)}
		>
			{answered ?? '？'}
		</button>
	{:else}
		{value ?? ''}
	{/if}
</td>

<style>
	.cell {
		border: 1px solid #999;
		padding: 4px 10px;
		font-size: 13px;
		white-space: nowrap;
		text-align: left;
	}

	.cell.right {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.cell.center {
		text-align: center;
	}

	.cell.bold {
		font-weight: 700;
	}

	.cell.indent {
		padding-left: 22px;
	}

	.cell.italic {
		font-style: italic;
		color: #555;
	}

	.cell.ruled-single {
		border-bottom: 1px solid #333;
	}

	.cell.ruled-double {
		border-bottom: 4px double #333;
	}

	.blank-btn {
		appearance: none;
		min-width: 44px;
		padding: 2px 10px;
		border: 2px dashed #55c50d;
		border-radius: 6px;
		background: #f3fff0;
		color: #2a7d02;
		font-weight: 700;
		font-size: 13px;
		font-variant-numeric: tabular-nums;
		cursor: pointer;
		touch-action: manipulation;
	}

	.blank-btn.filled {
		border-style: solid;
		background: #eaffea;
	}
</style>
