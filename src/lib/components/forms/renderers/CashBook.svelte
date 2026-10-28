<script lang="ts">
	import type { CashBookData } from '$lib/content/documents';
	import ColumnTable from '../ColumnTable.svelte';
	import { CASH_BOOK_COLUMNS } from '../formColumns';

	let {
		data
	}: {
		data: CashBookData;
	} = $props();
</script>

<ColumnTable columns={CASH_BOOK_COLUMNS} rows={data.rows} minWidth={480}>
	{#snippet caption()}{data.header.title ?? '現金出納帳'}{/snippet}
</ColumnTable>
