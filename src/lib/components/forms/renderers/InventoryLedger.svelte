<script lang="ts">
	import type { InventoryLedgerData } from '$lib/content/documents';
	import ColumnTable from '../ColumnTable.svelte';
	import { INVENTORY_LEDGER_COLUMNS } from '../formColumns';

	let {
		data
	}: {
		data: InventoryLedgerData;
	} = $props();
</script>

<ColumnTable columns={INVENTORY_LEDGER_COLUMNS} rows={data.rows} minWidth={760}>
	{#snippet caption()}
		{data.header.title ?? '商品有高帳'}{#if data.header.subject}<span class="subject">（{data.header.subject}）</span>{/if}
	{/snippet}
</ColumnTable>

<style>
	.subject {
		font-weight: 400;
		font-size: 13px;
		color: #666;
	}
</style>
