<script lang="ts">
	import type { MaterialLedgerData } from '$lib/content/documents';
	import ColumnTable from '../ColumnTable.svelte';
	import { MATERIAL_LEDGER_COLUMNS } from '../formColumns';

	let {
		data
	}: {
		data: MaterialLedgerData;
	} = $props();
</script>

<ColumnTable columns={MATERIAL_LEDGER_COLUMNS} rows={data.rows} minWidth={760}>
	{#snippet caption()}{data.header.title ?? '材料元帳'}{#if data.header.subject}<span class="subject">（{data.header.subject}）</span>{/if}{/snippet}
</ColumnTable>

<style>
	.subject {
		font-weight: 400;
		font-size: 13px;
		color: #666;
	}
</style>
