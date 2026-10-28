<script lang="ts">
	import type { CheckingBookData } from '$lib/content/documents';
	import ColumnTable from '../ColumnTable.svelte';
	import { CHECKING_BOOK_COLUMNS } from '../formColumns';

	let {
		data
	}: {
		data: CheckingBookData;
	} = $props();
</script>

<ColumnTable columns={CHECKING_BOOK_COLUMNS} rows={data.rows} minWidth={640}>
	{#snippet caption()}{data.header.title ?? '当座預金出納帳'}{/snippet}
</ColumnTable>
