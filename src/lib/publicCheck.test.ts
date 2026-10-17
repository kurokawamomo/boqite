import { describe, expect, it } from 'vitest';
import { findBlockedWords, parseBlocklist, toEre } from './publicCheck';

// テスト用の架空語。実際の語リストはリポジトリの外にある
const WORD = 'zqxjk';

describe('parseBlocklist', () => {
	it('空行とコメント行を除き、前後の空白を落とす', () => {
		expect(parseBlocklist(`# 見出し\n\n  ${WORD}  \r\nabc\n#x\n`)).toEqual([WORD, 'abc']);
	});
});

describe('findBlockedWords', () => {
	const files = [
		{ path: 'src/a.ts', content: `ok\nこれは${WORD}を含む\nok` },
		{ path: `docs/${WORD}.md`, content: 'ok' },
		{ path: 'src/b.ts', content: 'ok' }
	];

	it('語を含む行を、ファイルと行番号つきで返す', () => {
		const hits = findBlockedWords(files, [WORD]);
		expect(hits).toContainEqual({ path: 'src/a.ts', line: 2, word: WORD });
	});

	it('パス名に語が入っているものも拾う（行番号 0）', () => {
		expect(findBlockedWords(files, [WORD])).toContainEqual({ path: `docs/${WORD}.md`, line: 0, word: WORD });
	});

	it('語を含まないファイルは拾わない', () => {
		expect(findBlockedWords(files, [WORD]).some((h) => h.path === 'src/b.ts')).toBe(false);
	});

	it('大文字小文字と全角半角の違いを無視する', () => {
		const hits = findBlockedWords([{ path: 'x', content: 'ＺＱＸＪＫ' }], [WORD.toUpperCase()]);
		expect(hits).toHaveLength(1);
	});

	it('英数字だけの語は、前後が英数字の単語の一部には当てない', () => {
		const files = [{ path: 'a', content: `static ${WORD}s ${WORD}:ch1 x_${WORD} (${WORD})` }];
		const hits = findBlockedWords(files, [WORD]);
		expect(hits.map((h) => h.line)).toEqual([1]);
		expect(findBlockedWords([{ path: 'a', content: `unlikely${WORD}x` }], [WORD])).toEqual([]);
		expect(findBlockedWords([{ path: 'a', content: `${WORD}:ch1` }], [WORD])).toHaveLength(1);
	});

	it('語リストが空なら何も拾わない', () => {
		expect(findBlockedWords(files, [])).toEqual([]);
	});
});

describe('toEre', () => {
	it('英数字の語は前後が英数字でないところにだけ当たり、日本語の語は部分一致', () => {
		const ascii = new RegExp(toEre(WORD));
		expect(ascii.test(`x ${WORD}:ch`)).toBe(true);
		expect(ascii.test(`${WORD}`)).toBe(true);
		expect(ascii.test(`a${WORD}b`)).toBe(false);
		expect(new RegExp(toEre('語リスト')).test('この語リストは')).toBe(true);
	});

	it('正規表現の記号をエスケープする', () => {
		expect(new RegExp(toEre('a.b')).test('a.b')).toBe(true);
		expect(new RegExp(toEre('語.')).test('語x')).toBe(false);
	});
});
