<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { FormRow } from '$lib/content/documents';
	import FormCell from './FormCell.svelte';
	import StockLayerCell from './renderers/StockLayerCell.svelte';
	import { type Column, cellAt } from './formColumns';
	import { refFor } from './refs';
	import { rowStyle } from './rowStyle';

	/**
	 * 列定義（formColumns.ts）から見出しとセルを描く罫線表。
	 * 画面に出る列は columns だけで決まる。検査側（renderedCellRefs）も同じ columns を読む。
	 */
	let {
		columns,
		rows,
		caption,
		minWidth,
		showHeader = true,
		stickyFirstColumn = false,
		shadeNetIncome = false,
		class: className = ''
	}: {
		columns: Column[];
		rows: Array<FormRow<unknown>>;
		caption?: Snippet;
		minWidth?: number;
		showHeader?: boolean;
		/** 横スクロール中も先頭列（勘定科目）を追える位置に固定する */
		stickyFirstColumn?: boolean;
		/** 当期純利益行を網掛けにする（精算表） */
		shadeNetIncome?: boolean;
		class?: string;
	} = $props();

	type HeadCell = { label: string; colspan: number; rowspan: number; width?: number };

	const hasGroups = $derived(columns.some((c) => c.group));

	const header = $derived.by(() => {
		const top: HeadCell[] = [];
		const sub: HeadCell[] = [];
		let lastGroup: string | undefined;
		for (const column of columns) {
			if (!hasGroups) {
				top.push({ label: column.label, colspan: 1, rowspan: 1, width: column.width });
				continue;
			}
			if (!column.group) {
				top.push({ label: column.label, colspan: 1, rowspan: 2, width: column.width });
				lastGroup = undefined;
				continue;
			}
			if (column.group === lastGroup) top[top.length - 1].colspan += 1;
			else top.push({ label: column.group, colspan: 1, rowspan: 1 });
			lastGroup = column.group;
			sub.push({ label: column.label, colspan: 1, rowspan: 1, width: column.width });
		}
		return { top, sub };
	});
</script>

<table class={className} class:sticky-first={stickyFirstColumn} class:shade-net-income={shadeNetIncome} style:min-width={minWidth ? `${minWidth}px` : undefined}>
	{#if caption}<caption>{@render caption()}</caption>{/if}
	{#if showHeader}
		<thead>
			<tr>
				{#each header.top as cell, i (i)}
					<th class:sticky={stickyFirstColumn && i === 0} colspan={cell.colspan} rowspan={cell.rowspan} style:width={cell.width ? `${cell.width}px` : undefined}>{cell.label}</th>
				{/each}
			</tr>
			{#if hasGroups}
				<tr>
					{#each header.sub as cell, i (i)}
						<th style:width={cell.width ? `${cell.width}px` : undefined}>{cell.label}</th>
					{/each}
				</tr>
			{/if}
		</thead>
	{/if}
	<tbody>
		{#each rows as row (row.key)}
			{@const style = rowStyle(row.role)}
			<tr class:net-income={row.role === 'net_income'}>
				{#each columns as column (column.path)}
					{#if column.layers}
						{@const [group, field] = column.path.split('.')}
						<StockLayerCell
							rowKey={row.key}
							group={group as 'received' | 'shipped' | 'balance'}
							field={field as 'quantity' | 'unitPrice' | 'amount'}
							layers={(cellAt(row.cells, group) as never[]) ?? []}
							ruledAfter={row.ruledAfter}
						/>
					{:else}
						{@const emphasis = column.emphasis ?? 'plain'}
						<FormCell
							value={cellAt(row.cells, column.path) as string | number | null | undefined}
							ref={refFor(row.key, ...column.path.split('.'))}
							align={column.align}
							ruledAfter={row.ruledAfter}
							bold={(emphasis === 'bold' || emphasis === 'text') && style.bold}
							indent={(emphasis === 'text' || emphasis === 'indent') && style.indent}
							italic={(emphasis === 'text' || emphasis === 'indent') && style.italic}
						/>
					{/if}
				{/each}
			</tr>
		{/each}
	</tbody>
</table>

<style>
	table {
		border-collapse: collapse;
	}

	caption {
		caption-side: top;
		text-align: left;
		font-weight: 800;
		font-size: 15px;
		margin-bottom: 6px;
	}

	th {
		border: 1px solid #999;
		background: #f2f2f2;
		padding: 4px 10px;
		font-size: 12px;
		font-weight: 700;
	}

	th.sticky {
		position: sticky;
		left: 0;
		z-index: 2;
	}

	.sticky-first tbody :global(td.cell:first-child) {
		position: sticky;
		left: 0;
		z-index: 1;
		background: #ffffff;
		box-shadow: 1px 0 0 #999;
	}

	.shade-net-income tr.net-income :global(td.cell) {
		background: #f2f2f2;
	}
</style>
