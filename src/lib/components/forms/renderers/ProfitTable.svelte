<script lang="ts">
	import type { ProfitTableData } from '$lib/content/documents';
	import ColumnTable from '../ColumnTable.svelte';
	import { profitTableColumns } from '../formColumns';

	let {
		data
	}: {
		data: ProfitTableData;
	} = $props();
</script>

<ColumnTable columns={profitTableColumns(data.variant)} rows={data.rows}>
	{#snippet caption()}{data.header.title ?? '損益計算書'}{#if data.header.subject}<span class="subject">（{data.header.subject}）</span>{/if}{/snippet}
</ColumnTable>

<style>
	.subject {
		font-weight: 400;
		font-size: 13px;
		color: #666;
	}
</style>
