import { describe, expect, it } from 'vitest';
import type { JournalTask } from '$lib/content/types';
import {
	addLine,
	canSubmit,
	checkAnswer,
	createEmptyEntry,
	hasDuplicateAccount,
	lineSum,
	placeAccount,
	placeAmount,
	removeLine,
	setLineAccount,
	setLineAmount
} from './journal';

const simpleTask: JournalTask = {
	kind: 'journal',
	debit: [{ account: '現金', amount: 1000 }],
	credit: [{ account: '売上', amount: 1000 }],
	accountOptions: ['現金', '売上', '仕入'],
	amountInput: 'numpad'
};

const compoundTask: JournalTask = {
	kind: 'journal',
	debit: [
		{ account: '現金', amount: 700 },
		{ account: '売掛金', amount: 300 }
	],
	credit: [{ account: '売上', amount: 1000 }],
	accountOptions: ['現金', '売掛金', '売上', '仕入'],
	amountInput: 'numpad'
};

function fillLine(entry: ReturnType<typeof createEmptyEntry>, side: 'debit' | 'credit', index: number, account: string, amount: number) {
	return setLineAmount(setLineAccount(entry, side, index, account), side, index, amount);
}

describe('journal', () => {
	it('checkAnswer accepts a correctly filled simple entry', () => {
		let entry = createEmptyEntry();
		entry = fillLine(entry, 'debit', 0, '現金', 1000);
		entry = fillLine(entry, 'credit', 0, '売上', 1000);
		expect(checkAnswer(entry, simpleTask)).toBe(true);
	});

	it('checkAnswer rejects mismatched amount', () => {
		let entry = createEmptyEntry();
		entry = fillLine(entry, 'debit', 0, '現金', 900);
		entry = fillLine(entry, 'credit', 0, '売上', 900);
		expect(checkAnswer(entry, simpleTask)).toBe(false);
	});

	it('checkAnswer is order-independent for compound entries', () => {
		let entry = createEmptyEntry();
		entry = addLine(entry, 'debit');
		entry = fillLine(entry, 'debit', 0, '売掛金', 300);
		entry = fillLine(entry, 'debit', 1, '現金', 700);
		entry = fillLine(entry, 'credit', 0, '売上', 1000);
		expect(checkAnswer(entry, compoundTask)).toBe(true);
	});

	it('addLine caps at 4 lines per side', () => {
		let entry = createEmptyEntry();
		for (let i = 0; i < 5; i++) entry = addLine(entry, 'debit');
		expect(entry.debit).toHaveLength(4);
	});

	it('removeLine keeps at least 1 line', () => {
		let entry = createEmptyEntry();
		entry = removeLine(entry, 'debit', 0);
		expect(entry.debit).toHaveLength(1);
	});

	it('hasDuplicateAccount flags same account twice on one side', () => {
		let entry = createEmptyEntry();
		entry = addLine(entry, 'debit');
		entry = fillLine(entry, 'debit', 0, '現金', 500);
		entry = fillLine(entry, 'debit', 1, '現金', 500);
		expect(hasDuplicateAccount(entry.debit)).toBe(true);
	});

	it('canSubmit is false until balanced and complete', () => {
		let entry = createEmptyEntry();
		expect(canSubmit(entry)).toBe(false);
		entry = fillLine(entry, 'debit', 0, '現金', 1000);
		expect(canSubmit(entry)).toBe(false);
		entry = fillLine(entry, 'credit', 0, '売上', 900);
		expect(canSubmit(entry)).toBe(false);
		entry = setLineAmount(entry, 'credit', 0, 1000);
		expect(canSubmit(entry)).toBe(true);
	});

	it('lineSum ignores unfilled amounts', () => {
		const entry = createEmptyEntry();
		expect(lineSum(entry.debit)).toBe(0);
	});
});

describe('小数の金額', () => {
	const decimalTask: JournalTask = {
		kind: 'journal',
		debit: [{ account: '現金', amount: 0.3 }],
		credit: [
			{ account: '売上', amount: 0.1 },
			{ account: '受取利息', amount: 0.2 }
		],
		accountOptions: ['現金', '売上', '受取利息'],
		amountInput: 'numpad'
	};

	it('lineSum は 0.1 + 0.2 の誤差を丸める', () => {
		const entry = fillLine(
			addLine(createEmptyEntry(), 'credit'),
			'credit',
			0,
			'売上',
			0.1
		);
		const lines = fillLine(entry, 'credit', 1, '受取利息', 0.2).credit;
		expect(lineSum(lines)).toBe(0.3);
	});

	it('借方 0.3、貸方 0.1 + 0.2 は貸借が一致して提出でき、正解になる', () => {
		let entry = addLine(createEmptyEntry(), 'credit');
		entry = fillLine(entry, 'debit', 0, '現金', 0.3);
		entry = fillLine(entry, 'credit', 0, '売上', 0.1);
		entry = fillLine(entry, 'credit', 1, '受取利息', 0.2);
		expect(canSubmit(entry)).toBe(true);
		expect(checkAnswer(entry, decimalTask)).toBe(true);
	});

	it('整数が答えの問題に小数を入れると不正解になる', () => {
		let entry = createEmptyEntry();
		entry = fillLine(entry, 'debit', 0, '現金', 1000.5);
		entry = fillLine(entry, 'credit', 0, '売上', 1000.5);
		expect(canSubmit(entry)).toBe(true);
		expect(checkAnswer(entry, simpleTask)).toBe(false);
	});
});

describe('金額の置き方（OK を続けて押す）', () => {
	const start = () => createEmptyEntry();

	it('選んだ金額欄に入れ、次の空欄へ進む', () => {
		const r = placeAmount(start(), { side: 'debit', index: 0, field: 'amount' }, 50000);
		expect(r.entry.debit[0].amount).toBe(50000);
		// 借方の金額欄の「次」から読み順に見て、最初の空欄は貸方の科目欄
		expect(r.activeSlot).toEqual({ side: 'credit', index: 0, field: 'account' });
	});

	it('同じ金額を、次の欄を選んで OK するだけで入れられる', () => {
		let entry = start();
		let active: ReturnType<typeof placeAmount>['activeSlot'] = { side: 'debit', index: 0, field: 'amount' };
		({ entry, activeSlot: active } = placeAmount(entry, active, 50000));
		expect(entry.debit[0].amount).toBe(50000);
		// 貸方の金額欄を選んで、同じ金額で OK
		({ entry, activeSlot: active } = placeAmount(entry, { side: 'credit', index: 0, field: 'amount' }, 50000));
		expect(entry.credit[0].amount).toBe(50000);
		expect(entry.debit[0].amount).toBe(50000);
	});

	it('OK を続けて押しても、同じ欄に二重には入らず、入力済みの欄は書き換わらない', () => {
		let entry = start();
		let active: ReturnType<typeof placeAmount>['activeSlot'] = { side: 'debit', index: 0, field: 'amount' };
		({ entry, activeSlot: active } = placeAmount(entry, active, 50000));
		// 2 回目: 選択は次の空欄へ進んでいるので、借方を書き換えず、空の金額欄（貸方）に入る
		({ entry, activeSlot: active } = placeAmount(entry, active, 60000));
		expect(entry.debit[0].amount).toBe(50000);
		expect(entry.credit[0].amount).toBe(60000);
		// 3 回目: 空の金額欄がもう無い。何も変わらない
		const before = JSON.stringify({ entry, active });
		const third = placeAmount(entry, active, 70000);
		expect(JSON.stringify({ entry: third.entry, active: third.activeSlot })).toBe(before);
		expect(third.entry.debit[0].amount).toBe(50000);
		expect(third.entry.credit[0].amount).toBe(60000);
	});

	it('選択が科目欄のときは、最初の空の金額欄に入れる', () => {
		const r = placeAmount(start(), { side: 'credit', index: 0, field: 'account' }, 1200);
		expect(r.entry.debit[0].amount).toBe(1200);
		expect(r.entry.credit[0].amount).toBeNull();
	});

	it('金額欄を選び直せば、入力済みの金額を直せる', () => {
		let entry = start();
		({ entry } = placeAmount(entry, { side: 'debit', index: 0, field: 'amount' }, 50000));
		({ entry } = placeAmount(entry, { side: 'debit', index: 0, field: 'amount' }, 55000));
		expect(entry.debit[0].amount).toBe(55000);
	});

	it('科目も同じ置き方で、入力済みの科目は書き換わらない', () => {
		let entry = start();
		let active: ReturnType<typeof placeAccount>['activeSlot'] = { side: 'debit', index: 0, field: 'account' };
		({ entry, activeSlot: active } = placeAccount(entry, active, '現金'));
		({ entry, activeSlot: active } = placeAccount(entry, active, '売上'));
		expect(entry.debit[0].account).toBe('現金');
		expect(entry.credit[0].account).toBe('売上');
		const third = placeAccount(entry, active, '仕入');
		expect(third.entry.debit[0].account).toBe('現金');
		expect(third.entry.credit[0].account).toBe('売上');
	});
});
