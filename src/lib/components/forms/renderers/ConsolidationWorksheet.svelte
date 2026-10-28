<script lang="ts">
	import type { ConsolidationWorksheetData } from '$lib/content/documents';
	import ColumnTable from '../ColumnTable.svelte';
	import { CONSOLIDATION_WORKSHEET_COLUMNS } from '../formColumns';

	let {
		data
	}: {
		data: ConsolidationWorksheetData;
	} = $props();
</script>

<ColumnTable columns={CONSOLIDATION_WORKSHEET_COLUMNS} rows={data.rows} minWidth={640}>
	{#snippet caption()}{data.header.title ?? '連結精算表'}{#if data.header.subject}<span class="subject">（{data.header.subject}）</span>{/if}{/snippet}
</ColumnTable>

<style>
	.subject {
		font-weight: 400;
		font-size: 13px;
		color: #666;
	}
</style>
