<script lang="ts">
	import type { BankStatementData } from '$lib/content/documents';
	import ColumnTable from '../ColumnTable.svelte';
	import { BANK_STATEMENT_COLUMNS } from '../formColumns';

	let {
		data
	}: {
		data: BankStatementData;
	} = $props();
</script>

<ColumnTable columns={BANK_STATEMENT_COLUMNS} rows={data.rows} class="statement-table">
	{#snippet caption()}
		{data.header.title ?? '当座勘定照合表'}{#if data.bankName}<span class="bank-name">（{data.bankName}）</span>{/if}
		{#if data.addressee || data.issuedOn}
			<span class="statement-meta">
				{#if data.addressee}<span>{data.addressee}</span>{/if}
				{#if data.issuedOn}<span>{data.issuedOn}</span>{/if}
			</span>
		{/if}
	{/snippet}
</ColumnTable>

<style>
	:global(.statement-table) {
		width: 100%;
	}

	:global(.statement-table th),
	:global(.statement-table td.cell) {
		padding: 4px 4px;
		font-size: 12px;
	}

	:global(.statement-table td.cell) {
		white-space: normal;
		overflow-wrap: anywhere;
	}

	.statement-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 12px;
		font-weight: 400;
		font-size: 13px;
		color: #666;
	}

	.bank-name {
		font-weight: 400;
		font-size: 13px;
		color: #666;
	}
</style>
