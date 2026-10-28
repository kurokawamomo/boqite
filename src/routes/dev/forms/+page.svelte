<script lang="ts">
	import type { Document } from '$lib/content/documents';
	import type { FormFillTask } from '$lib/content/types';
	import StaticDocumentPreview from '$lib/components/forms/StaticDocumentPreview.svelte';
	import FormFillBody from '$lib/components/forms/FormFillBody.svelte';

	// docs/form-schema.md §4 のサンプルJSONをそのまま流用（表示確認用）
	const journalBook: Document = {
		type: 'journal_book',
		data: {
			header: { title: '仕訳帳', folio: '1' },
			rows: [
				{ key: 'r1', cells: { date: '×年 4月1日', summary: '（現 金）', folio: '1', debit: 500, credit: null } },
				{
					key: 'r2',
					role: 'sub_entry',
					cells: { date: null, summary: '（資本金）', folio: '18', debit: null, credit: 500 }
				},
				{
					key: 'r3',
					role: 'narration',
					ruledAfter: 'single',
					cells: { date: null, summary: '株式の発行', folio: null, debit: null, credit: null }
				},
				{ key: 'r4', cells: { date: '4月10日', summary: '（仕 入）', folio: '20', debit: 200, credit: null } },
				{ key: 'r5', role: 'sub_entry', cells: { date: null, summary: '諸 口', folio: null, debit: null, credit: null } }
			]
		}
	};

	const tAccount: Document = {
		type: 't_account',
		data: {
			header: { subject: '現 金', folio: '1' },
			debit: [{ key: 'd1', cells: { date: '4/1', counterAccount: '資本金', amount: 500 } }],
			credit: [{ key: 'c1', cells: { date: '4/10', counterAccount: '仕入', amount: 50 } }]
		}
	};

	const journalForm: Document = {
		type: 'journal_form',
		data: {
			header: {},
			rows: [{ key: 'r1', cells: { debitAccount: null, debitAmount: null, creditAccount: null, creditAmount: null } }]
		}
	};

	const cashBook: Document = {
		type: 'cash_book',
		data: {
			header: { title: '現金出納帳' },
			rows: [
				{
					key: 'r-0501',
					role: 'opening',
					cells: { date: '×年 5/1', summary: '前月繰越', income: null, expense: null, balance: 200 }
				},
				{
					key: 'r-0503',
					cells: { date: '5/3', summary: 'ひだまり(株)に仕入代金支払い', income: null, expense: 80, balance: 120 }
				},
				{
					key: 'r-0531',
					role: 'carryforward',
					cells: { date: '5/31', summary: '次月繰越', income: null, expense: 170, balance: null }
				},
				{
					key: 'r-total',
					role: 'total',
					ruledAfter: 'double',
					cells: { date: null, summary: null, income: 300, expense: 300, balance: null }
				},
				{
					key: 'r-0601',
					role: 'opening',
					cells: { date: '6/1', summary: '前月繰越', income: 170, expense: null, balance: 170 }
				}
			]
		}
	};

	const trialBalance: Document = {
		type: 'trial_balance',
		data: {
			variant: 'total_balance',
			header: { title: '合計残高試算表' },
			rows: [
				{
					key: 'r-cash',
					cells: { debitBalance: 240, debitTotal: 350, accountName: '現金', creditTotal: 110, creditBalance: null }
				},
				{
					key: 'r-total',
					role: 'total',
					ruledAfter: 'double',
					cells: { debitBalance: 580, debitTotal: 970, accountName: '合 計', creditTotal: 970, creditBalance: 580 }
				}
			]
		}
	};

	const balanceOnlyTrialBalance: Document = {
		type: 'trial_balance',
		data: {
			variant: 'balance',
			header: { title: '残高試算表' },
			rows: [
				{
					key: 'r-cash',
					cells: { debitBalance: 240, debitTotal: null, accountName: '現金', creditTotal: null, creditBalance: null }
				},
				{
					key: 'r-ap',
					cells: { debitBalance: null, debitTotal: null, accountName: '買掛金', creditTotal: null, creditBalance: 110 }
				},
				{
					key: 'r-total',
					role: 'total',
					ruledAfter: 'double',
					cells: { debitBalance: 350, debitTotal: null, accountName: '合 計', creditTotal: null, creditBalance: 350 }
				}
			]
		}
	};

	// FormFillBody デモ: 現金出納帳の一部を空欄にした小問
	const cashBookFillTask: FormFillTask = {
		kind: 'form_fill',
		document: {
			type: 'cash_book',
			data: {
				header: { title: '現金出納帳' },
				rows: [
					{
						key: 'r-0501',
						role: 'opening',
						cells: { date: '×年 5/1', summary: '前月繰越', income: null, expense: null, balance: 200 }
					},
					{
						key: 'r-0503',
						cells: { date: '5/3', summary: null, income: null, expense: null, balance: 120 }
					},
					{
						key: 'r-0510',
						cells: { date: '5/10', summary: 'きりしま(株)から売掛金回収', income: null, expense: null, balance: 220 }
					}
				]
			}
		},
		blanks: [
			{
				ref: 'r-0503.summary',
				answer: 'ひだまり(株)に仕入代金支払い',
				input: 'chips',
				options: [
					'ひだまり(株)に仕入代金支払い',
					'きりしま(株)から売掛金回収',
					'消耗品の購入',
					'アビ(株)より仕入れ'
				]
			},
			{ ref: 'r-0503.expense', answer: 80, input: 'numpad' },
			{ ref: 'r-0510.income', answer: 100, input: 'numpad' }
		]
	};

	// --- 第二弾: 補助簿系（補助簿の記入例） ---

	const pettyCashBook: Document = {
		type: 'petty_cash_book',
		data: {
			header: { title: '小口現金出納帳' },
			columns: ['旅費交通費', '消耗品費', '雑費'],
			rows: [
				{ key: 'r1', cells: { receipt: 1000, date: '×年 4/1', summary: '小口現金受け入れ', payment: null, breakdown: {} } },
				{ key: 'r2', cells: { receipt: null, date: '4/2', summary: '電車代', payment: 200, breakdown: { 旅費交通費: 200 } } },
				{ key: 'r3', cells: { receipt: null, date: '4/3', summary: 'コピー用紙代', payment: 300, breakdown: { 消耗品費: 300 } } },
				{ key: 'r4', cells: { receipt: null, date: '4/4', summary: 'お茶菓子代', payment: 100, breakdown: { 雑費: 100 } } },
				{ key: 'r5', cells: { receipt: null, date: '4/5', summary: 'バス代', payment: 150, breakdown: { 旅費交通費: 150 } } },
				{
					key: 'r-sub',
					role: 'subtotal',
					cells: { receipt: null, date: null, summary: '合 計', payment: 750, breakdown: { 旅費交通費: 350, 消耗品費: 300, 雑費: 100 } }
				},
				{ key: 'r-cf', role: 'carryforward', cells: { receipt: null, date: '4/5', summary: '次週繰越', payment: 250, breakdown: {} } },
				{ key: 'r-total', role: 'total', ruledAfter: 'double', cells: { receipt: 1000, date: null, summary: null, payment: 1000, breakdown: {} } },
				{ key: 'r-open', role: 'opening', cells: { receipt: null, date: '4/8', summary: '前週繰越', payment: null, breakdown: {} } },
				{ key: 'r-repl', role: 'replenishment', cells: { receipt: 750, date: '4/8', summary: '本日補給', payment: null, breakdown: {} } }
			]
		}
	};

	const purchaseBook: Document = {
		type: 'purchase_book',
		data: {
			header: { title: '仕入帳' },
			rows: [
				{ key: 'r1', cells: { date: '×年 9/5', summary: 'アビ(株) 現金', detail: null, amount: null } },
				{ key: 'r1a', role: 'sub_entry', cells: { date: null, summary: '写真立て 10個 @20円', detail: null, amount: 200 } },
				{ key: 'r2', cells: { date: '9/12', summary: 'ひだまり(株) 掛け', detail: null, amount: null } },
				{ key: 'r2a', role: 'sub_entry', cells: { date: null, summary: 'ガラスコップ 5個 @20円', detail: 100, amount: null } },
				{ key: 'r2b', role: 'sub_entry', cells: { date: null, summary: 'ティーポット 10個 @30円', detail: 300, amount: 400 } },
				{ key: 'r3', cells: { date: '9/17', summary: 'ひだまり(株) 掛け返品', detail: null, amount: null } },
				{ key: 'r3a', role: 'sub_entry', cells: { date: null, summary: 'コーヒーカップ 5個 @10円', detail: null, amount: 50 } },
				{ key: 'r-gross', role: 'summary', cells: { date: '9/30', summary: '総仕入高', detail: null, amount: 600 } },
				{ key: 'r-return', role: 'summary', cells: { date: null, summary: '仕入戻し高', detail: null, amount: 50 } },
				{ key: 'r-net', role: 'summary', ruledAfter: 'double', cells: { date: null, summary: '純仕入高', detail: null, amount: 550 } }
			]
		}
	};

	const salesBook: Document = {
		type: 'sales_book',
		data: {
			header: { title: '売上帳' },
			rows: [
				{ key: 'r1', cells: { date: '×年 10/7', summary: 'きりしま(株) 掛け', detail: null, amount: null } },
				{ key: 'r1a', role: 'sub_entry', cells: { date: null, summary: 'ガラスコップ 15個 @24円', detail: 360, amount: null } },
				{ key: 'r1b', role: 'sub_entry', cells: { date: null, summary: '花びん 10個 @30円', detail: 300, amount: 660 } },
				{ key: 'r2', cells: { date: '10/15', summary: 'タマ(株) 現金', detail: null, amount: null } },
				{ key: 'r2a', role: 'sub_entry', cells: { date: null, summary: 'ティーポット 10個 @50円', detail: null, amount: 500 } },
				{ key: 'r3', cells: { date: '10/20', summary: 'きりしま(株) 掛け返品', detail: null, amount: null } },
				{ key: 'r3a', role: 'sub_entry', cells: { date: null, summary: '花びん 1個 @30円', detail: null, amount: 30 } },
				{ key: 'r-gross', role: 'summary', cells: { date: '10/31', summary: '総売上高', detail: null, amount: 1160 } },
				{ key: 'r-return', role: 'summary', cells: { date: null, summary: '売上戻り高', detail: null, amount: 30 } },
				{ key: 'r-net', role: 'summary', ruledAfter: 'double', cells: { date: null, summary: '純売上高', detail: null, amount: 1130 } }
			]
		}
	};

	const supplierLedger: Document = {
		type: 'supplier_ledger',
		data: {
			header: { subject: 'ひだまり(株)' },
			rows: [
				{ key: 'r1', role: 'opening', cells: { date: '×年 9/1', summary: '前月繰越', folio: null, debit: null, credit: 300, side: '貸', balance: 300 } },
				{ key: 'r2', cells: { date: '9/12', summary: '掛け仕入れ', folio: null, debit: null, credit: 400, side: '貸', balance: 700 } },
				{ key: 'r3', cells: { date: '9/17', summary: '返品', folio: null, debit: 50, credit: null, side: '貸', balance: 650 } },
				{ key: 'r4', cells: { date: '9/30', summary: '買掛金の支払い', folio: null, debit: 300, credit: null, side: '貸', balance: 350 } },
				{ key: 'r5', role: 'carryforward', cells: { date: '9/30', summary: '次月繰越', folio: null, debit: 350, credit: null, side: null, balance: null } },
				{ key: 'r-total', role: 'total', ruledAfter: 'double', cells: { date: null, summary: null, folio: null, debit: 700, credit: 700, side: null, balance: null } },
				{ key: 'r6', role: 'opening', cells: { date: '10/1', summary: '前月繰越', folio: null, debit: null, credit: 350, side: '貸', balance: 350 } }
			]
		}
	};

	const customerLedger: Document = {
		type: 'customer_ledger',
		data: {
			header: { subject: 'きりしま(株)' },
			rows: [
				{ key: 'r1', role: 'opening', cells: { date: '×年 10/1', summary: '前月繰越', folio: null, debit: 700, credit: null, side: '借', balance: 700 } },
				{ key: 'r2', cells: { date: '10/7', summary: '掛け売上げ', folio: null, debit: 660, credit: null, side: '借', balance: 1360 } },
				{ key: 'r3', cells: { date: '10/20', summary: '返品', folio: null, debit: null, credit: 30, side: '借', balance: 1330 } },
				{ key: 'r4', cells: { date: '10/31', summary: '売掛金の回収', folio: null, debit: null, credit: 700, side: '借', balance: 630 } },
				{ key: 'r5', role: 'carryforward', cells: { date: '10/31', summary: '次月繰越', folio: null, debit: null, credit: 630, side: null, balance: null } },
				{ key: 'r-total', role: 'total', ruledAfter: 'double', cells: { date: null, summary: null, folio: null, debit: 1360, credit: 1360, side: null, balance: null } },
				{ key: 'r6', role: 'opening', cells: { date: '11/1', summary: '前月繰越', folio: null, debit: 630, credit: null, side: '借', balance: 630 } }
			]
		}
	};

	const inventoryLedger: Document = {
		type: 'inventory_ledger',
		data: {
			method: 'fifo',
			header: { title: '商品有高帳', subject: 'コーヒーカップ' },
			rows: [
				{ key: 'r-1101', role: 'opening', cells: { date: '11/1', summary: '前月繰越', received: [], shipped: [], balance: [{ quantity: 10, unitPrice: 10, amount: 100 }] } },
				{
					key: 'r-1105',
					cells: {
						date: '11/5',
						summary: '仕 入',
						received: [{ quantity: 20, unitPrice: 13, amount: 260 }],
						shipped: [],
						balance: [
							{ quantity: 10, unitPrice: 10, amount: 100 },
							{ quantity: 20, unitPrice: 13, amount: 260 }
						]
					}
				},
				{
					key: 'r-1112',
					cells: {
						date: '11/12',
						summary: '売 上',
						received: [],
						shipped: [
							{ quantity: 10, unitPrice: 10, amount: 100 },
							{ quantity: 5, unitPrice: 13, amount: 65 }
						],
						balance: [{ quantity: 15, unitPrice: 13, amount: 195 }]
					}
				},
				{
					key: 'r-1118',
					cells: {
						date: '11/18',
						summary: '仕 入',
						received: [{ quantity: 15, unitPrice: 16, amount: 240 }],
						shipped: [],
						balance: [
							{ quantity: 15, unitPrice: 13, amount: 195 },
							{ quantity: 15, unitPrice: 16, amount: 240 }
						]
					}
				},
				{
					key: 'r-1124',
					cells: {
						date: '11/24',
						summary: '売 上',
						received: [],
						shipped: [
							{ quantity: 15, unitPrice: 13, amount: 195 },
							{ quantity: 3, unitPrice: 16, amount: 48 }
						],
						balance: [{ quantity: 12, unitPrice: 16, amount: 192 }]
					}
				},
				{
					key: 'r-1130',
					role: 'carryforward',
					cells: { date: '11/30', summary: '次月繰越', received: [], shipped: [{ quantity: 12, unitPrice: 16, amount: 192 }], balance: [] }
				},
				{
					key: 'r-total',
					role: 'total',
					ruledAfter: 'double',
					cells: {
						date: null,
						summary: '合 計',
						received: [{ quantity: 45, unitPrice: null, amount: 600 }],
						shipped: [{ quantity: 45, unitPrice: null, amount: 600 }],
						balance: []
					}
				},
				{ key: 'r-1201', role: 'opening', cells: { date: '12/1', summary: '前月繰越', received: [], shipped: [], balance: [{ quantity: 12, unitPrice: 16, amount: 192 }] } }
			]
		}
	};

	const billsReceivableBook: Document = {
		type: 'bills_receivable_book',
		data: {
			header: { title: '受取手形記入帳' },
			rows: [
				{
					key: 'r1',
					cells: {
						date: '10/3',
						billType: '約手',
						billNo: '12',
						summary: '売上',
						counterparty: 'きりしま(株)',
						drawer: 'きりしま(株)',
						issueDate: '10/3',
						dueDate: '12/3',
						payingBank: '北東銀行',
						amount: 200,
						settlementDate: '12/3',
						settlementSummary: '当座預金口座に入金'
					}
				}
			]
		}
	};

	const billsPayableBook: Document = {
		type: 'bills_payable_book',
		data: {
			header: { title: '支払手形記入帳' },
			rows: [
				{
					key: 'r1',
					cells: {
						date: '10/9',
						billType: '約手',
						billNo: '31',
						summary: '仕入',
						counterparty: 'ひだまり(株)',
						drawer: '当社',
						issueDate: '10/9',
						dueDate: '12/9',
						payingBank: '東西銀行',
						amount: 400,
						settlementDate: '12/9',
						settlementSummary: '当座預金口座から支払い'
					}
				}
			]
		}
	};

	// --- 第三弾: 帳簿編残り＋証ひょう（帳簿の残りと証ひょうの記入例） ---

	const generalLedgerBilateral: Document = {
		type: 'general_ledger',
		data: {
			layout: 'bilateral',
			header: { subject: '買掛金', folio: '11' },
			debit: [],
			credit: [{ key: 'c1', cells: { date: '×年 4/10', summary: '仕 入', folio: '1', amount: 180 } }]
		}
	};

	const generalLedgerRunningBalance: Document = {
		type: 'general_ledger',
		data: {
			layout: 'running_balance',
			header: { subject: '現金', folio: '1' },
			rows: [
				{ key: 'r1', role: 'opening', cells: { date: '×1年 5/1', summary: '前月繰越', folio: '✓', debit: null, credit: null, side: '借', balance: 900 } },
				{ key: 'r2', cells: { date: '〃', summary: '仕訳日計表', folio: '21', debit: 550, credit: null, side: '借', balance: 1450 } },
				{ key: 'r3', cells: { date: '〃', summary: '仕訳日計表', folio: '21', debit: null, credit: 250, side: '借', balance: 1200 } }
			]
		}
	};

	const checkingBook: Document = {
		type: 'checking_book',
		data: {
			header: { title: '当座預金出納帳' },
			rows: [
				{ key: 'r1', role: 'opening', cells: { date: '×年 6/1', summary: '前月繰越', checkNo: null, deposit: null, withdrawal: null, side: '借', balance: 700 } },
				{ key: 'r2', cells: { date: '6/12', summary: 'きりしま(株)から売掛金回収', checkNo: null, deposit: 100, withdrawal: null, side: '借', balance: 800 } },
				{ key: 'r3', cells: { date: '6/19', summary: 'ひだまり(株)に買掛金支払い', checkNo: '001', deposit: null, withdrawal: 150, side: '借', balance: 650 } },
				{ key: 'r4', cells: { date: '6/25', summary: '家賃の支払い', checkNo: '002', deposit: null, withdrawal: 200, side: '借', balance: 450 } },
				{ key: 'r5', role: 'carryforward', cells: { date: '6/30', summary: '次月繰越', checkNo: null, deposit: null, withdrawal: 450, side: null, balance: null } },
				{ key: 'r-total', role: 'total', ruledAfter: 'double', cells: { date: null, summary: null, checkNo: null, deposit: 800, withdrawal: 800, side: null, balance: null } },
				{ key: 'r6', role: 'opening', cells: { date: '7/1', summary: '前月繰越', checkNo: null, deposit: null, withdrawal: null, side: '借', balance: 450 } }
			]
		}
	};

	const fixedAssetLedger: Document = {
		type: 'fixed_asset_ledger',
		data: {
			header: { title: '固定資産台帳' },
			rows: [
				{ key: 'r1', cells: { acquiredOn: '×1年 4/1', name: '備品A', quantity: 2, method: '定額法', usefulLife: '5年', cost: 1000, openingAccumulated: 200, openingBookValue: 800, depreciation: 200, closingBookValue: 600 } },
				{ key: 'r2', cells: { acquiredOn: '×2年 10/1', name: '備品B', quantity: 4, method: '定額法', usefulLife: '8年', cost: 4000, openingAccumulated: 0, openingBookValue: 4000, depreciation: 250, closingBookValue: 3750 } }
			]
		}
	};

	const slipReceipt: Document = {
		type: 'slip',
		data: { slipType: 'receipt', header: { title: '入金伝票', period: '×1年10月6日' }, rows: [{ key: 'r1', cells: { account: '売掛金', amount: 100 } }] }
	};

	const slipPayment: Document = {
		type: 'slip',
		data: { slipType: 'payment', header: { title: '出金伝票', period: '×1年10月9日' }, rows: [{ key: 'r1', cells: { account: '買掛金', amount: 100 } }] }
	};

	const slipTransfer: Document = {
		type: 'slip',
		data: {
			slipType: 'transfer',
			header: { title: '振替伝票', period: '×1年10月12日' },
			rows: [{ key: 'r1', cells: { debitAccount: '売掛金', debitAmount: 100, creditAccount: '売上', creditAmount: 100 } }]
		}
	};

	const dailyJournalSummary: Document = {
		type: 'daily_journal_summary',
		data: {
			header: { title: '仕訳日計表', period: '×1年5月1日' },
			rows: [
				{ key: 'r-cash', cells: { debit: 550, debitFolio: '1', accountName: '現 金', creditFolio: '1', credit: 250 } },
				{ key: 'r-nr', cells: { debit: 120, debitFolio: null, accountName: '受取手形', creditFolio: null, credit: null } },
				{ key: 'r-ar', cells: { debit: 700, debitFolio: null, accountName: '売掛金', creditFolio: null, credit: 340 } },
				{ key: 'r-loan', cells: { debit: 150, debitFolio: null, accountName: '貸付金', creditFolio: null, credit: 350 } },
				{ key: 'r-np', cells: { debit: null, debitFolio: null, accountName: '支払手形', creditFolio: null, credit: 110 } },
				{ key: 'r-ap', cells: { debit: 220, debitFolio: null, accountName: '買掛金', creditFolio: null, credit: 400 } },
				{ key: 'r-sales', cells: { debit: 20, debitFolio: null, accountName: '売 上', creditFolio: null, credit: 700 } },
				{ key: 'r-purchase', cells: { debit: 400, debitFolio: null, accountName: '仕 入', creditFolio: null, credit: 10 } },
				{ key: 'r-total', role: 'total', ruledAfter: 'double', cells: { debit: 2160, debitFolio: null, accountName: '合 計', creditFolio: null, credit: 2160 } }
			]
		}
	};

	const invoice: Document = {
		type: 'invoice',
		data: {
			header: { title: '請求書' },
			issuer: 'ひだまり株式会社',
			addressee: 'こもれび株式会社 御中',
			dueDate: '×2年9月30日',
			rows: [
				{ key: 'r1', cells: { name: 'コーヒーカップ（白）', quantity: 10, unitPrice: 600, amount: 6000 } },
				{ key: 'r2', cells: { name: 'マグカップ（ストライプ）', quantity: 10, unitPrice: 400, amount: 4000 } }
			],
			taxAmount: 1000,
			total: 11000,
			note: 'お支払いは、北山銀行 本町支店の口座へお願いします。'
		}
	};

	const taxNotice: Document = {
		type: 'tax_notice',
		data: {
			header: { title: '領収証書' },
			taxType: '法人税',
			filingType: '確定申告',
			fiscalPeriod: '×7年4月1日から×8年3月31日まで',
			paidOn: '×8年5月30日',
			rows: [{ key: 'r1', cells: { label: '本税', amount: 480000 } }],
			total: 480000
		}
	};

	const bankStatement: Document = {
		type: 'bank_statement',
		data: {
			header: { title: '当座勘定照合表' },
			bankName: '青葉銀行本町支店',
			addressee: 'ミナト商事株式会社 様',
			issuedOn: '×7年6月12日',
			rows: [
				{ key: 'r1', cells: { date: '6.3', description: 'お振込み ヤマダ商店(株)', payment: 72000, deposit: null, balance: 428000 } },
				{ key: 'r2', cells: { date: '6.3', description: 'お振込手数料', payment: 330, deposit: null, balance: 427670 } },
				{ key: 'r3', cells: { date: '6.9', description: 'お振込み タカハシ工業(株)', payment: null, deposit: 95000, balance: 522670 } },
				{ key: 'r4', role: 'continued', cells: { date: null, description: '⋮', payment: null, deposit: null, balance: null } }
			]
		}
	};

	const receipt: Document = {
		type: 'receipt',
		data: {
			header: { title: '領収書' },
			issuer: 'フジ事務機株式会社',
			addressee: 'ミナト商事株式会社 様',
			issuedOn: '×7年8月20日',
			rows: [{ key: 'r1', cells: { description: 'コピー機トナー代として', amount: 13200 } }],
			taxAmount: 1200,
			total: 13200
		}
	};

	const transferRequest: Document = {
		type: 'transfer_request',
		data: {
			header: { title: '振込依頼書' },
			requester: '株式会社サクラ不動産',
			addressee: 'ミナト商事株式会社 様',
			rows: [
				{ key: 'r1', cells: { description: '仲介手数料', amount: 80000 } },
				{ key: 'r2', cells: { description: '敷金', amount: 160000 } },
				{ key: 'r3', cells: { description: '初月賃料', amount: 80000 } }
			],
			total: 320000,
			account: '緑山銀行 駅前支店 当座 7654321 カ)サクラフドウサン'
		}
	};

	const expenseReport: Document = {
		type: 'expense_report',
		data: {
			header: { title: '旅費交通費支払報告書' },
			submitter: '総務部 従業員',
			addressee: '経理部 御中',
			rows: [
				{ key: 'r1', cells: { date: '9/2', item: '電車(往路)', amount: 1500, receipt: 'なし' } },
				{ key: 'r2', cells: { date: '9/2', item: 'タクシー', amount: 2700, receipt: 'あり' } },
				{ key: 'r3', cells: { date: '9/2', item: '宿泊料', amount: 9000, receipt: 'あり' } },
				{ key: 'r4', cells: { date: '9/3', item: '電車(復路)', amount: 1500, receipt: 'なし' } }
			],
			receipts: [
				{ key: 'c1', cells: { issuer: '空港タクシー(株)', amount: 2700 } },
				{ key: 'c2', cells: { issuer: '海風ホテル', amount: 9000 } }
			],
			total: 14700
		}
	};

	// --- 決算編(最終弾): worksheet/pl/bs（精算表・損益計算書・貸借対照表の記入例） ---

	const worksheet: Document = {
		type: 'worksheet',
		data: {
			header: { title: '精算表' },
			rows: [
				{ key: 'r-cash', cells: { accountName: '現 金', trialBalance: { debit: 300, credit: null }, adjustment: { debit: null, credit: null }, incomeStatement: { debit: null, credit: null }, balanceSheet: { debit: 300, credit: null } } },
				{ key: 'r-ar', cells: { accountName: '売掛金', trialBalance: { debit: 600, credit: null }, adjustment: { debit: null, credit: null }, incomeStatement: { debit: null, credit: null }, balanceSheet: { debit: 600, credit: null } } },
				{ key: 'r-inv', cells: { accountName: '繰越商品', trialBalance: { debit: 100, credit: null }, adjustment: { debit: 50, credit: 100 }, incomeStatement: { debit: null, credit: null }, balanceSheet: { debit: 50, credit: null } } },
				{ key: 'r-bldg', cells: { accountName: '建 物', trialBalance: { debit: 2400, credit: null }, adjustment: { debit: null, credit: null }, incomeStatement: { debit: null, credit: null }, balanceSheet: { debit: 2400, credit: null } } },
				{ key: 'r-ap', cells: { accountName: '買掛金', trialBalance: { debit: null, credit: 578 }, adjustment: { debit: null, credit: null }, incomeStatement: { debit: null, credit: null }, balanceSheet: { debit: null, credit: 578 } } },
				{ key: 'r-allow', cells: { accountName: '貸倒引当金', trialBalance: { debit: null, credit: 2 }, adjustment: { debit: null, credit: 10 }, incomeStatement: { debit: null, credit: null }, balanceSheet: { debit: null, credit: 12 } } },
				{ key: 'r-dep', cells: { accountName: '減価償却累計額', trialBalance: { debit: null, credit: 600 }, adjustment: { debit: null, credit: 120 }, incomeStatement: { debit: null, credit: null }, balanceSheet: { debit: null, credit: 720 } } },
				{ key: 'r-cap', cells: { accountName: '資本金', trialBalance: { debit: null, credit: 1000 }, adjustment: { debit: null, credit: null }, incomeStatement: { debit: null, credit: null }, balanceSheet: { debit: null, credit: 1000 } } },
				{ key: 'r-re', cells: { accountName: '繰越利益剰余金', trialBalance: { debit: null, credit: 200 }, adjustment: { debit: null, credit: null }, incomeStatement: { debit: null, credit: null }, balanceSheet: { debit: null, credit: 200 } } },
				{ key: 'r-sales', cells: { accountName: '売 上', trialBalance: { debit: null, credit: 1800 }, adjustment: { debit: null, credit: null }, incomeStatement: { debit: null, credit: 1800 }, balanceSheet: { debit: null, credit: null } } },
				{ key: 'r-rent-inc', cells: { accountName: '受取地代', trialBalance: { debit: null, credit: 240 }, adjustment: { debit: 180, credit: null }, incomeStatement: { debit: null, credit: 60 }, balanceSheet: { debit: null, credit: null } } },
				{ key: 'r-purchase', cells: { accountName: '仕 入', trialBalance: { debit: 900, credit: null }, adjustment: { debit: 100, credit: 50 }, incomeStatement: { debit: 950, credit: null }, balanceSheet: { debit: null, credit: null } } },
				{ key: 'r-rent-exp', cells: { accountName: '支払家賃', trialBalance: { debit: 120, credit: null }, adjustment: { debit: null, credit: 70 }, incomeStatement: { debit: 50, credit: null }, balanceSheet: { debit: null, credit: null } } },
				{
					key: 'r-subtotal',
					role: 'subtotal',
					ruledAfter: 'single',
					cells: { accountName: '（小 計）', trialBalance: { debit: 4420, credit: 4420 }, adjustment: { debit: null, credit: null }, incomeStatement: { debit: null, credit: null }, balanceSheet: { debit: null, credit: null } }
				},
				{ key: 'r-allow-exp', cells: { accountName: '貸倒引当金繰入', trialBalance: { debit: null, credit: null }, adjustment: { debit: 10, credit: null }, incomeStatement: { debit: 10, credit: null }, balanceSheet: { debit: null, credit: null } } },
				{ key: 'r-dep-exp', cells: { accountName: '減価償却費', trialBalance: { debit: null, credit: null }, adjustment: { debit: 120, credit: null }, incomeStatement: { debit: 120, credit: null }, balanceSheet: { debit: null, credit: null } } },
				{ key: 'r-prepaid-rent', cells: { accountName: '（前払）家賃', trialBalance: { debit: null, credit: null }, adjustment: { debit: 70, credit: null }, incomeStatement: { debit: null, credit: null }, balanceSheet: { debit: 70, credit: null } } },
				{ key: 'r-unearned-rent', cells: { accountName: '（前受）地代', trialBalance: { debit: null, credit: null }, adjustment: { debit: null, credit: 180 }, incomeStatement: { debit: null, credit: null }, balanceSheet: { debit: null, credit: 180 } } },
				{
					key: 'r-net-income',
					role: 'net_income',
					cells: { accountName: '当期純利益', trialBalance: { debit: null, credit: null }, adjustment: { debit: null, credit: null }, incomeStatement: { debit: 730, credit: null }, balanceSheet: { debit: null, credit: 730 } }
				},
				{
					key: 'r-total',
					role: 'total',
					ruledAfter: 'double',
					cells: { accountName: '合 計', trialBalance: { debit: null, credit: null }, adjustment: { debit: 530, credit: 530 }, incomeStatement: { debit: 1860, credit: 1860 }, balanceSheet: { debit: 3420, credit: 3420 } }
				}
			]
		}
	};

	const profitAndLoss: Document = {
		type: 'pl',
		data: {
			header: { title: '損益計算書', company: 'こもれび株式会社', period: '×1年4月1日から×2年3月31日まで', unit: '(単位：円)' },
			debit: [
				{ key: 'd-cogs', cells: { label: '売上原価', amount: 950 } },
				{ key: 'd-dep', cells: { label: '減価償却費', amount: 120 } },
				{ key: 'd-allow', cells: { label: '貸倒引当金繰入', amount: 10 } },
				{ key: 'd-rent', cells: { label: '支払家賃', amount: 50 } },
				{ key: 'd-tax', cells: { label: '法人税等', amount: 300 } },
				{ key: 'd-ni', role: 'net_income', cells: { label: '当期純利益', amount: 430 } },
				{ key: 'd-total', role: 'total', ruledAfter: 'double', cells: { label: '計', amount: 1860 } }
			],
			credit: [
				{ key: 'c-sales', cells: { label: '売上高', amount: 1800 } },
				{ key: 'c-rent', cells: { label: '受取地代', amount: 60 } },
				{ key: 'c-total', role: 'total', ruledAfter: 'double', cells: { label: '計', amount: 1860 } }
			]
		}
	};

	const balanceSheet: Document = {
		type: 'bs',
		data: {
			header: { title: '貸借対照表', company: 'こもれび株式会社', period: '×2年3月31日', unit: '(単位：円)' },
			debit: [
				{ key: 'd-cash', cells: { label: '現金', amount: 300 } },
				{ key: 'd-ar', cells: { label: '売掛金', amount: 600, deduction: { label: '貸倒引当金', amount: 12 }, netAmount: 588 } },
				{ key: 'd-prepaid', cells: { label: '前払費用', amount: 70 } },
				{ key: 'd-goods', cells: { label: '商品', amount: 50 } },
				{ key: 'd-bldg', cells: { label: '建物', amount: 2400, deduction: { label: '減価償却累計額', amount: 720 }, netAmount: 1680 } },
				{ key: 'd-total', role: 'total', ruledAfter: 'double', cells: { label: '計', amount: 2688 } }
			],
			credit: [
				{ key: 'c-ap', cells: { label: '買掛金', amount: 578 } },
				{ key: 'c-unearned', cells: { label: '前受収益', amount: 180 } },
				{ key: 'c-tax', cells: { label: '未払法人税等', amount: 300 } },
				{ key: 'c-cap', cells: { label: '資本金', amount: 1000 } },
				{ key: 'c-re', cells: { label: '繰越利益剰余金', amount: 630 } },
				{ key: 'c-total', role: 'total', ruledAfter: 'double', cells: { label: '計', amount: 2688 } }
			]
		}
	};

	// FormFillBody デモ2: 買掛金元帳。choice入力(借/貸)とnumpadの組み合わせ
	const supplierLedgerFillTask: FormFillTask = {
		kind: 'form_fill',
		document: {
			type: 'supplier_ledger',
			data: {
				header: { subject: 'ひだまり(株)' },
				rows: [
					{ key: 'r1', role: 'opening', cells: { date: '×年 9/1', summary: '前月繰越', folio: null, debit: null, credit: 300, side: '貸', balance: 300 } },
					{ key: 'r2', cells: { date: '9/12', summary: '掛け仕入れ', folio: null, debit: null, credit: null, side: null, balance: 700 } }
				]
			}
		},
		blanks: [
			{ ref: 'r2.credit', answer: 400, input: 'numpad' },
			{ ref: 'r2.side', answer: '貸', input: 'choice', options: ['借', '貸'] }
		]
	};

	let completedAnswers = $state<Record<string, string | number> | null>(null);
	let completedAnswers2 = $state<Record<string, string | number> | null>(null);

	const renderers: Array<{ title: string; doc: Document }> = [
		{ title: '仕訳帳 journal_book', doc: journalBook },
		{ title: '略式T勘定 t_account', doc: tAccount },
		{ title: '仕訳フォーム journal_form', doc: journalForm },
		{ title: '現金出納帳 cash_book（締切あり）', doc: cashBook },
		{ title: '合計残高試算表 trial_balance（total_balance）', doc: trialBalance },
		{ title: '残高試算表 trial_balance（balance）', doc: balanceOnlyTrialBalance },
		{ title: '小口現金出納帳 petty_cash_book', doc: pettyCashBook },
		{ title: '仕入帳 purchase_book', doc: purchaseBook },
		{ title: '売上帳 sales_book', doc: salesBook },
		{ title: '買掛金元帳 supplier_ledger', doc: supplierLedger },
		{ title: '売掛金元帳 customer_ledger', doc: customerLedger },
		{ title: '商品有高帳 inventory_ledger（先入先出法）', doc: inventoryLedger },
		{ title: '受取手形記入帳 bills_receivable_book', doc: billsReceivableBook },
		{ title: '支払手形記入帳 bills_payable_book', doc: billsPayableBook },
		{ title: '総勘定元帳 general_ledger（標準式・bilateral）', doc: generalLedgerBilateral },
		{ title: '総勘定元帳 general_ledger（残高式・running_balance）', doc: generalLedgerRunningBalance },
		{ title: '当座預金出納帳 checking_book', doc: checkingBook },
		{ title: '固定資産台帳 fixed_asset_ledger', doc: fixedAssetLedger },
		{ title: '入金伝票 slip（receipt）', doc: slipReceipt },
		{ title: '出金伝票 slip（payment）', doc: slipPayment },
		{ title: '振替伝票 slip（transfer）', doc: slipTransfer },
		{ title: '仕訳日計表 daily_journal_summary', doc: dailyJournalSummary },
		{ title: '請求書 invoice', doc: invoice },
		{ title: '納付書・領収証書 tax_notice', doc: taxNotice },
		{ title: '当座勘定照合表 bank_statement', doc: bankStatement },
		{ title: '領収書 receipt', doc: receipt },
		{ title: '振込依頼書 transfer_request', doc: transferRequest },
		{ title: '旅費交通費支払報告書 expense_report', doc: expenseReport },
		{ title: '精算表 worksheet', doc: worksheet },
		{ title: '損益計算書 pl', doc: profitAndLoss },
		{ title: '貸借対照表 bs（控除内書きあり）', doc: balanceSheet }
	];

</script>

<svelte:head>
	<title>Boqite - 様式レンダラ dev</title>
</svelte:head>

<div class="dev-page">
	<h1>form_fill 様式レンダラ 全27様式</h1>
	<p class="note">
		iPhone幅では横スクロール許容（様式は縮めない）。docs/form-schema.md §4 の記入例を描画。
	</p>

	{#each renderers as item (item.title)}
		<section>
			<h2>{item.title}</h2>
			<div class="scroll">
				<StaticDocumentPreview document={item.doc} />
			</div>
		</section>
	{/each}

	<section>
		<h2>FormFillBody（現金出納帳・空欄3個 / numpad・chips）</h2>
		<FormFillBody task={cashBookFillTask} onComplete={(a) => (completedAnswers = a)} />
		{#if completedAnswers}
			<p class="complete">全blank充足！ answers = {JSON.stringify(completedAnswers)}</p>
		{/if}
	</section>

	<section>
		<h2>FormFillBody（買掛金元帳・空欄2個 / numpad・choice）</h2>
		<FormFillBody task={supplierLedgerFillTask} onComplete={(a) => (completedAnswers2 = a)} />
		{#if completedAnswers2}
			<p class="complete">全blank充足！ answers = {JSON.stringify(completedAnswers2)}</p>
		{/if}
	</section>
</div>

<style>
	:global(body) {
		margin: 0;
		background: #f6f6f5;
		font-family:
			'Hiragino Sans',
			'Hiragino Kaku Gothic ProN',
			-apple-system,
			BlinkMacSystemFont,
			sans-serif;
	}

	.dev-page {
		max-width: 430px;
		margin: 0 auto;
		padding: 16px;
		padding-bottom: 80px;
	}

	h1 {
		font-size: 18px;
	}

	.note {
		font-size: 12px;
		color: #888;
		margin-bottom: 20px;
	}

	section {
		margin-bottom: 28px;
	}

	h2 {
		font-size: 13px;
		color: #555;
		margin-bottom: 8px;
	}

	.scroll {
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		padding: 4px;
		background: #ffffff;
		border-radius: 8px;
	}

	.complete {
		margin-top: 12px;
		padding: 10px;
		background: #eaffea;
		border-radius: 8px;
		font-size: 12px;
		word-break: break-all;
	}
</style>
