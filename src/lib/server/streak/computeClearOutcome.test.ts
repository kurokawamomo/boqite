import { describe, expect, it } from 'vitest';
import { computeClearOutcome } from './computeClearOutcome';
import type { StreakLogEntry } from '$lib/streak/types';

describe('computeClearOutcome', () => {
	it('初回クリア: streak=1、フリーズ消費なし', () => {
		const result = computeClearOutcome([], 2, '2026-08-22');
		expect(result).toEqual({
			alreadyCleared: false,
			frozenDates: [],
			reset: false,
			newStreakCount: 1,
			streakBeforeClear: 0,
			freezesConsumed: 0
		});
	});

	it('同日2回目は冪等（alreadyCleared）', () => {
		const logs: StreakLogEntry[] = [{ date: '2026-08-22', status: 'cleared' }];
		const result = computeClearOutcome(logs, 2, '2026-08-22');
		expect(result).toEqual({ alreadyCleared: true });
	});

	it('前日連続クリア: streak加算、フリーズ消費なし', () => {
		const logs: StreakLogEntry[] = [{ date: '2026-08-21', status: 'cleared' }];
		const result = computeClearOutcome(logs, 2, '2026-08-22');
		expect(result).toEqual({
			alreadyCleared: false,
			frozenDates: [],
			reset: false,
			newStreakCount: 2,
			streakBeforeClear: 1,
			freezesConsumed: 0
		});
	});

	it('1日空き: 欠落日をフリーズで自動補完しstreak継続', () => {
		const logs: StreakLogEntry[] = [{ date: '2026-08-20', status: 'cleared' }];
		// 2026-08-21 が欠落
		const result = computeClearOutcome(logs, 2, '2026-08-22');
		expect(result).toEqual({
			alreadyCleared: false,
			frozenDates: ['2026-08-21'],
			reset: false,
			newStreakCount: 2,
			streakBeforeClear: 1,
			freezesConsumed: 1
		});
	});

	it('2日空き: 所持上限2個ちょうど消費してstreak継続', () => {
		const logs: StreakLogEntry[] = [{ date: '2026-08-19', status: 'cleared' }];
		// 08-20, 08-21 が欠落
		const result = computeClearOutcome(logs, 2, '2026-08-22');
		expect(result).toEqual({
			alreadyCleared: false,
			frozenDates: ['2026-08-21', '2026-08-20'],
			reset: false,
			newStreakCount: 2,
			streakBeforeClear: 1,
			freezesConsumed: 2
		});
	});

	it('3日空き: フリーズ不足でreset、streakは1から再スタート', () => {
		const logs: StreakLogEntry[] = [{ date: '2026-08-18', status: 'cleared' }];
		// 08-19, 08-20, 08-21 が欠落（フリーズ2個では足りない）
		const result = computeClearOutcome(logs, 2, '2026-08-22');
		expect(result).toEqual({
			alreadyCleared: false,
			frozenDates: ['2026-08-21', '2026-08-20'],
			reset: true,
			newStreakCount: 1,
			streakBeforeClear: 0,
			freezesConsumed: 2
		});
	});

	it('フリーズ所持0で欠落1日: reset、streak=1', () => {
		const logs: StreakLogEntry[] = [{ date: '2026-08-20', status: 'cleared' }];
		const result = computeClearOutcome(logs, 0, '2026-08-22');
		expect(result).toEqual({
			alreadyCleared: false,
			frozenDates: [],
			reset: true,
			newStreakCount: 1,
			streakBeforeClear: 0,
			freezesConsumed: 0
		});
	});

	it('既存frozen記録日はフリーズ残数に影響せずstreak継続扱い', () => {
		const logs: StreakLogEntry[] = [
			{ date: '2026-08-20', status: 'cleared' },
			{ date: '2026-08-21', status: 'frozen' }
		];
		const result = computeClearOutcome(logs, 2, '2026-08-22');
		expect(result).toEqual({
			alreadyCleared: false,
			frozenDates: [],
			reset: false,
			newStreakCount: 2,
			streakBeforeClear: 1,
			freezesConsumed: 0
		});
	});

	it('日付跨ぎ（月末→月初）でも1日として正しく連続判定される', () => {
		const logs: StreakLogEntry[] = [{ date: '2026-07-31', status: 'cleared' }];
		const result = computeClearOutcome(logs, 2, '2026-08-01');
		expect(result).toEqual({
			alreadyCleared: false,
			frozenDates: [],
			reset: false,
			newStreakCount: 2,
			streakBeforeClear: 1,
			freezesConsumed: 0
		});
	});
});
