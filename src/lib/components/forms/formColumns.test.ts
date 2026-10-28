import { describe, expect, it } from 'vitest';
import type { Document, RunningBalanceCells } from '$lib/content/documents';
import * as formColumns from './formColumns';
import type { Column } from './formColumns';
import { defineColumns, labelForCell, renderedCellRefs, tablesOf, trialBalanceColumns } from './formColumns';

const runningBalanceRow = {
	key: 'r-1',
	cells: { date: null, summary: null, folio: null, debit: null, credit: null, side: null, balance: null }
};

describe('defineColumns', () => {
	it('セル型のフィールドが列から漏れるとコンパイルエラーになる', () => {
		// @ts-expect-error folio 以外を列に書いていない（folio の列が無い）
		defineColumns<Pick<RunningBalanceCells, 'date' | 'folio'>>()([{ path: 'date', label: '日付' }]);
	});
});

describe('renderedCellRefs', () => {
	it('残高式の元帳は仕丁の列を描く', () => {
		const doc: Document = {
			type: 'supplier_ledger',
			data: { header: {}, rows: [runningBalanceRow] }
		};
		expect(renderedCellRefs(doc)).toEqual(
			new Set(['r-1.date', 'r-1.summary', 'r-1.folio', 'r-1.debit', 'r-1.credit', 'r-1.side', 'r-1.balance'])
		);
	});

	it('総勘定元帳は標準式でも残高式でも仕丁を描く', () => {
		const bilateral: Document = {
			type: 'general_ledger',
			data: {
				layout: 'bilateral',
				header: {},
				debit: [{ key: 'd1', cells: { date: null, summary: null, folio: null, amount: null } }],
				credit: [{ key: 'c1', cells: { date: null, summary: null, folio: null, amount: null } }]
			}
		};
		const running: Document = {
			type: 'general_ledger',
			data: { layout: 'running_balance', header: {}, rows: [runningBalanceRow] }
		};
		expect(renderedCellRefs(bilateral).has('d1.folio')).toBe(true);
		expect(renderedCellRefs(bilateral).has('c1.folio')).toBe(true);
		expect(renderedCellRefs(running).has('r-1.folio')).toBe(true);
	});

	it('貸借対照表は控除の科目と額を別々に描く', () => {
		const doc: Document = {
			type: 'bs',
			data: {
				header: {},
				debit: [
					{
						key: 'd-ar',
						cells: {
							label: '売掛金',
							amount: 700,
							deduction: { label: '貸倒引当金', amount: 14 },
							netAmount: null
						}
					}
				],
				credit: []
			}
		};
		const refs = renderedCellRefs(doc);
		expect(refs.has('d-ar.deduction.label')).toBe(true);
		expect(refs.has('d-ar.deduction.amount')).toBe(true);
		expect(refs.has('d-ar.netAmount')).toBe(true);
	});

	it('商品有高帳はレイヤの数だけセルを描く', () => {
		const doc: Document = {
			type: 'inventory_ledger',
			data: {
				method: 'fifo',
				header: {},
				rows: [
					{
						key: 'r-1112',
						cells: {
							date: null,
							summary: null,
							received: [],
							shipped: [
								{ quantity: null, unitPrice: null, amount: null },
								{ quantity: null, unitPrice: null, amount: null }
							],
							balance: [{ quantity: null, unitPrice: null, amount: null }]
						}
					}
				]
			}
		};
		const refs = renderedCellRefs(doc);
		expect(refs.has('r-1112.shipped.1.amount')).toBe(true);
		expect(refs.has('r-1112.shipped.2.amount')).toBe(false);
		expect(refs.has('r-1112.received.0.amount')).toBe(false);
		expect(refs.has('r-1112.balance.0.unitPrice')).toBe(true);
	});

	it('小口現金出納帳は宣言した費目の列だけ描く', () => {
		const doc: Document = {
			type: 'petty_cash_book',
			data: {
				header: {},
				columns: ['消耗品費'],
				rows: [
					{
						key: 'r-1',
						cells: { receipt: null, date: null, summary: null, payment: null, breakdown: { 消耗品費: null } }
					}
				]
			}
		};
		const refs = renderedCellRefs(doc);
		expect(refs.has('r-1.breakdown.消耗品費')).toBe(true);
		expect(refs.has('r-1.breakdown.旅費交通費')).toBe(false);
	});
});

describe('trialBalanceColumns', () => {
	it('様式の variant に応じて列が変わる', () => {
		const paths = (variant: Parameters<typeof trialBalanceColumns>[0]) =>
			trialBalanceColumns(variant).map((c) => c.path);
		expect(paths('total')).toEqual(['debitTotal', 'accountName', 'creditTotal']);
		expect(paths('balance')).toEqual(['debitBalance', 'accountName', 'creditBalance']);
		expect(paths('total_balance')).toHaveLength(5);
	});
});

describe('証ひょう類の表', () => {
	it('旅費交通費支払報告書は明細と添付の領収書を別の表で描く', () => {
		const doc: Document = {
			type: 'expense_report',
			data: {
				header: {},
				submitter: '総務部 従業員',
				rows: [{ key: 'r1', cells: { date: '9/2', item: 'タクシー', amount: 2700, receipt: 'あり' } }],
				receipts: [{ key: 'c1', cells: { issuer: '空港タクシー(株)', amount: 2700 } }],
				total: 2700
			}
		};
		expect(tablesOf(doc)).toHaveLength(2);
		expect(renderedCellRefs(doc)).toEqual(
			new Set(['r1.date', 'r1.item', 'r1.amount', 'r1.receipt', 'c1.issuer', 'c1.amount'])
		);
	});

	it('領収書と振込依頼書は内容と金額の列を描く', () => {
		const rows = [{ key: 'r1', cells: { description: '敷金', amount: 160000 } }];
		const receipt: Document = {
			type: 'receipt',
			data: { header: {}, issuer: 'a', addressee: 'b', rows, total: 160000 }
		};
		const request: Document = {
			type: 'transfer_request',
			data: { header: {}, requester: 'a', addressee: 'b', rows, total: 160000, account: 'c' }
		};
		expect(renderedCellRefs(receipt)).toEqual(new Set(['r1.description', 'r1.amount']));
		expect(renderedCellRefs(request)).toEqual(new Set(['r1.description', 'r1.amount']));
	});
});

describe('labelForCell', () => {
	it('列の見出しを返す。上段見出しがあれば繋ぐ', () => {
		const worksheet: Document = {
			type: 'worksheet',
			data: {
				header: {},
				rows: [
					{
						key: 'r-1',
						cells: {
							accountName: null,
							trialBalance: { debit: null, credit: null },
							adjustment: { debit: null, credit: null },
							incomeStatement: { debit: null, credit: null },
							balanceSheet: { debit: null, credit: null }
						}
					}
				]
			}
		};
		expect(labelForCell(worksheet, 'r-1.adjustment.credit')).toBe('修正記入 貸方');
		expect(labelForCell(worksheet, 'r-1.accountName')).toBe('勘定科目');
		expect(labelForCell(worksheet, 'r-1.unknown')).toBeUndefined();
	});

	it('試算表の貸方合計は ref の生文字ではなく見出しで返す', () => {
		const doc: Document = {
			type: 'trial_balance',
			data: {
				variant: 'total',
				header: {},
				rows: [{ key: 'r-cash', cells: { debitBalance: null, debitTotal: null, accountName: null, creditTotal: null, creditBalance: null } }]
			}
		};
		expect(labelForCell(doc, 'r-cash.creditTotal')).toBe('貸方合計');
	});
});

describe('全様式の列定義', () => {
	const variants: Record<string, Column[]> = {
		billsReceivable: formColumns.billsBookColumns('receivable'),
		billsPayable: formColumns.billsBookColumns('payable'),
		trialTotalBalance: formColumns.trialBalanceColumns('total_balance'),
		pettyCash: formColumns.pettyCashColumns(['旅費交通費']),
		slipTransfer: formColumns.slipColumns('transfer'),
		ledgerDebit: formColumns.LEDGER_SIDE_COLUMNS('借方'),
		statement: formColumns.statementColumns('資産'),
		costSheet: formColumns.costSheetColumns(['101', '102']),
		profitWithRatio: formColumns.profitTableColumns('with_ratio'),
		profitAmountOnly: formColumns.profitTableColumns('amount_only'),
		department: formColumns.departmentTableColumns(['切削部門', '組立部門']),
		reconciliationLeft: formColumns.bankReconciliationColumns('企業の残高')
	};
	const constants = Object.entries(formColumns).filter(
		(entry): entry is [string, Column[]] => Array.isArray(entry[1])
	);

	it('定数の列定義を拾えている', () => {
		expect(constants.length).toBeGreaterThan(10);
	});

	it.each([...constants, ...Object.entries(variants)])('%s: すべての列に見出しがあり、ref の生文字を含まない', (_name, columns) => {
		for (const column of columns) {
			expect(column.label, column.path).toBeTruthy();
			expect(column.label, column.path).not.toBe(column.path);
			expect(column.label, column.path).not.toMatch(/[A-Za-z.]/);
		}
	});
});

describe('工業簿記・連結・純資産の様式', () => {
	const blank = { debit: null, credit: null };

	it('原価計算表は宣言した指図書の列だけ描く', () => {
		const doc: Document = {
			type: 'cost_sheet',
			data: {
				header: {},
				orders: ['101', '102'],
				rows: [{ key: 'r-m', cells: { label: '直接材料費', byOrder: { '101': null, '102': null }, total: null } }]
			}
		};
		const refs = renderedCellRefs(doc);
		expect(refs.has('r-m.byOrder.101')).toBe(true);
		expect(refs.has('r-m.byOrder.103')).toBe(false);
		expect(refs.has('r-m.total')).toBe(true);
		expect(labelForCell(doc, 'r-m.byOrder.102')).toBe('指図書 102');
	});

	it('損益分岐の表は variant で率の列が付く', () => {
		const rows = [{ key: 'r-s', cells: { label: '売上高', amount: null, ratio: null } }];
		const amountOnly: Document = { type: 'profit_table', data: { header: {}, variant: 'amount_only', rows } };
		const withRatio: Document = { type: 'profit_table', data: { header: {}, variant: 'with_ratio', rows } };
		expect(renderedCellRefs(amountOnly).has('r-s.ratio')).toBe(false);
		expect(renderedCellRefs(withRatio).has('r-s.ratio')).toBe(true);
	});

	it('部門費配分表は部門の列を描き、見出しは部門名', () => {
		const doc: Document = {
			type: 'department_table',
			data: {
				header: {},
				departments: ['切削部門'],
				rows: [{ key: 'r-1', cells: { label: '間接材料費', total: null, byDepartment: { 切削部門: null } } }]
			}
		};
		expect(renderedCellRefs(doc).has('r-1.byDepartment.切削部門')).toBe(true);
		expect(labelForCell(doc, 'r-1.byDepartment.切削部門')).toBe('切削部門');
	});

	it('連結精算表は修正・消去の借方と貸方を別々に描く', () => {
		const doc: Document = {
			type: 'consolidation_worksheet',
			data: {
				header: {},
				rows: [{ key: 'r-1', cells: { accountName: '売上高', parent: null, subsidiary: null, adjustment: blank, consolidated: null } }]
			}
		};
		expect(labelForCell(doc, 'r-1.adjustment.debit')).toBe('修正・消去 借方');
		expect(labelForCell(doc, 'r-1.adjustment.credit')).toBe('修正・消去 貸方');
		expect(labelForCell(doc, 'r-1.consolidated')).toBe('連結');
	});

	it('株主資本等変動計算書は純資産の項目の列を描く', () => {
		const doc: Document = {
			type: 'equity_statement',
			data: {
				header: {},
				rows: [
					{
						key: 'r-1',
						cells: {
							label: '当期首残高',
							capital: null,
							capitalReserve: null,
							otherCapitalSurplus: null,
							retainedReserve: null,
							retainedEarnings: null,
							valuationDifference: null,
							total: null
						}
					}
				]
			}
		};
		expect(renderedCellRefs(doc).size).toBe(8);
		expect(labelForCell(doc, 'r-1.retainedEarnings')).toBe('利益剰余金 繰越利益剰余金');
	});

	it('銀行勘定調整表は企業側と銀行側の両方を描く', () => {
		const doc: Document = {
			type: 'bank_reconciliation',
			data: {
				header: {},
				debit: [{ key: 'd1', cells: { label: '企業の残高', amount: null } }],
				credit: [{ key: 'c1', cells: { label: '銀行の残高', amount: null } }]
			}
		};
		expect(renderedCellRefs(doc)).toEqual(new Set(['d1.label', 'd1.amount', 'c1.label', 'c1.amount']));
	});

	it('材料元帳は商品有高帳と同じ列で、総平均法も指定できる', () => {
		const doc: Document = {
			type: 'material_ledger',
			data: {
				method: 'total_average',
				header: { subject: '素材A' },
				rows: [{ key: 'r-1', cells: { date: null, summary: null, received: [{ quantity: null, unitPrice: null, amount: null }], shipped: [], balance: [] } }]
			}
		};
		expect(renderedCellRefs(doc).has('r-1.received.0.unitPrice')).toBe(true);
	});
});
