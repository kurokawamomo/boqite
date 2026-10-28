import { describe, expect, it } from 'vitest';
import type { FormBlank } from '$lib/content/types';
import type { Document } from '$lib/content/documents';
import { checkFormFillAnswers, findWrongBlanks } from './formFill';

const document: Document = {
	type: 'journal_book',
	data: {
		header: {},
		rows: [
			{ key: 'r1', cells: { date: null, summary: null, folio: null, debit: null, credit: null } },
			{ key: 'r2', cells: { date: null, summary: null, folio: null, debit: null, credit: null } },
			{ key: 'r4', cells: { date: null, summary: null, folio: null, debit: null, credit: null } }
		]
	}
};

const blanks: FormBlank[] = [
	{ ref: 'r1.debit', input: 'numpad', answer: 600 },
	{ ref: 'r2.summary', input: 'chips', answer: '資本金', options: ['資本金', '仕入'] },
	{ ref: 'r4.credit', input: 'numpad', answer: 240 }
];

describe('checkFormFillAnswers', () => {
	it('is true only when every blank matches', () => {
		expect(checkFormFillAnswers({ 'r1.debit': 600, 'r2.summary': '資本金', 'r4.credit': 240 }, blanks)).toBe(true);
	});

	it('is false when any blank mismatches', () => {
		expect(checkFormFillAnswers({ 'r1.debit': 600, 'r2.summary': '仕入', 'r4.credit': 240 }, blanks)).toBe(false);
	});
});

describe('findWrongBlanks', () => {
	it('returns only mismatching blanks with human labels', () => {
		const wrong = findWrongBlanks({ 'r1.debit': 500, 'r2.summary': '資本金', 'r4.credit': 240 }, blanks, document);
		expect(wrong).toEqual([{ ref: 'r1.debit', label: '借方', correctAnswer: 600 }]);
	});

	it('returns empty array when all match', () => {
		expect(findWrongBlanks({ 'r1.debit': 600, 'r2.summary': '資本金', 'r4.credit': 240 }, blanks, document)).toEqual([]);
	});
});
