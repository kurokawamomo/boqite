<script lang="ts">
	import type { TAccountData } from '$lib/content/documents';
	import ColumnTable from '../ColumnTable.svelte';
	import { T_ACCOUNT_COLUMNS } from '../formColumns';

	let {
		data
	}: {
		data: TAccountData;
	} = $props();
</script>

<div class="t-account">
	<div class="subject">
		{data.header.subject ?? ''}{#if data.header.folio}<span class="folio">({data.header.folio})</span>{/if}
	</div>

	<div class="sides">
		<div class="side">
			<ColumnTable columns={T_ACCOUNT_COLUMNS} rows={data.debit} showHeader={false} />
		</div>
		<div class="side credit">
			<ColumnTable columns={T_ACCOUNT_COLUMNS} rows={data.credit} showHeader={false} />
		</div>
	</div>
</div>

<style>
	.t-account {
		display: inline-block;
		min-width: 420px;
	}

	.subject {
		text-align: center;
		font-weight: 800;
		font-size: 15px;
		margin-bottom: 4px;
		border-bottom: 2px solid #333;
		padding-bottom: 4px;
	}

	.folio {
		font-weight: 400;
		font-size: 12px;
		margin-left: 6px;
		color: #666;
	}

	.sides {
		display: flex;
	}

	.side {
		flex: 1;
		min-width: 210px;
	}

	.side :global(table) {
		width: 100%;
	}

	.side.credit {
		border-left: 2px solid #333;
	}
</style>
