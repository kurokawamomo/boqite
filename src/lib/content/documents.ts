/**
 * 帳簿・証ひょう様式のデータスキーマ（仕様書 3章 Document / Phase 3-4）。
 *
 * 設計の骨子:
 *
 * 1. **様式ごとに固有の型を持つ**。行×列の汎用セルグリッドには潰さない。
 *    「収入」「払出」「修正記入・借方」といった欄の意味は列名として型に残す。
 *    レンダラは `document.type` で分岐すれば、その様式専用の型が手に入る。
 * 2. **共通パターンは合成で共有する**。どの帳簿にも現れる
 *    ヘッダ / 明細行 / 繰越行 / 合計行 / 締切線 を {@link BookHeader} {@link FormRow}
 *    {@link RowRole} {@link RuleLine} として一度だけ定義し、各様式がそれを詰める。
 * 3. **空欄は値が null のセル**。答えは {@link FormFillTask.blanks} 側が持つ。
 *    出題用と解答表示用で様式データの型が変わらないので、解説では blanks の答えを
 *    流し込んだ完成様式をそのまま描ける。
 * 4. **セル参照は行キー起点**（{@link CellRef}）。行の追加・削除で他行の参照が壊れない。
 */

/** 行の下に引く罫線。single = 合計線、double = 締切線 */
export type RuleLine = 'single' | 'double';

/**
 * 行の意味。レンダラの字下げ・太字・罫線はこの値から決まり、
 * コンテンツ側が見た目を直接指定することはない。
 */
export type RowRole =
	/** 通常の明細行（既定） */
	| 'entry'
	/** 同一取引の続き行（品名・数量行、仕訳の 2 行目以降） */
	| 'sub_entry'
	/** 小書き（仕訳帳の摘要欄コメント） */
	| 'narration'
	/** 前月繰越・前期繰越・前週繰越 */
	| 'opening'
	/** 次月繰越・次期繰越・次週繰越 */
	| 'carryforward'
	/** 本日補給（小口現金出納帳） */
	| 'replenishment'
	/** 内訳の合計行 */
	| 'subtotal'
	/** 貸借合計行（締切） */
	| 'total'
	/** 総仕入高・純売上高など、末尾の集計行 */
	| 'summary'
	/** 当期純利益・当期純損失の行 */
	| 'net_income'
	/** 以降にも行が続くことを示す「⋮」の行 */
	| 'continued';

/**
 * セル参照。文法は `<rowKey>.<column>` を基本に、入れ子は `.` で継ぐ。
 *
 * - `r-0503.expense`                  現金出納帳 5/3 行の支出欄
 * - `r-shiire.incomeStatement.debit`  精算表 仕入行の損益計算書・借方
 * - `r-1112.shipped.1.amount`         商品有高帳 11/12 行の払出 2 レイヤ目の金額
 * - `r-0402.breakdown.旅費交通費`      小口現金出納帳の内訳列
 *
 * rowKey は様式内で一意。行位置ではなくコンテンツ作成時に採番した ID を使うため、
 * 行を差し込んでも既存の ref は壊れない。
 */
export type CellRef = string;

/** 金額・数量セル。null = 空欄（出題時にくり抜いた欄）または元から記入なし */
export type Amount = number | null;
/** 文字セル。null = 空欄または記入なし */
export type Label = string | null;

/** 帳簿・財務諸表の見出し */
export type BookHeader = {
	/** 「現金出納帳」等。省略時は様式種別の既定名 */
	title?: string;
	/** 勘定科目名・取引先名・商品名（「現金」「ひだまり(株)」「コーヒーカップ」） */
	subject?: string;
	/** 「×1年4月1日から×2年3月31日まで」「×2年3月31日」 */
	period?: string;
	company?: string;
	/** 「(単位：円)」 */
	unit?: string;
	/** 元丁・仕丁・ページ番号 */
	folio?: string;
};

/** 様式の 1 行。cells の形は様式ごとに異なる */
export type FormRow<TCells> = {
	/** 様式内で一意な安定キー。ref の第 1 セグメント */
	key: string;
	/** 省略時 'entry' */
	role?: RowRole;
	/** この行の下に引く罫線 */
	ruledAfter?: RuleLine;
	cells: TCells;
};

/** 行の並びを持つだけの帳簿の共通形。様式は cells 型を与えて具体化する */
export type RowBook<TCells> = {
	header: BookHeader;
	rows: Array<FormRow<TCells>>;
};

/** 借方・貸方が左右に分かれる様式の共通形（T 勘定・標準式元帳・勘定式財務諸表） */
export type BilateralBook<TCells> = {
	header: BookHeader;
	debit: Array<FormRow<TCells>>;
	credit: Array<FormRow<TCells>>;
};

/* ------------------------------------------------------------------ *
 * 仕訳系
 * ------------------------------------------------------------------ */

/** 解答用の仕訳枠（複合仕訳は行を増やす） */
export type JournalFormCells = {
	debitAccount: Label;
	debitAmount: Amount;
	creditAccount: Label;
	creditAmount: Amount;
};
export type JournalFormData = RowBook<JournalFormCells>;

/**
 * 仕訳帳。摘要欄は勘定科目行・諸口行・小書き行が混在するため、
 * 行の役割は role で表し、字下げはレンダラが決める。
 */
export type JournalBookCells = {
	date: Label;
	/** 「（現 金）」「諸 口」「株式の発行」 */
	summary: Label;
	/** 元丁 */
	folio: Label;
	debit: Amount;
	credit: Amount;
};
export type JournalBookData = RowBook<JournalBookCells>;

/* ------------------------------------------------------------------ *
 * 元帳系
 * ------------------------------------------------------------------ */

/** 略式（T 字）元帳の 1 記入 */
export type TAccountCells = {
	date: Label;
	/** 相手科目。複数なら「諸口」 */
	counterAccount: Label;
	amount: Amount;
};
export type TAccountData = BilateralBook<TAccountCells>;

/** 標準式総勘定元帳（借方・貸方が左右に分かれる形） */
export type LedgerCells = {
	date: Label;
	/** 相手科目 */
	summary: Label;
	/** 仕丁 */
	folio: Label;
	amount: Amount;
};

/**
 * 残高式の元帳（補助元帳・仕訳日計表からの転記で使う形）。
 * side は借方残高「借」/ 貸方残高「貸」/ 前日と同じ「〃」。
 */
export type RunningBalanceCells = {
	date: Label;
	summary: Label;
	folio: Label;
	debit: Amount;
	credit: Amount;
	side: Label;
	balance: Amount;
};

/** 総勘定元帳。試験では標準式と残高式の双方が出る */
export type GeneralLedgerData =
	| ({ layout: 'bilateral' } & BilateralBook<LedgerCells>)
	| ({ layout: 'running_balance' } & RowBook<RunningBalanceCells>);

/** 買掛金元帳（仕入先元帳）・売掛金元帳（得意先元帳） */
export type SubsidiaryLedgerData = RowBook<RunningBalanceCells>;

/* ------------------------------------------------------------------ *
 * 出納帳系
 * ------------------------------------------------------------------ */

/** 現金出納帳 */
export type CashBookCells = {
	date: Label;
	summary: Label;
	income: Amount;
	expense: Amount;
	balance: Amount;
};
export type CashBookData = RowBook<CashBookCells>;

/** 当座預金出納帳。side は借方残高「借」/ 当座借越「貸」 */
export type CheckingBookCells = {
	date: Label;
	summary: Label;
	/** 小切手番号 */
	checkNo: Label;
	deposit: Amount;
	withdrawal: Amount;
	side: Label;
	balance: Amount;
};
export type CheckingBookData = RowBook<CheckingBookCells>;

/** 小口現金出納帳。内訳の費目列は問題ごとに変わるため columns で宣言する */
export type PettyCashBookCells = {
	receipt: Amount;
	date: Label;
	summary: Label;
	payment: Amount;
	/** キーは columns の費目名 */
	breakdown: Record<string, Amount>;
};
export type PettyCashBookData = RowBook<PettyCashBookCells> & {
	/** 内訳欄の費目（「旅費交通費」「消耗品費」「雑費」） */
	columns: string[];
};

/* ------------------------------------------------------------------ *
 * 仕入帳・売上帳
 * ------------------------------------------------------------------ */

/**
 * 仕入帳・売上帳。1 取引が「取引先＋条件」行と「品名・数量・単価」行に分かれ、
 * 末尾に総仕入高／戻し高／純仕入高の集計行が付く。
 */
export type TradeBookCells = {
	date: Label;
	/** 「かえで商事(株) 掛け」「ガラスコップ 5個 @20円」「純仕入高」 */
	summary: Label;
	/** 内訳欄 */
	detail: Amount;
	amount: Amount;
};
export type TradeBookData = RowBook<TradeBookCells>;

/* ------------------------------------------------------------------ *
 * 商品有高帳
 * ------------------------------------------------------------------ */

/** 受入・払出・残高の 1 レイヤ（先入先出法では 1 行に複数レイヤが並ぶ） */
export type StockLayer = {
	quantity: Amount;
	unitPrice: Amount;
	amount: Amount;
};
export type InventoryLedgerCells = {
	date: Label;
	summary: Label;
	received: StockLayer[];
	shipped: StockLayer[];
	balance: StockLayer[];
};
export type InventoryLedgerData = RowBook<InventoryLedgerCells> & {
	/** 払出単価の決め方（先入先出法・移動平均法・総平均法）。合計行の意味とレイヤの畳み方が変わる */
	method: 'fifo' | 'moving_average' | 'total_average';
};

/* ------------------------------------------------------------------ *
 * 手形記入帳・固定資産台帳
 * ------------------------------------------------------------------ */

/**
 * 受取手形記入帳・支払手形記入帳。
 * counterparty は受取手形なら支払人、支払手形なら受取人。
 */
export type BillsBookCells = {
	date: Label;
	/** 手形種類（「約手」） */
	billType: Label;
	billNo: Label;
	summary: Label;
	counterparty: Label;
	/** 振出人または裏書人 */
	drawer: Label;
	issueDate: Label;
	dueDate: Label;
	payingBank: Label;
	amount: Amount;
	/** てん末 */
	settlementDate: Label;
	settlementSummary: Label;
};
export type BillsBookData = RowBook<BillsBookCells>;

/** 固定資産台帳 */
export type FixedAssetLedgerCells = {
	acquiredOn: Label;
	name: Label;
	quantity: Amount;
	/** 償却方法（「定額法」） */
	method: Label;
	usefulLife: Label;
	/** 取得原価 */
	cost: Amount;
	/** 期首減価償却累計額 */
	openingAccumulated: Amount;
	/** 差引期首帳簿価額 */
	openingBookValue: Amount;
	/** 当期減価償却費 */
	depreciation: Amount;
	/** 期末帳簿価額 */
	closingBookValue: Amount;
};
export type FixedAssetLedgerData = RowBook<FixedAssetLedgerCells>;

/* ------------------------------------------------------------------ *
 * 集計表
 * ------------------------------------------------------------------ */

/**
 * 試算表。variant で列構成が決まる。
 * total = 合計試算表 / balance = 残高試算表 / total_balance = 合計残高試算表
 */
export type TrialBalanceCells = {
	debitBalance: Amount;
	debitTotal: Amount;
	accountName: Label;
	creditTotal: Amount;
	creditBalance: Amount;
};
export type TrialBalanceData = RowBook<TrialBalanceCells> & {
	variant: 'total' | 'balance' | 'total_balance';
};

/** 仕訳日計表（試算表の一種。伝票からの集計と総勘定元帳への転記で使う） */
export type DailyJournalSummaryCells = {
	debit: Amount;
	debitFolio: Label;
	accountName: Label;
	creditFolio: Label;
	credit: Amount;
};
export type DailyJournalSummaryData = RowBook<DailyJournalSummaryCells>;

/** 借方・貸方の対 */
export type DebitCredit = {
	debit: Amount;
	credit: Amount;
};

/** 精算表。4 ブロック × 借貸の 8 欄 */
export type WorksheetCells = {
	accountName: Label;
	trialBalance: DebitCredit;
	adjustment: DebitCredit;
	incomeStatement: DebitCredit;
	balanceSheet: DebitCredit;
};
export type WorksheetData = RowBook<WorksheetCells>;

/* ------------------------------------------------------------------ *
 * 財務諸表
 * ------------------------------------------------------------------ */

/**
 * 勘定式の損益計算書・貸借対照表の 1 行。
 * deduction は B/S の控除内書き（売掛金の下の貸倒引当金、建物の下の減価償却累計額）で、
 * amount に総額、deduction.amount に控除額、netAmount に差引純額が入る。
 */
export type StatementCells = {
	label: Label;
	amount: Amount;
	deduction?: {
		label: Label;
		amount: Amount;
	};
	netAmount?: Amount;
};
export type StatementData = BilateralBook<StatementCells>;

/* ------------------------------------------------------------------ *
 * 伝票・証ひょう
 * ------------------------------------------------------------------ */

/** 入金伝票・出金伝票。相手科目のみを書く */
export type SingleSideSlipCells = {
	account: Label;
	amount: Amount;
};
/** 振替伝票。仕訳の形で書く */
export type TransferSlipCells = JournalFormCells;

export type SlipData =
	| ({ slipType: 'receipt' | 'payment'; slipNo?: string } & RowBook<SingleSideSlipCells>)
	| ({ slipType: 'transfer'; slipNo?: string } & RowBook<TransferSlipCells>);

/** 請求書・納品書・領収書の明細 */
export type InvoiceItemCells = {
	name: Label;
	quantity: Amount;
	unitPrice: Amount;
	amount: Amount;
};
export type InvoiceData = RowBook<InvoiceItemCells> & {
	/** 発行元 */
	issuer: string;
	/** 宛先 */
	addressee: string;
	issuedOn?: string;
	dueDate?: string;
	/** 消費税額（税抜方式の問題で仮払消費税の判断材料になる） */
	taxAmount?: Amount;
	total: Amount;
	note?: string;
};

/** 納付書（法人税等・消費税） */
export type TaxNoticeData = {
	header: BookHeader;
	/** 「法人税」「消費税」 */
	taxType: string;
	/** 納期等の区分欄の期間（事業年度） */
	fiscalPeriod?: string;
	/** 納付年月日 */
	paidOn?: string;
	/** 中間申告なら仮払法人税等、確定申告なら未払法人税等の取り崩し */
	filingType: '中間申告' | '確定申告';
	rows: Array<FormRow<{ label: Label; amount: Amount }>>;
	total: Amount;
};

/** 当座勘定照合表（入出金明細） */
export type BankStatementCells = {
	date: Label;
	description: Label;
	/** お支払金額 */
	payment: Amount;
	/** お預り金額 */
	deposit: Amount;
	balance: Amount;
};
export type BankStatementData = RowBook<BankStatementCells> & {
	bankName: string;
	/** 照合表の発行日 */
	issuedOn?: string;
	/** 「○○株式会社 様」 */
	addressee?: string;
};

/** 領収書・振込依頼書の内訳（内容と金額） */
export type AmountItemCells = {
	description: Label;
	amount: Amount;
};

/** 領収書（受け取った側が控えとして持つ証ひょう） */
export type ReceiptData = RowBook<AmountItemCells> & {
	/** 発行元（代金を受け取った側） */
	issuer: string;
	/** 宛名（代金を支払った側） */
	addressee: string;
	issuedOn?: string;
	/** 消費税額（税抜方式の問題で仮払消費税の判断材料になる） */
	taxAmount?: Amount;
	total: Amount;
};

/** 振込依頼書（取引先が振込先口座と内訳を知らせる書類） */
export type TransferRequestData = RowBook<AmountItemCells> & {
	/** 依頼元（代金を受け取る側） */
	requester: string;
	/** 宛先（代金を支払う側） */
	addressee: string;
	/** 振込先口座 */
	account: string;
	total: Amount;
};

/** 旅費交通費支払報告書の明細 */
export type ExpenseReportCells = {
	date: Label;
	/** 区間・用途 */
	item: Label;
	amount: Amount;
	/** 領収書の有無 */
	receipt: Label;
};

/** 報告書に添付された領収書 */
export type AttachedReceiptCells = {
	issuer: Label;
	amount: Amount;
};

/** 旅費交通費の支払報告書。明細と、添付された領収書は別の表に並ぶ（同じ支出が両方に載る） */
export type ExpenseReportData = RowBook<ExpenseReportCells> & {
	/** 提出者 */
	submitter: string;
	addressee?: string;
	receipts: Array<FormRow<AttachedReceiptCells>>;
	total: Amount;
};

/* ------------------------------------------------------------------ *
 * 工業簿記・連結会計・純資産の様式（日商2級）
 * ------------------------------------------------------------------ */

/** 材料元帳。商品有高帳と同じ受入・払出・残高の形で、材料の払出単価を決める */
export type MaterialLedgerData = InventoryLedgerData;

/**
 * 原価計算表（個別原価計算）。列は製造指図書。orders に指図書の名前を並べ、
 * 各行は byOrder にその名前をキーとして金額を持つ。
 */
export type CostSheetCells = {
	label: Label;
	/** キーは orders の指図書名（`.` を含めない） */
	byOrder: Record<string, Amount>;
	total: Amount;
};
export type CostSheetData = RowBook<CostSheetCells> & {
	/** 製造指図書（「101」「102」など） */
	orders: string[];
};

/** 製造原価報告書・原価差異の分析表など、「項目・内訳・金額」の表 */
export type CostReportCells = {
	label: Label;
	/** 内訳の金額（小計の行は null） */
	detail: Amount;
	amount: Amount;
};
export type CostReportData = RowBook<CostReportCells>;

/**
 * 損益分岐点・直接原価計算・全部原価計算の損益計算書。
 * with_ratio は金額の右に率（貢献利益率など。単位は %）の列が付く。
 */
export type ProfitTableCells = {
	label: Label;
	amount: Amount;
	ratio: Amount;
};
export type ProfitTableData = RowBook<ProfitTableCells> & {
	variant: 'amount_only' | 'with_ratio';
};

/** 部門費配分表・補助部門費の配賦表。列は部門 */
export type DepartmentTableCells = {
	label: Label;
	total: Amount;
	/** キーは departments の部門名（`.` を含めない） */
	byDepartment: Record<string, Amount>;
};
export type DepartmentTableData = RowBook<DepartmentTableCells> & {
	/** 部門名（「切削部門」「組立部門」「修繕部門」など） */
	departments: string[];
};

/** 連結精算表。個別の金額に修正・消去を足して、連結の金額を出す */
export type ConsolidationWorksheetCells = {
	accountName: Label;
	parent: Amount;
	subsidiary: Amount;
	adjustment: DebitCredit;
	consolidated: Amount;
};
export type ConsolidationWorksheetData = RowBook<ConsolidationWorksheetCells>;

/** 株主資本等変動計算書。行は変動の原因、列は純資産の項目 */
export type EquityStatementCells = {
	label: Label;
	capital: Amount;
	capitalReserve: Amount;
	otherCapitalSurplus: Amount;
	retainedReserve: Amount;
	retainedEarnings: Amount;
	valuationDifference: Amount;
	total: Amount;
};
export type EquityStatementData = RowBook<EquityStatementCells>;

/** 銀行勘定調整表。左が企業の残高、右が銀行の残高からの調整 */
export type BankReconciliationCells = {
	label: Label;
	amount: Amount;
};
export type BankReconciliationData = BilateralBook<BankReconciliationCells>;

/* ------------------------------------------------------------------ *
 * Document 判別共用体
 * ------------------------------------------------------------------ */

/**
 * 表示・穴埋め共用のグラフィカル帳簿。
 * type で判別すると data の型が確定するので、レンダラは様式ごとに 1 コンポーネントでよい。
 */
export type Document =
	| { type: 'journal_form'; data: JournalFormData }
	| { type: 'journal_book'; data: JournalBookData }
	| { type: 't_account'; data: TAccountData }
	| { type: 'general_ledger'; data: GeneralLedgerData }
	| { type: 'supplier_ledger'; data: SubsidiaryLedgerData }
	| { type: 'customer_ledger'; data: SubsidiaryLedgerData }
	| { type: 'cash_book'; data: CashBookData }
	| { type: 'checking_book'; data: CheckingBookData }
	| { type: 'petty_cash_book'; data: PettyCashBookData }
	| { type: 'purchase_book'; data: TradeBookData }
	| { type: 'sales_book'; data: TradeBookData }
	| { type: 'inventory_ledger'; data: InventoryLedgerData }
	| { type: 'bills_receivable_book'; data: BillsBookData }
	| { type: 'bills_payable_book'; data: BillsBookData }
	| { type: 'fixed_asset_ledger'; data: FixedAssetLedgerData }
	| { type: 'trial_balance'; data: TrialBalanceData }
	| { type: 'daily_journal_summary'; data: DailyJournalSummaryData }
	| { type: 'worksheet'; data: WorksheetData }
	| { type: 'pl'; data: StatementData }
	| { type: 'bs'; data: StatementData }
	| { type: 'slip'; data: SlipData }
	| { type: 'invoice'; data: InvoiceData }
	| { type: 'tax_notice'; data: TaxNoticeData }
	| { type: 'bank_statement'; data: BankStatementData }
	| { type: 'receipt'; data: ReceiptData }
	| { type: 'transfer_request'; data: TransferRequestData }
	| { type: 'expense_report'; data: ExpenseReportData }
	| { type: 'material_ledger'; data: MaterialLedgerData }
	| { type: 'cost_sheet'; data: CostSheetData }
	| { type: 'cost_report'; data: CostReportData }
	| { type: 'profit_table'; data: ProfitTableData }
	| { type: 'department_table'; data: DepartmentTableData }
	| { type: 'consolidation_worksheet'; data: ConsolidationWorksheetData }
	| { type: 'equity_statement'; data: EquityStatementData }
	| { type: 'bank_reconciliation'; data: BankReconciliationData };

/** 様式種別 */
export type DocumentType = Document['type'];

/** 様式種別からその data 型を引く */
export type DocumentDataOf<T extends DocumentType> = Extract<Document, { type: T }>['data'];

/** 実行時バリデーション用の様式種別一覧。Document union と一致していることを型で保証する */
export const DOCUMENT_TYPES = [
	'journal_form',
	'journal_book',
	't_account',
	'general_ledger',
	'supplier_ledger',
	'customer_ledger',
	'cash_book',
	'checking_book',
	'petty_cash_book',
	'purchase_book',
	'sales_book',
	'inventory_ledger',
	'bills_receivable_book',
	'bills_payable_book',
	'fixed_asset_ledger',
	'trial_balance',
	'daily_journal_summary',
	'worksheet',
	'pl',
	'bs',
	'slip',
	'invoice',
	'tax_notice',
	'bank_statement',
	'receipt',
	'transfer_request',
	'expense_report',
	'material_ledger',
	'cost_sheet',
	'cost_report',
	'profit_table',
	'department_table',
	'consolidation_worksheet',
	'equity_statement',
	'bank_reconciliation'
] as const satisfies readonly DocumentType[];

/** DOCUMENT_TYPES に漏れがあればここでコンパイルエラーになる */
type AssertNever<T extends never> = T;
type _DocumentTypesAreExhaustive = AssertNever<
	Exclude<DocumentType, (typeof DOCUMENT_TYPES)[number]>
>;
