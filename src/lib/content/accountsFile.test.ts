import { describe, expect, it } from 'vitest';
import { mergeAccounts, setAccountChapters } from './accountsFile';

const base = `[
  { "name": "現金", "category": "資産", "normalSide": "debit", "chapter": 1, "description": "お金" },
  { "name": "売上", "category": "収益", "normalSide": "credit", "chapter": 2, "description": "もうけ" }
]
`;
const account = (name: string, extra: Record<string, unknown> = {}) => ({
	name,
	category: '資産',
	normalSide: 'debit',
	chapter: 5,
	description: `${name}の説明`,
	...extra
});

describe('mergeAccounts', () => {
	it('新しい科目を末尾に 1 行ずつ足し、すでにある科目は書き換えない', () => {
		const r = mergeAccounts(base, [account('使用権資産'), account('現金', { description: '違う説明' })]);
		expect(r.added).toEqual(['使用権資産']);
		expect(r.skipped).toEqual(['現金']);
		const parsed = JSON.parse(r.text);
		expect(parsed).toHaveLength(3);
		expect(parsed[0].description).toBe('お金');
		expect(r.text).toContain('{ "name": "使用権資産", "category": "資産", "normalSide": "debit", "chapter": 5,');
		expect(r.text.endsWith('\n]\n')).toBe(true);
	});

	it('足すものが無ければ、元の文字列のまま', () => {
		expect(mergeAccounts(base, [account('現金')]).text).toBe(base);
		expect(mergeAccounts(base, []).text).toBe(base);
	});

	it('何度流しても結果は同じ', () => {
		const once = mergeAccounts(base, [account('のれん')]).text;
		expect(mergeAccounts(once, [account('のれん')]).text).toBe(once);
	});

	it('追加の中の重複は最初の 1 つだけ', () => {
		const r = mergeAccounts(base, [account('のれん'), account('のれん')]);
		expect(r.added).toEqual(['のれん']);
		expect(r.skipped).toEqual(['のれん']);
	});

	it('評価勘定の valuationOf も 1 行で書く', () => {
		const r = mergeAccounts(base, [account('貸倒引当金', { category: '資産', normalSide: 'credit', valuationOf: ['売掛金', '電子記録債権'] })]);
		expect(r.text).toContain('"valuationOf": ["売掛金", "電子記録債権"]');
		expect(JSON.parse(r.text)[2].valuationOf).toEqual(['売掛金', '電子記録債権']);
	});

	it('科目の形が違えば例外', () => {
		expect(() => mergeAccounts(base, [{ name: 'x' }])).toThrow();
		expect(() => mergeAccounts(base, {})).toThrow();
	});
});

describe('setAccountChapters', () => {
	const text = `[
  { "name": "現金", "category": "資産", "normalSide": "debit", "chapter": 1, "description": "お金" },
  {
    "name": "貸倒引当金",
    "category": "資産",
    "normalSide": "credit",
    "valuationOf": ["売掛金"],
    "chapter": 12,
    "description": "備え"
  },
  { "name": "使われない科目", "category": "資産", "normalSide": "debit", "chapter": 7, "description": "x" }
]
`;

	it('使われた最初のユニットの章番号に付け直し、使われない科目は変えない', () => {
		const out = setAccountChapters(text, new Map([['現金', 2], ['貸倒引当金', 5]]));
		const parsed = JSON.parse(out);
		expect(parsed.map((a: { chapter: number }) => a.chapter)).toEqual([2, 5, 7]);
	});

	it('1 行ずつの見た目と、評価勘定の複数行の形を保つ', () => {
		const out = setAccountChapters(text, new Map([['現金', 9]]));
		expect(out).toContain('{ "name": "現金", "category": "資産", "normalSide": "debit", "chapter": 9, "description": "お金" }');
		expect(out).toContain('    "valuationOf": ["売掛金"],');
	});

	it('何度流しても結果は同じ', () => {
		const chapters = new Map([['現金', 3]]);
		const once = setAccountChapters(text, chapters);
		expect(setAccountChapters(once, chapters)).toBe(once);
	});
});
