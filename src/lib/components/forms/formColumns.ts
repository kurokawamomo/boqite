import type {
	AmountItemCells,
	AttachedReceiptCells,
	BankReconciliationCells,
	BankStatementCells,
	BillsBookCells,
	CashBookCells,
	CellRef,
	CheckingBookCells,
	ConsolidationWorksheetCells,
	CostReportCells,
	CostSheetCells,
	DailyJournalSummaryCells,
	DepartmentTableCells,
	Document,
	EquityStatementCells,
	ExpenseReportCells,
	FixedAssetLedgerCells,
	FormRow,
	InventoryLedgerCells,
	InvoiceItemCells,
	JournalBookCells,
	JournalFormCells,
	LedgerCells,
	PettyCashBookCells,
	ProfitTableCells,
	ProfitTableData,
	RunningBalanceCells,
	SingleSideSlipCells,
	SlipData,
	StatementCells,
	TAccountCells,
	TradeBookCells,
	TrialBalanceCells,
	TrialBalanceData,
	WorksheetCells
} from '$lib/content/documents';
import { refFor } from './refs';

/**
 * 様式ごとの列定義。描画（ColumnTable）と検査（check-content / 解答可能性テスト）が
 * 同じ定義を読む。画面に出る列はここに書いた列だけ、という単一の事実にする。
 *
 * セルの型（documents.ts の *Cells）にあるフィールドが列定義から漏れると、
 * {@link defineColumns} がコンパイルエラーにする。
 */

/**
 * 行の role から決まる見た目のうち、その列が受けるもの。
 * - plain: 受けない
 * - bold: 太字
 * - text: 太字 + 字下げ + 斜体（摘要など文章の列）
 * - indent: 字下げ + 斜体（太字にはしない）
 */
export type ColumnEmphasis = 'plain' | 'bold' | 'text' | 'indent';

export type Column = {
	/**
	 * row.cells 内のパス。`date` / `trialBalance.debit` / `breakdown.旅費交通費`。
	 * layers 列では配列フィールド名と要素内フィールドを繋ぐ（`received.quantity`）。
	 */
	path: string;
	label: string;
	align?: 'left' | 'right' | 'center';
	emphasis?: ColumnEmphasis;
	/** 上段見出し。同じ値が連続する列を 1 つの見出しにまとめる */
	group?: string;
	width?: number;
	/** 1 行に複数レイヤ（先入先出法の商品有高帳）が縦積みになる列 */
	layers?: boolean;
};

/** 1 つの罫線表。BilateralBook は借方・貸方で 2 つ */
export type FormTable = {
	rows: Array<FormRow<unknown>>;
	columns: Column[];
};

type ColumnBase = Omit<Column, 'path'>;

/** セル型 TCells の直下のキー、または `親.子` の 2 階層 */
type TopKey<TCells> = keyof TCells & string;

/**
 * 列定義の作成。TCells のキーを 1 つでも列に使っていなければ型エラーにする。
 * `path` の先頭セグメントがキーに対応する。
 */
export function defineColumns<TCells>() {
	return <const K extends TopKey<TCells>>(
		columns: ReadonlyArray<{ path: K | `${K}.${string}` } & ColumnBase> &
			([Exclude<TopKey<TCells>, K>] extends [never]
				? unknown
				: { missingColumnFor: Exclude<TopKey<TCells>, K> })
	): Column[] => columns as unknown as Column[];
}

/* ------------------------------------------------------------------ *
 * 残高式（買掛金元帳・売掛金元帳・総勘定元帳の残高式）
 * ------------------------------------------------------------------ */

export const RUNNING_BALANCE_COLUMNS = defineColumns<RunningBalanceCells>()([
	{ path: 'date', label: '年月日', width: 90 },
	{ path: 'summary', label: '摘要', emphasis: 'text' },
	{ path: 'folio', label: '仕丁', align: 'center', width: 50 },
	{ path: 'debit', label: '借方', align: 'right', emphasis: 'bold', width: 100 },
	{ path: 'credit', label: '貸方', align: 'right', emphasis: 'bold', width: 100 },
	{ path: 'side', label: '借/貸', align: 'center', width: 50 },
	{ path: 'balance', label: '残高', align: 'right', emphasis: 'bold', width: 100 }
]);

/* ------------------------------------------------------------------ *
 * 標準式総勘定元帳（借方・貸方の各側）
 * ------------------------------------------------------------------ */

export const LEDGER_SIDE_COLUMNS = (sideLabel: '借方' | '貸方'): Column[] =>
	defineColumns<LedgerCells>()([
		{ path: 'date', label: '日付', width: 80 },
		{ path: 'summary', label: '摘要', emphasis: 'text' },
		{ path: 'folio', label: '仕丁', align: 'center', width: 50 },
		{ path: 'amount', label: sideLabel, align: 'right', emphasis: 'bold', width: 80 }
	]);

/* ------------------------------------------------------------------ *
 * T 勘定（見出しなし）
 * ------------------------------------------------------------------ */

export const T_ACCOUNT_COLUMNS = defineColumns<TAccountCells>()([
	{ path: 'date', label: '日付', emphasis: 'indent' },
	{ path: 'counterAccount', label: '相手科目', emphasis: 'text' },
	{ path: 'amount', label: '金額', align: 'right', emphasis: 'bold' }
]);

/* ------------------------------------------------------------------ *
 * 仕訳系
 * ------------------------------------------------------------------ */

export const JOURNAL_FORM_COLUMNS = defineColumns<JournalFormCells>()([
	{ path: 'debitAccount', label: '科目', group: '借方', emphasis: 'bold' },
	{ path: 'debitAmount', label: '金額', group: '借方', align: 'right', emphasis: 'bold' },
	{ path: 'creditAccount', label: '科目', group: '貸方', emphasis: 'bold' },
	{ path: 'creditAmount', label: '金額', group: '貸方', align: 'right', emphasis: 'bold' }
]);

export const JOURNAL_BOOK_COLUMNS = defineColumns<JournalBookCells>()([
	{ path: 'date', label: '×年', width: 80 },
	{ path: 'summary', label: '摘要', emphasis: 'text' },
	{ path: 'folio', label: '元丁', align: 'center', width: 50 },
	{ path: 'debit', label: '借方', align: 'right', emphasis: 'bold', width: 100 },
	{ path: 'credit', label: '貸方', align: 'right', emphasis: 'bold', width: 100 }
]);

/* ------------------------------------------------------------------ *
 * 出納帳系
 * ------------------------------------------------------------------ */

export const CASH_BOOK_COLUMNS = defineColumns<CashBookCells>()([
	{ path: 'date', label: '日付', width: 80 },
	{ path: 'summary', label: '摘要', emphasis: 'text' },
	{ path: 'income', label: '収入', align: 'right', emphasis: 'bold', width: 90 },
	{ path: 'expense', label: '支出', align: 'right', emphasis: 'bold', width: 90 },
	{ path: 'balance', label: '残高', align: 'right', emphasis: 'bold', width: 90 }
]);

export const CHECKING_BOOK_COLUMNS = defineColumns<CheckingBookCells>()([
	{ path: 'date', label: '年月日', width: 80 },
	{ path: 'summary', label: '摘要', emphasis: 'text' },
	{ path: 'checkNo', label: '小切手番号', align: 'center', width: 90 },
	{ path: 'deposit', label: '預入', align: 'right', emphasis: 'bold', width: 90 },
	{ path: 'withdrawal', label: '引出', align: 'right', emphasis: 'bold', width: 90 },
	{ path: 'side', label: '借/貸', align: 'center', width: 50 },
	{ path: 'balance', label: '残高', align: 'right', emphasis: 'bold', width: 90 }
]);

export function pettyCashColumns(breakdownColumns: readonly string[]): Column[] {
	return defineColumns<PettyCashBookCells>()([
		{ path: 'receipt', label: '受入', align: 'right', emphasis: 'bold', width: 90 },
		{ path: 'date', label: '年月日', width: 90 },
		{ path: 'summary', label: '摘要', emphasis: 'text' },
		{ path: 'payment', label: '支払金額', align: 'right', emphasis: 'bold', width: 90 },
		...breakdownColumns.map((name) => ({
			path: `breakdown.${name}` as const,
			label: name,
			align: 'right' as const,
			emphasis: 'bold' as const,
			width: 90
		}))
	]);
}

/* ------------------------------------------------------------------ *
 * 仕入帳・売上帳
 * ------------------------------------------------------------------ */

export const TRADE_BOOK_COLUMNS = defineColumns<TradeBookCells>()([
	{ path: 'date', label: '年月日', width: 90 },
	{ path: 'summary', label: '摘要', emphasis: 'text' },
	{ path: 'detail', label: '内訳', align: 'right', emphasis: 'bold', width: 100 },
	{ path: 'amount', label: '金額', align: 'right', emphasis: 'bold', width: 100 }
]);

/* ------------------------------------------------------------------ *
 * 商品有高帳
 * ------------------------------------------------------------------ */

export const INVENTORY_LEDGER_COLUMNS = defineColumns<InventoryLedgerCells>()([
	{ path: 'date', label: '日付', width: 70 },
	{ path: 'summary', label: '摘要', emphasis: 'text', width: 140 },
	{ path: 'received.quantity', label: '数量', group: '受入', layers: true, align: 'right' },
	{ path: 'received.unitPrice', label: '単価', group: '受入', layers: true, align: 'right' },
	{ path: 'received.amount', label: '金額', group: '受入', layers: true, align: 'right' },
	{ path: 'shipped.quantity', label: '数量', group: '払出', layers: true, align: 'right' },
	{ path: 'shipped.unitPrice', label: '単価', group: '払出', layers: true, align: 'right' },
	{ path: 'shipped.amount', label: '金額', group: '払出', layers: true, align: 'right' },
	{ path: 'balance.quantity', label: '数量', group: '残高', layers: true, align: 'right' },
	{ path: 'balance.unitPrice', label: '単価', group: '残高', layers: true, align: 'right' },
	{ path: 'balance.amount', label: '金額', group: '残高', layers: true, align: 'right' }
]);

/* ------------------------------------------------------------------ *
 * 手形記入帳・固定資産台帳
 * ------------------------------------------------------------------ */

export function billsBookColumns(variant: 'receivable' | 'payable'): Column[] {
	return defineColumns<BillsBookCells>()([
		{ path: 'date', label: '年月日', width: 80 },
		{ path: 'billType', label: '手形種類', align: 'center', width: 60 },
		{ path: 'billNo', label: '手形番号', align: 'center', width: 60 },
		{ path: 'summary', label: '摘要', emphasis: 'text' },
		{
			path: 'counterparty',
			label: variant === 'receivable' ? '支払人' : '受取人',
			width: 100
		},
		{
			path: 'drawer',
			label: variant === 'receivable' ? '振出人または裏書人' : '振出人',
			width: 100
		},
		{ path: 'issueDate', label: '振出日', width: 80 },
		{ path: 'dueDate', label: '満期日', width: 80 },
		{ path: 'payingBank', label: '支払場所', width: 100 },
		{ path: 'amount', label: '金額', align: 'right', emphasis: 'bold', width: 90 },
		{ path: 'settlementDate', label: 'てん末（年月日）', width: 80 },
		{ path: 'settlementSummary', label: 'てん末（摘要）' }
	]);
}

export const FIXED_ASSET_LEDGER_COLUMNS = defineColumns<FixedAssetLedgerCells>()([
	{ path: 'acquiredOn', label: '取得日', width: 80 },
	{ path: 'name', label: '名称', emphasis: 'text' },
	{ path: 'quantity', label: '数量', align: 'right', width: 70 },
	{ path: 'method', label: '償却方法', align: 'center', width: 70 },
	{ path: 'usefulLife', label: '耐用年数', align: 'center', width: 70 },
	{ path: 'cost', label: '取得原価', align: 'right', width: 90 },
	{ path: 'openingAccumulated', label: '期首減価償却累計額', align: 'right', width: 90 },
	{ path: 'openingBookValue', label: '差引期首帳簿価額', align: 'right', width: 90 },
	{ path: 'depreciation', label: '当期減価償却費', align: 'right', width: 90 },
	{ path: 'closingBookValue', label: '期末帳簿価額', align: 'right', emphasis: 'bold', width: 90 }
]);

/* ------------------------------------------------------------------ *
 * 集計表
 * ------------------------------------------------------------------ */

export function trialBalanceColumns(variant: TrialBalanceData['variant']): Column[] {
	const showTotal = variant === 'total' || variant === 'total_balance';
	const showBalance = variant === 'balance' || variant === 'total_balance';
	const all = defineColumns<TrialBalanceCells>()([
		{ path: 'debitBalance', label: '借方残高', align: 'right', emphasis: 'bold', width: 110 },
		{ path: 'debitTotal', label: '借方合計', align: 'right', emphasis: 'bold', width: 110 },
		{ path: 'accountName', label: '勘定科目', align: 'center', emphasis: 'bold', width: 160 },
		{ path: 'creditTotal', label: '貸方合計', align: 'right', emphasis: 'bold', width: 110 },
		{ path: 'creditBalance', label: '貸方残高', align: 'right', emphasis: 'bold', width: 110 }
	]);
	return all.filter((c) => {
		if (c.path.endsWith('Balance')) return showBalance;
		if (c.path.endsWith('Total')) return showTotal;
		return true;
	});
}

export const DAILY_JOURNAL_SUMMARY_COLUMNS = defineColumns<DailyJournalSummaryCells>()([
	{ path: 'debit', label: '借方', align: 'right', emphasis: 'bold', width: 100 },
	{ path: 'debitFolio', label: '元丁', align: 'center', width: 50 },
	{ path: 'accountName', label: '勘定科目', align: 'center', emphasis: 'bold', width: 140 },
	{ path: 'creditFolio', label: '元丁', align: 'center', width: 50 },
	{ path: 'credit', label: '貸方', align: 'right', emphasis: 'bold', width: 100 }
]);

export const WORKSHEET_COLUMNS = defineColumns<WorksheetCells>()([
	{ path: 'accountName', label: '勘定科目', emphasis: 'text', width: 140 },
	{ path: 'trialBalance.debit', label: '借方', group: '残高試算表', align: 'right', emphasis: 'bold', width: 80 },
	{ path: 'trialBalance.credit', label: '貸方', group: '残高試算表', align: 'right', emphasis: 'bold', width: 80 },
	{ path: 'adjustment.debit', label: '借方', group: '修正記入', align: 'right', emphasis: 'bold', width: 80 },
	{ path: 'adjustment.credit', label: '貸方', group: '修正記入', align: 'right', emphasis: 'bold', width: 80 },
	{ path: 'incomeStatement.debit', label: '借方', group: '損益計算書', align: 'right', emphasis: 'bold', width: 80 },
	{ path: 'incomeStatement.credit', label: '貸方', group: '損益計算書', align: 'right', emphasis: 'bold', width: 80 },
	{ path: 'balanceSheet.debit', label: '借方', group: '貸借対照表', align: 'right', emphasis: 'bold', width: 80 },
	{ path: 'balanceSheet.credit', label: '貸方', group: '貸借対照表', align: 'right', emphasis: 'bold', width: 80 }
]);

/* ------------------------------------------------------------------ *
 * 財務諸表
 * ------------------------------------------------------------------ */

export const statementColumns = (sideLabel: string): Column[] =>
	defineColumns<StatementCells>()([
		{ path: 'label', label: sideLabel, emphasis: 'bold', width: 130 },
		{ path: 'amount', label: '金額', align: 'right', emphasis: 'bold', width: 80 },
		{ path: 'deduction.label', label: '控除', width: 100 },
		{ path: 'deduction.amount', label: '控除額', align: 'right', width: 80 },
		{ path: 'netAmount', label: '純額', align: 'right', emphasis: 'bold', width: 80 }
	]);

/* ------------------------------------------------------------------ *
 * 伝票・証ひょう
 * ------------------------------------------------------------------ */

export const SINGLE_SIDE_SLIP_COLUMNS = defineColumns<SingleSideSlipCells>()([
	{ path: 'account', label: '科目', emphasis: 'bold' },
	{ path: 'amount', label: '金額', align: 'right', emphasis: 'bold' }
]);

export const TRANSFER_SLIP_COLUMNS = defineColumns<JournalFormCells>()([
	{ path: 'debitAccount', label: '借方科目', emphasis: 'bold' },
	{ path: 'debitAmount', label: '金額', align: 'right', emphasis: 'bold' },
	{ path: 'creditAccount', label: '貸方科目', emphasis: 'bold' },
	{ path: 'creditAmount', label: '金額', align: 'right', emphasis: 'bold' }
]);

export function slipColumns(slipType: SlipData['slipType']): Column[] {
	return slipType === 'transfer' ? TRANSFER_SLIP_COLUMNS : SINGLE_SIDE_SLIP_COLUMNS;
}

export const INVOICE_COLUMNS = defineColumns<InvoiceItemCells>()([
	{ path: 'name', label: '品物', emphasis: 'bold' },
	{ path: 'quantity', label: '数量', align: 'right', width: 48 },
	{ path: 'unitPrice', label: '単価', align: 'right', width: 64 },
	{ path: 'amount', label: '金額', align: 'right', emphasis: 'bold', width: 68 }
]);

export const TAX_NOTICE_COLUMNS: Column[] = [
	{ path: 'label', label: '項目' },
	{ path: 'amount', label: '金額', align: 'right' }
];

export const BANK_STATEMENT_COLUMNS = defineColumns<BankStatementCells>()([
	{ path: 'date', label: '日付', width: 48 },
	{ path: 'description', label: '摘要', emphasis: 'bold' },
	{ path: 'payment', label: 'お支払金額', align: 'right', width: 64 },
	{ path: 'deposit', label: 'お預り金額', align: 'right', width: 64 },
	{ path: 'balance', label: '残高', align: 'right', width: 64 }
]);

export const RECEIPT_COLUMNS = defineColumns<AmountItemCells>()([
	{ path: 'description', label: '但し書き', emphasis: 'bold' },
	{ path: 'amount', label: '金額', align: 'right', emphasis: 'bold', width: 100 }
]);

export const TRANSFER_REQUEST_COLUMNS = defineColumns<AmountItemCells>()([
	{ path: 'description', label: '内容', emphasis: 'bold' },
	{ path: 'amount', label: '金額', align: 'right', emphasis: 'bold', width: 100 }
]);

export const EXPENSE_REPORT_COLUMNS = defineColumns<ExpenseReportCells>()([
	{ path: 'date', label: '日付', width: 70 },
	{ path: 'item', label: '区間・用途', emphasis: 'bold' },
	{ path: 'amount', label: '金額', align: 'right', emphasis: 'bold', width: 90 },
	{ path: 'receipt', label: '領収書', align: 'center', width: 70 }
]);

export const ATTACHED_RECEIPT_COLUMNS = defineColumns<AttachedReceiptCells>()([
	{ path: 'issuer', label: '発行元', emphasis: 'bold' },
	{ path: 'amount', label: '金額', align: 'right', emphasis: 'bold', width: 90 }
]);

/* ------------------------------------------------------------------ *
 * 工業簿記・連結会計・純資産の様式（日商2級）
 * ------------------------------------------------------------------ */

/** 材料元帳は商品有高帳と同じ列 */
export const MATERIAL_LEDGER_COLUMNS = INVENTORY_LEDGER_COLUMNS;

/** 原価計算表。製造指図書ごとの列が右に並ぶ */
export function costSheetColumns(orders: readonly string[]): Column[] {
	return defineColumns<CostSheetCells>()([
		{ path: 'label', label: '項目', emphasis: 'bold', width: 120 },
		...orders.map((name) => ({
			path: `byOrder.${name}` as const,
			label: `指図書 ${name}`,
			align: 'right' as const,
			emphasis: 'bold' as const,
			width: 90
		})),
		{ path: 'total', label: '合計', align: 'right', emphasis: 'bold', width: 90 }
	]);
}

/** 製造原価報告書・原価差異の分析表 */
export const COST_REPORT_COLUMNS = defineColumns<CostReportCells>()([
	{ path: 'label', label: '項目', emphasis: 'bold' },
	{ path: 'detail', label: '内訳', align: 'right', width: 100 },
	{ path: 'amount', label: '金額', align: 'right', emphasis: 'bold', width: 100 }
]);

/** 損益分岐点・直接原価計算の損益計算書。with_ratio は率の列が付く */
export function profitTableColumns(variant: ProfitTableData['variant']): Column[] {
	const all = defineColumns<ProfitTableCells>()([
		{ path: 'label', label: '項目', emphasis: 'bold' },
		{ path: 'amount', label: '金額', align: 'right', emphasis: 'bold', width: 110 },
		{ path: 'ratio', label: '率（%）', align: 'right', width: 80 }
	]);
	return variant === 'with_ratio' ? all : all.filter((c) => c.path !== 'ratio');
}

/** 部門費配分表。部門ごとの列が右に並ぶ */
export function departmentTableColumns(departments: readonly string[]): Column[] {
	return defineColumns<DepartmentTableCells>()([
		{ path: 'label', label: '費目', emphasis: 'bold', width: 120 },
		{ path: 'total', label: '合計', align: 'right', emphasis: 'bold', width: 90 },
		...departments.map((name) => ({
			path: `byDepartment.${name}` as const,
			label: name,
			align: 'right' as const,
			emphasis: 'bold' as const,
			width: 90
		}))
	]);
}

export const CONSOLIDATION_WORKSHEET_COLUMNS = defineColumns<ConsolidationWorksheetCells>()([
	{ path: 'accountName', label: '勘定科目', emphasis: 'bold', width: 130 },
	{ path: 'parent', label: '親会社', align: 'right', emphasis: 'bold', width: 90 },
	{ path: 'subsidiary', label: '子会社', align: 'right', emphasis: 'bold', width: 90 },
	{ path: 'adjustment.debit', label: '借方', group: '修正・消去', align: 'right', emphasis: 'bold', width: 80 },
	{ path: 'adjustment.credit', label: '貸方', group: '修正・消去', align: 'right', emphasis: 'bold', width: 80 },
	{ path: 'consolidated', label: '連結', align: 'right', emphasis: 'bold', width: 90 }
]);

export const EQUITY_STATEMENT_COLUMNS = defineColumns<EquityStatementCells>()([
	{ path: 'label', label: '摘要', emphasis: 'bold', width: 130 },
	{ path: 'capital', label: '資本金', group: '株主資本', align: 'right', emphasis: 'bold', width: 80 },
	{ path: 'capitalReserve', label: '資本準備金', group: '資本剰余金', align: 'right', emphasis: 'bold', width: 80 },
	{ path: 'otherCapitalSurplus', label: 'その他資本剰余金', group: '資本剰余金', align: 'right', emphasis: 'bold', width: 90 },
	{ path: 'retainedReserve', label: '利益準備金', group: '利益剰余金', align: 'right', emphasis: 'bold', width: 80 },
	{ path: 'retainedEarnings', label: '繰越利益剰余金', group: '利益剰余金', align: 'right', emphasis: 'bold', width: 90 },
	{ path: 'valuationDifference', label: '評価・換算差額等', align: 'right', emphasis: 'bold', width: 90 },
	{ path: 'total', label: '純資産合計', align: 'right', emphasis: 'bold', width: 90 }
]);

/** 銀行勘定調整表の片側（企業の残高 / 銀行の残高） */
export const bankReconciliationColumns = (sideLabel: string): Column[] =>
	defineColumns<BankReconciliationCells>()([
		{ path: 'label', label: sideLabel, emphasis: 'bold', width: 150 },
		{ path: 'amount', label: '金額', align: 'right', emphasis: 'bold', width: 90 }
	]);

/* ------------------------------------------------------------------ *
 * Document → 画面に出る表
 * ------------------------------------------------------------------ */

/**
 * 文書が画面に描く罫線表の一覧。レンダラはここから自分の表を受け取り、
 * 検査側は同じ関数で「画面に出るセル」を数える。
 */
export function tablesOf(doc: Document): FormTable[] {
	switch (doc.type) {
		case 'journal_form':
			return [{ rows: doc.data.rows, columns: JOURNAL_FORM_COLUMNS }];
		case 'journal_book':
			return [{ rows: doc.data.rows, columns: JOURNAL_BOOK_COLUMNS }];
		case 't_account':
			return [
				{ rows: doc.data.debit, columns: T_ACCOUNT_COLUMNS },
				{ rows: doc.data.credit, columns: T_ACCOUNT_COLUMNS }
			];
		case 'general_ledger':
			return doc.data.layout === 'bilateral'
				? [
						{ rows: doc.data.debit, columns: LEDGER_SIDE_COLUMNS('借方') },
						{ rows: doc.data.credit, columns: LEDGER_SIDE_COLUMNS('貸方') }
					]
				: [{ rows: doc.data.rows, columns: RUNNING_BALANCE_COLUMNS }];
		case 'supplier_ledger':
		case 'customer_ledger':
			return [{ rows: doc.data.rows, columns: RUNNING_BALANCE_COLUMNS }];
		case 'cash_book':
			return [{ rows: doc.data.rows, columns: CASH_BOOK_COLUMNS }];
		case 'checking_book':
			return [{ rows: doc.data.rows, columns: CHECKING_BOOK_COLUMNS }];
		case 'petty_cash_book':
			return [{ rows: doc.data.rows, columns: pettyCashColumns(doc.data.columns) }];
		case 'purchase_book':
		case 'sales_book':
			return [{ rows: doc.data.rows, columns: TRADE_BOOK_COLUMNS }];
		case 'inventory_ledger':
			return [{ rows: doc.data.rows, columns: INVENTORY_LEDGER_COLUMNS }];
		case 'bills_receivable_book':
			return [{ rows: doc.data.rows, columns: billsBookColumns('receivable') }];
		case 'bills_payable_book':
			return [{ rows: doc.data.rows, columns: billsBookColumns('payable') }];
		case 'fixed_asset_ledger':
			return [{ rows: doc.data.rows, columns: FIXED_ASSET_LEDGER_COLUMNS }];
		case 'trial_balance':
			return [{ rows: doc.data.rows, columns: trialBalanceColumns(doc.data.variant) }];
		case 'daily_journal_summary':
			return [{ rows: doc.data.rows, columns: DAILY_JOURNAL_SUMMARY_COLUMNS }];
		case 'worksheet':
			return [{ rows: doc.data.rows, columns: WORKSHEET_COLUMNS }];
		case 'pl':
			return [
				{ rows: doc.data.debit, columns: statementColumns('費用') },
				{ rows: doc.data.credit, columns: statementColumns('収益') }
			];
		case 'bs':
			return [
				{ rows: doc.data.debit, columns: statementColumns('資産') },
				{ rows: doc.data.credit, columns: statementColumns('負債および純資産') }
			];
		case 'slip':
			return [{ rows: doc.data.rows, columns: slipColumns(doc.data.slipType) }];
		case 'invoice':
			return [{ rows: doc.data.rows, columns: INVOICE_COLUMNS }];
		case 'tax_notice':
			return [{ rows: doc.data.rows, columns: TAX_NOTICE_COLUMNS }];
		case 'bank_statement':
			return [{ rows: doc.data.rows, columns: BANK_STATEMENT_COLUMNS }];
		case 'receipt':
			return [{ rows: doc.data.rows, columns: RECEIPT_COLUMNS }];
		case 'transfer_request':
			return [{ rows: doc.data.rows, columns: TRANSFER_REQUEST_COLUMNS }];
		case 'expense_report':
			return [
				{ rows: doc.data.rows, columns: EXPENSE_REPORT_COLUMNS },
				{ rows: doc.data.receipts, columns: ATTACHED_RECEIPT_COLUMNS }
			];
		case 'material_ledger':
			return [{ rows: doc.data.rows, columns: MATERIAL_LEDGER_COLUMNS }];
		case 'cost_sheet':
			return [{ rows: doc.data.rows, columns: costSheetColumns(doc.data.orders) }];
		case 'cost_report':
			return [{ rows: doc.data.rows, columns: COST_REPORT_COLUMNS }];
		case 'profit_table':
			return [{ rows: doc.data.rows, columns: profitTableColumns(doc.data.variant) }];
		case 'department_table':
			return [{ rows: doc.data.rows, columns: departmentTableColumns(doc.data.departments) }];
		case 'consolidation_worksheet':
			return [{ rows: doc.data.rows, columns: CONSOLIDATION_WORKSHEET_COLUMNS }];
		case 'equity_statement':
			return [{ rows: doc.data.rows, columns: EQUITY_STATEMENT_COLUMNS }];
		case 'bank_reconciliation':
			return [
				{ rows: doc.data.debit, columns: bankReconciliationColumns('企業の残高') },
				{ rows: doc.data.credit, columns: bankReconciliationColumns('銀行の残高') }
			];
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** row.cells からパスを辿って値を取る。途中で外れたら undefined */
export function cellAt(cells: unknown, path: string): unknown {
	let value: unknown = cells;
	for (const segment of path.split('.')) {
		if (!isRecord(value)) return undefined;
		value = value[segment];
	}
	return value;
}

/** layers 列のパス `received.quantity` を [配列フィールド, 要素内フィールド] に割る */
function splitLayerPath(path: string): [string, string] {
	const [group, field] = path.split('.');
	return [group, field];
}

/** 列が行に対して描くセルの ref。layers 列は存在するレイヤ数だけ並ぶ */
export function refsOfColumn(row: FormRow<unknown>, column: Column): CellRef[] {
	if (!column.layers) return [refFor(row.key, ...column.path.split('.'))];
	const [group, field] = splitLayerPath(column.path);
	const layers = cellAt(row.cells, group);
	if (!Array.isArray(layers)) return [];
	return layers.map((_, i) => refFor(row.key, group, i, field));
}

/** 文書が画面に描く全セルの ref（空欄が置ける場所の全体） */
export function renderedCellRefs(doc: Document): Set<CellRef> {
	const refs = new Set<CellRef>();
	for (const table of tablesOf(doc)) {
		for (const row of table.rows) {
			for (const column of table.columns) {
				for (const ref of refsOfColumn(row, column)) refs.add(ref);
			}
		}
	}
	return refs;
}

/** 空欄の見出し。上段見出しがあれば「払出 数量」のように繋ぐ。画面に描かれないセルなら undefined */
export function labelForCell(doc: Document, ref: CellRef): string | undefined {
	for (const table of tablesOf(doc)) {
		for (const row of table.rows) {
			for (const column of table.columns) {
				if (refsOfColumn(row, column).includes(ref)) {
					return column.group ? `${column.group} ${column.label}` : column.label;
				}
			}
		}
	}
	return undefined;
}
