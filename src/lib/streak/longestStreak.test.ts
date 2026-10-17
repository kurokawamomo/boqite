import { describe, expect, it } from 'vitest';
import { computeLongestStreak } from './longestStreak';
import type { StreakLogEntry } from '$lib/streak/types';

describe('computeLongestStreak', () => {
	it('ログなしなら0', () => {
		expect(computeLongestStreak([])).toBe(0);
	});

	it('単日のみなら1', () => {
		expect(computeLongestStreak([{ date: '2026-08-22', status: 'cleared' }])).toBe(1);
	});

	it('連続日の最大長を返す（frozenも連続扱い）', () => {
		const logs: StreakLogEntry[] = [
			{ date: '2026-08-01', status: 'cleared' },
			{ date: '2026-08-02', status: 'cleared' },
			{ date: '2026-08-03', status: 'frozen' },
			{ date: '2026-08-04', status: 'cleared' },
			// gap
			{ date: '2026-08-10', status: 'cleared' },
			{ date: '2026-08-11', status: 'cleared' }
		];
		expect(computeLongestStreak(logs)).toBe(4);
	});

	it('日付順不同でも正しく計算する', () => {
		const logs: StreakLogEntry[] = [
			{ date: '2026-08-04', status: 'cleared' },
			{ date: '2026-08-02', status: 'cleared' },
			{ date: '2026-08-03', status: 'cleared' }
		];
		expect(computeLongestStreak(logs)).toBe(3);
	});
});
