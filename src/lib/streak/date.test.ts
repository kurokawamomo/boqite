import { describe, expect, it } from 'vitest';
import { localDateString, todayInJst } from './date';

describe('todayInJst', () => {
	it('UTC 15:00 は JST 翌日 0:00 なので日付が繰り上がる', () => {
		const utcNoon = Date.parse('2026-08-21T15:00:00Z');
		expect(todayInJst(utcNoon)).toBe('2026-08-22');
	});

	it('UTC 23:00（JST 朝8時）はクリア当日として扱われる（UTC固定だと前日になる回帰ケース）', () => {
		// レビュー指摘🔴-1: JST 0:00〜8:59 のクリアが toISOString().slice(0,10) だと前日扱いになっていた
		const utcNightBeforeJstMorning = Date.parse('2026-08-21T23:00:00Z');
		expect(todayInJst(utcNightBeforeJstMorning)).toBe('2026-08-22');
	});

	it('UTC 14:59（JST 23:59）はまだ当日のまま', () => {
		const utcLateAfternoon = Date.parse('2026-08-21T14:59:00Z');
		expect(todayInJst(utcLateAfternoon)).toBe('2026-08-21');
	});
});

describe('localDateString', () => {
	it('Date のローカル年月日から YYYY-MM-DD を組み立てる（toISOString は使わない）', () => {
		const d = new Date(2026, 7, 22, 7, 30, 0); // 2026-08-22 07:30 ローカル時刻
		expect(localDateString(d)).toBe('2026-08-22');
	});

	it('1桁の月日は0埋めされる', () => {
		const d = new Date(2026, 0, 5, 0, 0, 0); // 2026-01-05
		expect(localDateString(d)).toBe('2026-01-05');
	});
});
