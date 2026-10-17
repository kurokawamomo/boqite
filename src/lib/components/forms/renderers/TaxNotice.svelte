<script lang="ts">
	import type { TaxNoticeData } from '$lib/content/documents';
	import ColumnTable from '../ColumnTable.svelte';
	import { TAX_NOTICE_COLUMNS } from '../formColumns';

	/** 納付書・領収証書（docs/form-schema.md §4-19）。stimulus 表示が主用途。 */
	let {
		data
	}: {
		data: TaxNoticeData;
	} = $props();
</script>

<div class="tax-notice">
	<div class="notice-title">{data.header.title ?? '領収証書'}</div>

	<div class="notice-meta">
		<span class="tax-type">科目: {data.taxType}</span>
		<span class="filing-type" class:active={data.filingType === '中間申告'}>中間申告</span>
		<span class="filing-type" class:active={data.filingType === '確定申告'}>確定申告</span>
	</div>

	{#if data.fiscalPeriod || data.paidOn}
		<div class="notice-dates">
			{#if data.fiscalPeriod}<span>事業年度: {data.fiscalPeriod}</span>{/if}
			{#if data.paidOn}<span>納付年月日: {data.paidOn}</span>{/if}
		</div>
	{/if}

	<ColumnTable columns={TAX_NOTICE_COLUMNS} rows={data.rows} showHeader={false} class="notice-table" />

	<div class="notice-total">合計額: {data.total}</div>
</div>

<style>
	.tax-notice {
		display: inline-block;
		border: 2px solid #333;
		border-radius: 6px;
		padding: 14px;
		min-width: 280px;
	}

	.notice-title {
		text-align: center;
		font-weight: 800;
		font-size: 16px;
		margin-bottom: 10px;
		border-bottom: 2px solid #333;
		padding-bottom: 6px;
	}

	.notice-meta {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 12px;
		margin-bottom: 10px;
	}

	.notice-dates {
		display: flex;
		flex-direction: column;
		gap: 2px;
		font-size: 12px;
		color: #666;
		margin-bottom: 10px;
	}

	.filing-type {
		padding: 2px 8px;
		border: 1px solid #ccc;
		border-radius: 999px;
		color: #999;
	}

	.filing-type.active {
		border-color: #d9534f;
		color: #d9534f;
		font-weight: 700;
		background: #fff0f0;
	}

	.tax-notice :global(.notice-table) {
		width: 100%;
		margin-bottom: 8px;
	}

	.notice-total {
		text-align: right;
		font-weight: 800;
		font-size: 14px;
	}
</style>
