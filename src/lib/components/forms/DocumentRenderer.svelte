<script lang="ts">
	import type { Document } from '$lib/content/documents';
	import TAccount from './renderers/TAccount.svelte';
	import JournalForm from './renderers/JournalForm.svelte';
	import JournalBook from './renderers/JournalBook.svelte';
	import CashBook from './renderers/CashBook.svelte';
	import TrialBalance from './renderers/TrialBalance.svelte';
	import PettyCashBook from './renderers/PettyCashBook.svelte';
	import TradeBook from './renderers/TradeBook.svelte';
	import SubsidiaryLedger from './renderers/SubsidiaryLedger.svelte';
	import InventoryLedger from './renderers/InventoryLedger.svelte';
	import BillsBook from './renderers/BillsBook.svelte';
	import GeneralLedger from './renderers/GeneralLedger.svelte';
	import CheckingBook from './renderers/CheckingBook.svelte';
	import FixedAssetLedger from './renderers/FixedAssetLedger.svelte';
	import Slip from './renderers/Slip.svelte';
	import DailyJournalSummary from './renderers/DailyJournalSummary.svelte';
	import Invoice from './renderers/Invoice.svelte';
	import TaxNotice from './renderers/TaxNotice.svelte';
	import BankStatement from './renderers/BankStatement.svelte';
	import Receipt from './renderers/Receipt.svelte';
	import TransferRequest from './renderers/TransferRequest.svelte';
	import ExpenseReport from './renderers/ExpenseReport.svelte';
	import MaterialLedger from './renderers/MaterialLedger.svelte';
	import CostSheet from './renderers/CostSheet.svelte';
	import CostReport from './renderers/CostReport.svelte';
	import ProfitTable from './renderers/ProfitTable.svelte';
	import DepartmentTable from './renderers/DepartmentTable.svelte';
	import ConsolidationWorksheet from './renderers/ConsolidationWorksheet.svelte';
	import EquityStatement from './renderers/EquityStatement.svelte';
	import BankReconciliation from './renderers/BankReconciliation.svelte';
	import Worksheet from './renderers/Worksheet.svelte';
	import Statement from './renderers/Statement.svelte';

	let { document }: { document: Document } = $props();
</script>

{#if document.type === 't_account'}
	<TAccount data={document.data} />
{:else if document.type === 'journal_form'}
	<JournalForm data={document.data} />
{:else if document.type === 'journal_book'}
	<JournalBook data={document.data} />
{:else if document.type === 'cash_book'}
	<CashBook data={document.data} />
{:else if document.type === 'trial_balance'}
	<TrialBalance data={document.data} />
{:else if document.type === 'petty_cash_book'}
	<PettyCashBook data={document.data} />
{:else if document.type === 'purchase_book'}
	<TradeBook data={document.data} title="仕入帳" />
{:else if document.type === 'sales_book'}
	<TradeBook data={document.data} title="売上帳" />
{:else if document.type === 'supplier_ledger'}
	<SubsidiaryLedger data={document.data} title="買掛金元帳" />
{:else if document.type === 'customer_ledger'}
	<SubsidiaryLedger data={document.data} title="売掛金元帳" />
{:else if document.type === 'inventory_ledger'}
	<InventoryLedger data={document.data} />
{:else if document.type === 'bills_receivable_book'}
	<BillsBook data={document.data} variant="receivable" />
{:else if document.type === 'bills_payable_book'}
	<BillsBook data={document.data} variant="payable" />
{:else if document.type === 'general_ledger'}
	<GeneralLedger data={document.data} />
{:else if document.type === 'checking_book'}
	<CheckingBook data={document.data} />
{:else if document.type === 'fixed_asset_ledger'}
	<FixedAssetLedger data={document.data} />
{:else if document.type === 'slip'}
	<Slip data={document.data} />
{:else if document.type === 'daily_journal_summary'}
	<DailyJournalSummary data={document.data} />
{:else if document.type === 'invoice'}
	<Invoice data={document.data} />
{:else if document.type === 'tax_notice'}
	<TaxNotice data={document.data} />
{:else if document.type === 'bank_statement'}
	<BankStatement data={document.data} />
{:else if document.type === 'receipt'}
	<Receipt data={document.data} />
{:else if document.type === 'transfer_request'}
	<TransferRequest data={document.data} />
{:else if document.type === 'expense_report'}
	<ExpenseReport data={document.data} />
{:else if document.type === 'material_ledger'}
	<MaterialLedger data={document.data} />
{:else if document.type === 'cost_sheet'}
	<CostSheet data={document.data} />
{:else if document.type === 'cost_report'}
	<CostReport data={document.data} />
{:else if document.type === 'profit_table'}
	<ProfitTable data={document.data} />
{:else if document.type === 'department_table'}
	<DepartmentTable data={document.data} />
{:else if document.type === 'consolidation_worksheet'}
	<ConsolidationWorksheet data={document.data} />
{:else if document.type === 'equity_statement'}
	<EquityStatement data={document.data} />
{:else if document.type === 'bank_reconciliation'}
	<BankReconciliation data={document.data} />
{:else if document.type === 'worksheet'}
	<Worksheet data={document.data} />
{:else if document.type === 'pl'}
	<Statement data={document.data} variant="pl" />
{:else if document.type === 'bs'}
	<Statement data={document.data} variant="bs" />
{:else}
	<!-- Document は判別共用体として網羅済み（documents.ts の DOCUMENT_TYPES で保証）。
	     未知の値が来た場合のみの防御線。 -->
	<p class="unsupported">この様式のレンダラは未実装です</p>
{/if}

<style>
	.unsupported {
		padding: 12px;
		border: 2px dashed #e0e0e0;
		border-radius: 8px;
		color: #888;
		font-size: 13px;
	}
</style>
