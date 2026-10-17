<script lang="ts">
	import type { FixedAssetLedgerData } from '$lib/content/documents';
	import ColumnTable from '../ColumnTable.svelte';
	import { FIXED_ASSET_LEDGER_COLUMNS } from '../formColumns';

	let {
		data
	}: {
		data: FixedAssetLedgerData;
	} = $props();
</script>

<ColumnTable columns={FIXED_ASSET_LEDGER_COLUMNS} rows={data.rows} minWidth={940}>
	{#snippet caption()}{data.header.title ?? '固定資産台帳'}{/snippet}
</ColumnTable>
