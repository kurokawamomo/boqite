import { describe, expect, it } from 'vitest';
import type { Document } from '$lib/content/documents';
import { getCell, refFor } from './refs';

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
			}
		]
	}
};

const worksheet: Document = {
	type: 'worksheet',
	data: {
		header: { title: '精算表' },
		rows: [
			{
				key: 'r-shiire',
				cells: {
					accountName: '仕 入',
					trialBalance: { debit: 900, credit: null },
					adjustment: { debit: 100, credit: 50 },
					incomeStatement: { debit: 950, credit: null },
					balanceSheet: { debit: null, credit: null }
				}
			}
		]
	}
};

const inventoryLedger: Document = {
	type: 'inventory_ledger',
	data: {
		method: 'fifo',
		header: { title: '商品有高帳' },
		rows: [
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
			}
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

describe('getCell', () => {
	it('resolves a simple <rowKey>.<column> ref', () => {
		expect(getCell(cashBook, 'r-0503.expense')).toBe(80);
		expect(getCell(cashBook, 'r-0503.income')).toBeNull();
		expect(getCell(cashBook, 'r-0501.balance')).toBe(200);
	});

	it('resolves a nested <rowKey>.<column>.<field> ref', () => {
		expect(getCell(worksheet, 'r-shiire.incomeStatement.debit')).toBe(950);
		expect(getCell(worksheet, 'r-shiire.balanceSheet.debit')).toBeNull();
	});

	it('resolves a <rowKey>.<column>.<index>.<field> ref (array layer)', () => {
		expect(getCell(inventoryLedger, 'r-1112.shipped.1.amount')).toBe(65);
		expect(getCell(inventoryLedger, 'r-1112.shipped.0.quantity')).toBe(10);
		expect(getCell(inventoryLedger, 'r-1112.balance.0.amount')).toBe(195);
	});

	it('resolves rows split across debit/credit (BilateralBook)', () => {
		expect(getCell(tAccount, 'd1.amount')).toBe(500);
		expect(getCell(tAccount, 'c1.counterAccount')).toBe('仕入');
	});

	it('returns undefined for an unknown row key', () => {
		expect(getCell(cashBook, 'r-9999.expense')).toBeUndefined();
	});

	it('returns undefined for a path that runs past the data shape', () => {
		expect(getCell(cashBook, 'r-0503.expense.tooDeep')).toBeUndefined();
		expect(getCell(inventoryLedger, 'r-1112.shipped.99.amount')).toBeUndefined();
	});
});

describe('refFor', () => {
	it('joins segments with dots', () => {
		expect(refFor('r-0503', 'expense')).toBe('r-0503.expense');
		expect(refFor('r-1112', 'shipped', 1, 'amount')).toBe('r-1112.shipped.1.amount');
	});
});
