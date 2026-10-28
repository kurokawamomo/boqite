<script lang="ts">
	import type { JournalBookData } from '$lib/content/documents';
	import ColumnTable from '../ColumnTable.svelte';
	import { JOURNAL_BOOK_COLUMNS } from '../formColumns';

	let {
		data
	}: {
		data: JournalBookData;
	} = $props();
</script>

<ColumnTable columns={JOURNAL_BOOK_COLUMNS} rows={data.rows}>
	{#snippet caption()}
		{data.header.title ?? '仕訳帳'}{#if data.header.folio}<span class="folio">({data.header.folio})</span>{/if}
	{/snippet}
</ColumnTable>

<style>
	.folio {
		font-weight: 400;
		font-size: 13px;
		color: #666;
	}
</style>
