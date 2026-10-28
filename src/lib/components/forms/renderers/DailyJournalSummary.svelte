<script lang="ts">
	import type { DailyJournalSummaryData } from '$lib/content/documents';
	import ColumnTable from '../ColumnTable.svelte';
	import { DAILY_JOURNAL_SUMMARY_COLUMNS } from '../formColumns';

	let {
		data
	}: {
		data: DailyJournalSummaryData;
	} = $props();
</script>

<ColumnTable columns={DAILY_JOURNAL_SUMMARY_COLUMNS} rows={data.rows} minWidth={480}>
	{#snippet caption()}
		{data.header.title ?? '仕訳日計表'}{#if data.header.period}<span class="period">（{data.header.period}）</span>{/if}
	{/snippet}
</ColumnTable>

<style>
	.period {
		font-weight: 400;
		font-size: 13px;
		color: #666;
	}
</style>
