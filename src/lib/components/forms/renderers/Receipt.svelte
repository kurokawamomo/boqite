<script lang="ts">
	import type { ReceiptData } from '$lib/content/documents';
	import ColumnTable from '../ColumnTable.svelte';
	import { RECEIPT_COLUMNS } from '../formColumns';

	let {
		data
	}: {
		data: ReceiptData;
	} = $props();
</script>

<div class="receipt">
	<div class="receipt-title">{data.header.title ?? '領収書'}</div>

	<div class="receipt-parties">
		<span class="addressee">{data.addressee}</span>
		{#if data.issuedOn}<span class="issued-on">{data.issuedOn}</span>{/if}
	</div>

	<div class="receipt-total">金額: {data.total}</div>

	<ColumnTable columns={RECEIPT_COLUMNS} rows={data.rows} class="receipt-table" />

	{#if data.taxAmount !== undefined}
		<div class="receipt-tax">うち消費税: {data.taxAmount}</div>
	{/if}

	<div class="issuer">{data.issuer}</div>
</div>

<style>
	.receipt {
		display: inline-block;
		border: 1px solid #ccc;
		border-radius: 8px;
		padding: 16px;
		box-sizing: border-box;
		max-width: 100%;
		min-width: 300px;
		background: #fffdf8;
	}

	.receipt-title {
		text-align: center;
		font-weight: 800;
		font-size: 18px;
		letter-spacing: 0.3em;
		margin-bottom: 12px;
	}

	.receipt-parties {
		display: flex;
		justify-content: space-between;
		font-size: 13px;
		margin-bottom: 8px;
	}

	.addressee {
		font-weight: 700;
	}

	.issued-on {
		color: #666;
	}

	.receipt-total {
		font-weight: 800;
		font-size: 16px;
		margin-bottom: 8px;
	}

	.receipt :global(.receipt-table) {
		width: 100%;
		margin-bottom: 8px;
	}

	.receipt-tax {
		text-align: right;
		font-size: 12px;
		color: #666;
	}

	.issuer {
		margin-top: 10px;
		text-align: right;
		font-size: 13px;
		font-weight: 700;
	}
</style>
