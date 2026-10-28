<script lang="ts">
	import type { PettyCashBookData } from '$lib/content/documents';
	import ColumnTable from '../ColumnTable.svelte';
	import { pettyCashColumns } from '../formColumns';

	let {
		data
	}: {
		data: PettyCashBookData;
	} = $props();
</script>

<ColumnTable columns={pettyCashColumns(data.columns)} rows={data.rows} minWidth={640}>
	{#snippet caption()}{data.header.title ?? '小口現金出納帳'}{/snippet}
</ColumnTable>
