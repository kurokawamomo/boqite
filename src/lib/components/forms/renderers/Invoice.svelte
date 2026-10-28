<script lang="ts">
	import type { InvoiceData } from '$lib/content/documents';
	import ColumnTable from '../ColumnTable.svelte';
	import { INVOICE_COLUMNS } from '../formColumns';

	/** 請求書・納品書・領収書（docs/form-schema.md §4-17）。stimulus 表示が主用途。 */
	let {
		data
	}: {
		data: InvoiceData;
	} = $props();
</script>

<div class="invoice">
	<div class="invoice-title">{data.header.title ?? '請求書'}</div>

	<div class="invoice-parties">
		<span class="addressee">{data.addressee}</span>
		<span class="issuer">{data.issuer}</span>
	</div>

	{#if data.issuedOn || data.dueDate}
		<div class="invoice-dates">
			{#if data.issuedOn}<span>発行日: {data.issuedOn}</span>{/if}
			{#if data.dueDate}<span>支払期日: {data.dueDate}</span>{/if}
		</div>
	{/if}

	<ColumnTable columns={INVOICE_COLUMNS} rows={data.rows} class="invoice-table" />

	<div class="invoice-footer">
		{#if data.taxAmount !== undefined}
			<div class="footer-line">消費税: {data.taxAmount}</div>
		{/if}
		<div class="footer-line total">合計: {data.total}</div>
	</div>

	{#if data.note}
		<div class="invoice-note">{data.note}</div>
	{/if}
</div>

<style>
	.invoice {
		display: inline-block;
		border: 1px solid #ccc;
		border-radius: 8px;
		padding: 12px;
		box-sizing: border-box;
		max-width: 100%;
		min-width: 300px;
		background: #fffdf8;
	}

	.invoice-title {
		text-align: center;
		font-weight: 800;
		font-size: 18px;
		letter-spacing: 0.1em;
		margin-bottom: 12px;
	}

	.invoice-parties {
		display: flex;
		justify-content: space-between;
		font-size: 13px;
		margin-bottom: 6px;
	}

	.addressee {
		font-weight: 700;
	}

	.invoice-dates {
		display: flex;
		gap: 16px;
		font-size: 12px;
		color: #666;
		margin-bottom: 10px;
	}

	.invoice :global(.invoice-table) {
		width: 100%;
		margin-bottom: 8px;
	}

	.invoice :global(.invoice-table th),
	.invoice :global(.invoice-table td.cell) {
		padding: 4px 4px;
		font-size: 12px;
	}

	.invoice :global(.invoice-table td.cell) {
		white-space: normal;
		overflow-wrap: anywhere;
	}

	.invoice-footer {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 2px;
		font-size: 13px;
	}

	.footer-line.total {
		font-weight: 800;
		font-size: 15px;
	}

	.invoice-note {
		margin-top: 10px;
		font-size: 12px;
		color: #666;
		border-top: 1px dashed #ccc;
		padding-top: 8px;
	}
</style>
