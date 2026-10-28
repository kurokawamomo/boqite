import { describe, expect, it } from 'vitest';
import type { WorksheetData } from '$lib/content/documents';
import { fullWorksheet, sample } from './seisan';

describe('精算表の完成形', () => {
	it('100 シードで、試算表・修正記入・損益計算書・貸借対照表の借方合計と貸方合計が一致する', () => {
		for (let seed = 1; seed <= 100; seed++) {
			const doc = fullWorksheet(sample(seed));
			const rows = (doc.data as WorksheetData).rows.filter((r) => r.key !== 'r-total');
			const total = (doc.data as WorksheetData).rows.find((r) => r.key === 'r-total')!;
			for (const col of ['trialBalance', 'adjustment', 'incomeStatement', 'balanceSheet'] as const) {
				const debit = rows.reduce((s, r) => s + (r.cells[col].debit ?? 0), 0);
				const credit = rows.reduce((s, r) => s + (r.cells[col].credit ?? 0), 0);
				expect(debit, `seed ${seed} ${col}`).toBe(credit);
				expect(total.cells[col].debit, `seed ${seed} ${col} 合計`).toBe(debit);
			}
		}
	});

	it('100 シードで、当期純利益は正で、現金は正になる', () => {
		for (let seed = 1; seed <= 100; seed++) {
			const rows = (fullWorksheet(sample(seed)).data as WorksheetData).rows;
			expect(rows.find((r) => r.key === 'r-ni')!.cells.incomeStatement.debit, `seed ${seed}`).toBeGreaterThan(0);
			expect(rows.find((r) => r.key === 'r-cash')!.cells.trialBalance.debit, `seed ${seed}`).toBeGreaterThan(0);
		}
	});
});
