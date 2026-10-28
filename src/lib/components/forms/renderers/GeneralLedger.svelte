<script lang="ts">
	import type { GeneralLedgerData } from '$lib/content/documents';
	import ColumnTable from '../ColumnTable.svelte';
	import SubsidiaryLedger from './SubsidiaryLedger.svelte';
	import { LEDGER_SIDE_COLUMNS } from '../formColumns';

	/**
	 * 総勘定元帳。試験では標準式（左右分割）と残高式の双方が出る（docs/form-schema.md §4-3）。
	 * 残高式は列構成が RunningBalanceCells で買掛金元帳等と同一のため SubsidiaryLedger を流用する。
	 */
	let {
		data
	}: {
		data: GeneralLedgerData;
	} = $props();
</script>

{#if data.layout === 'bilateral'}
	<div class="general-ledger">
		<div class="subject">
			{data.header.subject ?? ''}{#if data.header.folio}<span class="folio">（元丁：{data.header.folio}）</span>{/if}
		</div>

		<div class="sides">
			<ColumnTable columns={LEDGER_SIDE_COLUMNS('借方')} rows={data.debit} minWidth={280} />
			<ColumnTable columns={LEDGER_SIDE_COLUMNS('貸方')} rows={data.credit} minWidth={280} />
		</div>
	</div>
{:else}
	<SubsidiaryLedger data={{ header: data.header, rows: data.rows }} title="総勘定元帳" />
{/if}

<style>
	.general-ledger {
		display: inline-block;
	}

	.subject {
		font-weight: 800;
		font-size: 15px;
		margin-bottom: 6px;
	}

	.folio {
		font-weight: 400;
		font-size: 13px;
		color: #666;
	}

	.sides {
		display: flex;
		gap: 12px;
	}
</style>
