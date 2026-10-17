<script lang="ts">
	import type { TrialBalanceData } from '$lib/content/documents';
	import ColumnTable from '../ColumnTable.svelte';
	import { trialBalanceColumns } from '../formColumns';

	let {
		data
	}: {
		data: TrialBalanceData;
	} = $props();
</script>

<ColumnTable columns={trialBalanceColumns(data.variant)} rows={data.rows} minWidth={480}>
	{#snippet caption()}{data.header.title ?? '試算表'}{/snippet}
</ColumnTable>
