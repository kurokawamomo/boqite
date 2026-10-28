<script lang="ts">
	import type { WorksheetData } from '$lib/content/documents';
	import ColumnTable from '../ColumnTable.svelte';
	import { WORKSHEET_COLUMNS } from '../formColumns';

	/** 精算表（docs/form-schema.md §4-14）。 */
	let {
		data
	}: {
		data: WorksheetData;
	} = $props();
</script>

<ColumnTable columns={WORKSHEET_COLUMNS} rows={data.rows} minWidth={900} stickyFirstColumn shadeNetIncome>
	{#snippet caption()}{data.header.title ?? '精算表'}{/snippet}
</ColumnTable>
