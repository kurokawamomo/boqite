<script lang="ts">
	import type { TradeBookData } from '$lib/content/documents';
	import ColumnTable from '../ColumnTable.svelte';
	import { TRADE_BOOK_COLUMNS } from '../formColumns';

	/** 仕入帳・売上帳の共通レンダラ。列構成は同一（TradeBookCells）。 */
	let {
		data,
		title
	}: {
		data: TradeBookData;
		title: string;
	} = $props();
</script>

<ColumnTable columns={TRADE_BOOK_COLUMNS} rows={data.rows} minWidth={480}>
	{#snippet caption()}{data.header.title ?? title}{/snippet}
</ColumnTable>
