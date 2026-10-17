<script lang="ts">
	import type { BankReconciliationData } from '$lib/content/documents';
	import ColumnTable from '../ColumnTable.svelte';
	import { bankReconciliationColumns } from '../formColumns';

	let {
		data
	}: {
		data: BankReconciliationData;
	} = $props();
</script>

<div class="reconciliation">
	<div class="title">{data.header.title ?? '銀行勘定調整表'}</div>
	<div class="sides">
		<ColumnTable columns={bankReconciliationColumns('企業の残高')} rows={data.debit} minWidth={240} />
		<ColumnTable columns={bankReconciliationColumns('銀行の残高')} rows={data.credit} minWidth={240} />
	</div>
</div>

<style>
	.reconciliation {
		display: inline-block;
	}

	.title {
		text-align: center;
		font-weight: 800;
		font-size: 15px;
		margin-bottom: 6px;
	}

	.sides {
		display: flex;
		gap: 12px;
	}
</style>
