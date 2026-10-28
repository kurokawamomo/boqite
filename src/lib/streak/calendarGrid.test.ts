import { describe, expect, it } from 'vitest';
import { buildCalendarGrid, shiftMonth, yearMonthOf } from './calendarGrid';
import type { StreakLogEntry } from '$lib/streak/types';

describe('buildCalendarGrid', () => {
	it('週7列のグリッドを生成し、月頭・月末を空白セルで埋める', () => {
		// 2026-08-01 は土曜日 → 先頭に6個の空白セル
		const cells = buildCalendarGrid(2026, 8, [], '2026-08-22');
		expect(cells.length % 7).toBe(0);
		expect(cells[0]).toEqual({ date: null, status: null, isToday: false });
		expect(cells.filter((c) => c.date !== null)).toHaveLength(31);
	});

	it('streak_logs のステータスを日付にマッピングする', () => {
		const logs: StreakLogEntry[] = [
			{ date: '2026-08-05', status: 'cleared' },
			{ date: '2026-08-06', status: 'frozen' }
		];
		const cells = buildCalendarGrid(2026, 8, logs, '2026-08-22');
		const day5 = cells.find((c) => c.date === '2026-08-05');
		const day6 = cells.find((c) => c.date === '2026-08-06');
		const day7 = cells.find((c) => c.date === '2026-08-07');
		expect(day5?.status).toBe('cleared');
		expect(day6?.status).toBe('frozen');
		expect(day7?.status).toBeNull();
	});

	it('today と一致するセルに isToday フラグが立つ', () => {
		const cells = buildCalendarGrid(2026, 8, [], '2026-08-22');
		const today = cells.find((c) => c.date === '2026-08-22');
		expect(today?.isToday).toBe(true);
	});
});

describe('shiftMonth', () => {
	it('翌月へ進む', () => {
		expect(shiftMonth(2026, 8, 1)).toEqual([2026, 9]);
	});

	it('年またぎで進む', () => {
		expect(shiftMonth(2026, 12, 1)).toEqual([2027, 1]);
	});

	it('前月へ戻る（年またぎ）', () => {
		expect(shiftMonth(2026, 1, -1)).toEqual([2025, 12]);
	});
});

describe('yearMonthOf', () => {
	it('YYYY-MM-DD から年月を取り出す', () => {
		expect(yearMonthOf('2026-08-22')).toEqual([2026, 8]);
	});
});
