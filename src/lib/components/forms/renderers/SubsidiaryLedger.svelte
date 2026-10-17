<script lang="ts">
	import type { SubsidiaryLedgerData } from '$lib/content/documents';
	import ColumnTable from '../ColumnTable.svelte';
	import { RUNNING_BALANCE_COLUMNS } from '../formColumns';

	/** 買掛金元帳・売掛金元帳・総勘定元帳（残高式）の共通レンダラ。列は RUNNING_BALANCE_COLUMNS。 */
	let {
		data,
		title
	}: {
		data: SubsidiaryLedgerData;
		title: string;
	} = $props();
</script>

<ColumnTable columns={RUNNING_BALANCE_COLUMNS} rows={data.rows} minWidth={620}>
	{#snippet caption()}
		{data.header.title ?? title}{#if data.header.subject}<span class="subject">（{data.header.subject}）</span>{/if}
	{/snippet}
</ColumnTable>

<style>
	.subject {
		font-weight: 400;
		font-size: 13px;
		color: #666;
	}
</style>
