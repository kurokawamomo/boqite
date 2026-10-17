import { describe, expect, it } from 'vitest';
import { isMatchingPair } from './matchTask';

describe('isMatchingPair', () => {
	const pairs: Array<[string, string]> = [
		['現金', '資産'],
		['備品', '資産'],
		['借入金', '負債'],
		['売上', '収益']
	];

	it('正解の組み合わせは true', () => {
		expect(isMatchingPair(pairs, '現金', '資産')).toBe(true);
		expect(isMatchingPair(pairs, '備品', '資産')).toBe(true);
	});

	it('表示内容が重複していても、pairs内のいずれかの組として成立すれば true', () => {
		// '現金' と '資産' の組は pairs[0] そのものだが、pairs[1] の右側も同じ '資産' ラベル。
		// pairIndex が異なっていても、内容として成立する組み合わせは正解として扱う。
		expect(isMatchingPair(pairs, '現金', '資産')).toBe(true);
	});

	it('不正解の組み合わせは false', () => {
		expect(isMatchingPair(pairs, '現金', '負債')).toBe(false);
		expect(isMatchingPair(pairs, '借入金', '資産')).toBe(false);
	});

	it('存在しないラベルは false', () => {
		expect(isMatchingPair(pairs, '存在しない科目', '資産')).toBe(false);
	});
});
