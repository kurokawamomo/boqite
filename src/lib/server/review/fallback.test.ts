import { describe, expect, it } from 'vitest';
import { uniformPoolFallback } from './fallback';

describe('uniformPoolFallback', () => {
	it('指定件数を返す(候補不足は重複で埋める)', () => {
		const result = uniformPoolFallback(['q1', 'q2'], 5, 1);
		expect(result).toHaveLength(5);
		expect(result.every((id) => id === 'q1' || id === 'q2')).toBe(true);
	});

	it('同じseedなら同じ結果', () => {
		const a = uniformPoolFallback(['q1', 'q2', 'q3'], 6, 42);
		const b = uniformPoolFallback(['q1', 'q2', 'q3'], 6, 42);
		expect(a).toEqual(b);
	});

	it('プールが空なら空配列', () => {
		expect(uniformPoolFallback([], 5, 1)).toEqual([]);
	});

	it('偏りなく全候補が出現しうる(多数回試行)', () => {
		const seen = new Set<string>();
		for (let seed = 0; seed < 50; seed++) {
			for (const id of uniformPoolFallback(['q1', 'q2', 'q3', 'q4'], 3, seed)) {
				seen.add(id);
			}
		}
		expect(seen.size).toBe(4);
	});
});
