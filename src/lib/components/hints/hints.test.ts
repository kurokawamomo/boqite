import { describe, expect, it } from 'vitest';
import { extractChapterNumber, pickHint } from './hints';

describe('extractChapterNumber', () => {
	it('b3-u01 のような unitId から章番号を取り出す', () => {
		expect(extractChapterNumber('b3-u01')).toBe(1);
		expect(extractChapterNumber('b3-u08')).toBe(8);
	});

	it('数字が見つからない場合は null', () => {
		expect(extractChapterNumber('b3-review')).toBeNull();
	});
});

describe('pickHint', () => {
	it('登録済みの章では必ずヒント文字列を返す', () => {
		for (let chapter = 1; chapter <= 19; chapter++) {
			const hint = pickHint(`b3-u${String(chapter).padStart(2, '0')}`);
			expect(typeof hint).toBe('string');
			expect(hint.length).toBeGreaterThan(0);
		}
	});

	it('U1〜U19 のすべてに、重複のないヒントが3本ずつある', () => {
		for (let chapter = 1; chapter <= 19; chapter++) {
			const seen = new Set<string>();
			for (let i = 0; i < 300; i++) seen.add(pickHint(`b3-u${String(chapter).padStart(2, '0')}`));
			expect(seen.size, `U${chapter}`).toBe(3);
		}
	});

	it('未登録の章・不明なunitIdでもフォールバック文言を返す', () => {
		expect(pickHint('b3-u99').length).toBeGreaterThan(0);
		expect(pickHint('unknown').length).toBeGreaterThan(0);
	});
});
