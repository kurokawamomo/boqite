import { describe, expect, it } from 'vitest';
import { accountsUsedBy, assignNewAccounts } from './newAccounts';

const journal = (debit: string, credit: string, extra: Record<string, unknown> = {}) => ({
	id: debit + credit,
	task: {
		kind: 'journal',
		debit: [{ account: debit, amount: 1 }],
		credit: [{ account: credit, amount: 1 }],
		accountOptions: [debit, credit, 'ダミー'],
		amountInput: 'numpad'
	},
	...extra
});
const unit = (chapter: number, questions: Array<Record<string, unknown>>) => ({
	unit: { chapter },
	nodes: [{ id: `n${chapter}`, questions }]
});
const names = new Set(['現金', '売上', '仕入', '買掛金']);

describe('accountsUsedBy', () => {
	it('仕訳は借方・貸方の科目を、選択肢のダミーを除いて返す', () => {
		expect(accountsUsedBy(journal('現金', '売上'))).toEqual(['現金', '売上']);
	});

	it('様式は科目選択欄の正解を返す', () => {
		const q = {
			task: {
				kind: 'form_fill',
				blanks: [
					{ ref: 'a', input: 'account_picker', answer: '仕入', accountOptions: ['仕入'] },
					{ ref: 'b', input: 'numpad', answer: 1 }
				]
			}
		};
		expect(accountsUsedBy(q)).toEqual(['仕入']);
	});
});

describe('assignNewAccounts', () => {
	it('章の並び順で、最初に使った問題だけに付ける', () => {
		const later = journal('現金', '買掛金');
		const first = journal('現金', '売上', { newAccounts: ['手書き'] });
		const units = [unit(2, [later]), unit(1, [first])];
		assignNewAccounts(units, names);
		expect(first).toHaveProperty('newAccounts', ['現金', '売上']);
		expect(later).toHaveProperty('newAccounts', ['買掛金']);
	});

	it('手で書いた newAccounts は消え、マスタにない科目には付けない', () => {
		const q = journal('謎', '現金', { newAccounts: ['謎'] });
		assignNewAccounts([unit(1, [q])], names);
		expect(q).toHaveProperty('newAccounts', ['現金']);
	});

	it('何度流しても結果は同じ', () => {
		const units = [unit(1, [journal('現金', '売上'), journal('仕入', '現金')])];
		assignNewAccounts(units, names);
		const once = JSON.stringify(units);
		assignNewAccounts(units, names);
		expect(JSON.stringify(units)).toBe(once);
	});
});
