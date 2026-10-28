<script lang="ts">
	import type { EquityStatementData } from '$lib/content/documents';
	import ColumnTable from '../ColumnTable.svelte';
	import { EQUITY_STATEMENT_COLUMNS } from '../formColumns';

	let {
		data
	}: {
		data: EquityStatementData;
	} = $props();
</script>

<ColumnTable columns={EQUITY_STATEMENT_COLUMNS} rows={data.rows} minWidth={860}>
	{#snippet caption()}{data.header.title ?? '株主資本等変動計算書'}{#if data.header.subject}<span class="subject">（{data.header.subject}）</span>{/if}{/snippet}
</ColumnTable>

<style>
	.subject {
		font-weight: 400;
		font-size: 13px;
		color: #666;
	}
</style>
