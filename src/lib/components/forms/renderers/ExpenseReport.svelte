<script lang="ts">
	import type { ExpenseReportData } from '$lib/content/documents';
	import ColumnTable from '../ColumnTable.svelte';
	import { ATTACHED_RECEIPT_COLUMNS, EXPENSE_REPORT_COLUMNS } from '../formColumns';

	let {
		data
	}: {
		data: ExpenseReportData;
	} = $props();
</script>

<div class="expense-report">
	<div class="report-title">{data.header.title ?? '旅費交通費支払報告書'}</div>

	<div class="report-parties">
		{#if data.addressee}<span class="addressee">{data.addressee}</span>{/if}
		<span class="submitter">{data.submitter}</span>
	</div>

	<ColumnTable columns={EXPENSE_REPORT_COLUMNS} rows={data.rows} class="report-table" />

	<div class="report-total">合計支出金額: {data.total}</div>

	{#if data.receipts.length > 0}
		<ColumnTable columns={ATTACHED_RECEIPT_COLUMNS} rows={data.receipts} class="receipt-table">
			{#snippet caption()}添付の領収書{/snippet}
		</ColumnTable>
	{/if}
</div>

<style>
	.expense-report {
		display: inline-block;
		border: 1px solid #ccc;
		border-radius: 8px;
		padding: 16px;
		box-sizing: border-box;
		max-width: 100%;
		min-width: 300px;
		background: #fffdf8;
	}

	.report-title {
		text-align: center;
		font-weight: 800;
		font-size: 17px;
		margin-bottom: 12px;
	}

	.report-parties {
		display: flex;
		justify-content: space-between;
		font-size: 13px;
		margin-bottom: 8px;
	}

	.addressee {
		font-weight: 700;
	}

	.expense-report :global(.report-table) {
		width: 100%;
		margin-bottom: 8px;
	}

	.report-total {
		text-align: right;
		font-weight: 800;
		font-size: 14px;
		margin-bottom: 14px;
	}

	.expense-report :global(.receipt-table) {
		width: 100%;
	}
</style>
