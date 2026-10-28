<script lang="ts">
	import type { CostSheetData } from '$lib/content/documents';
	import ColumnTable from '../ColumnTable.svelte';
	import { costSheetColumns } from '../formColumns';

	let {
		data
	}: {
		data: CostSheetData;
	} = $props();
</script>

<ColumnTable columns={costSheetColumns(data.orders)} rows={data.rows}>
	{#snippet caption()}{data.header.title ?? '原価計算表'}{#if data.header.subject}<span class="subject">（{data.header.subject}）</span>{/if}{/snippet}
</ColumnTable>

<style>
	.subject {
		font-weight: 400;
		font-size: 13px;
		color: #666;
	}
</style>
