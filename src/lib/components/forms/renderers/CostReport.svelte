<script lang="ts">
	import type { CostReportData } from '$lib/content/documents';
	import ColumnTable from '../ColumnTable.svelte';
	import { COST_REPORT_COLUMNS } from '../formColumns';

	let {
		data
	}: {
		data: CostReportData;
	} = $props();
</script>

<ColumnTable columns={COST_REPORT_COLUMNS} rows={data.rows} minWidth={420}>
	{#snippet caption()}{data.header.title ?? '製造原価報告書'}{#if data.header.subject}<span class="subject">（{data.header.subject}）</span>{/if}{/snippet}
</ColumnTable>

<style>
	.subject {
		font-weight: 400;
		font-size: 13px;
		color: #666;
	}
</style>
