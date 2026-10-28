<script lang="ts">
	import type { DepartmentTableData } from '$lib/content/documents';
	import ColumnTable from '../ColumnTable.svelte';
	import { departmentTableColumns } from '../formColumns';

	let {
		data
	}: {
		data: DepartmentTableData;
	} = $props();
</script>

<ColumnTable columns={departmentTableColumns(data.departments)} rows={data.rows}>
	{#snippet caption()}{data.header.title ?? '部門費配分表'}{#if data.header.subject}<span class="subject">（{data.header.subject}）</span>{/if}{/snippet}
</ColumnTable>

<style>
	.subject {
		font-weight: 400;
		font-size: 13px;
		color: #666;
	}
</style>
