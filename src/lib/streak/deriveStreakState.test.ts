import { describe, expect, it } from 'vitest';
import { deriveStreakState } from './deriveStreakState';
import type { StreakLogEntry } from './types';

const TODAY = '2026-08-22';

describe('deriveStreakState', () => {
	it('初回: ログなし・フリーズなしなら streak=0, broken=false', () => {
		const result = deriveStreakState([], 0, TODAY);
		expect(result).toEqual({
			streakCount: 0,
			freezesConsumed: 0,
			freezesRemaining: 0,
			broken: false
		});
	});

	it('今日クリア済みのみ: streak=1', () => {
		const logs: StreakLogEntry[] = [{ date: TODAY, status: 'cleared' }];
		const result = deriveStreakState(logs, 2, TODAY);
		expect(result).toEqual({
			streakCount: 1,
			freezesConsumed: 0,
			freezesRemaining: 2,
			broken: false
		});
	});

	it('連続クリア3日（今日含む）: streak=3、フリーズ消費なし', () => {
		const logs: StreakLogEntry[] = [
			{ date: '2026-08-20', status: 'cleared' },
			{ date: '2026-08-21', status: 'cleared' },
			{ date: TODAY, status: 'cleared' }
		];
		const result = deriveStreakState(logs, 2, TODAY);
		expect(result).toEqual({
			streakCount: 3,
			freezesConsumed: 0,
			freezesRemaining: 2,
			broken: false
		});
	});

	it('今日未学習・前日まで連続: 猶予でフリーズ消費なし、streak維持', () => {
		const logs: StreakLogEntry[] = [
			{ date: '2026-08-20', status: 'cleared' },
			{ date: '2026-08-21', status: 'cleared' }
		];
		const result = deriveStreakState(logs, 2, TODAY);
		expect(result).toEqual({
			streakCount: 2,
			freezesConsumed: 0,
			freezesRemaining: 2,
			broken: false
		});
	});

	it('1日空き: フリーズ1個自動消費してストリーク維持（加算なし）', () => {
		const logs: StreakLogEntry[] = [
			{ date: '2026-08-20', status: 'cleared' },
			// 2026-08-21 は未学習（欠落）
			{ date: TODAY, status: 'cleared' }
		];
		const result = deriveStreakState(logs, 2, TODAY);
		expect(result).toEqual({
			streakCount: 2,
			freezesConsumed: 1,
			freezesRemaining: 1,
			broken: false
		});
	});

	it('2日空き: 所持上限のフリーズ2個をちょうど消費してストリーク維持', () => {
		const logs: StreakLogEntry[] = [
			{ date: '2026-08-19', status: 'cleared' },
			// 08-20, 08-21 が未学習（欠落）
			{ date: TODAY, status: 'cleared' }
		];
		const result = deriveStreakState(logs, 2, TODAY);
		expect(result).toEqual({
			streakCount: 2,
			freezesConsumed: 2,
			freezesRemaining: 0,
			broken: false
		});
	});

	it('3日空き: フリーズ2個では足りず broken だが、today 自身の cleared は再スタートの1日目として数える', () => {
		// today が cleared として記録されている＝recordClear が既に「reset 後 1 から再スタート」で
		// 書き込んだ状態。GET はその DB 状態をそのまま反映すべきなので streakCount は 0 ではなく 1。
		const logs: StreakLogEntry[] = [
			{ date: '2026-08-18', status: 'cleared' },
			// 08-19, 08-20, 08-21 が未学習（欠落）
			{ date: TODAY, status: 'cleared' }
		];
		const result = deriveStreakState(logs, 2, TODAY);
		expect(result).toEqual({
			streakCount: 1,
			freezesConsumed: 2,
			freezesRemaining: 0,
			broken: true
		});
	});

	it('フリーズ所持0で1日空き: broken だが today 自身の cleared は再スタートの1日目として数える', () => {
		const logs: StreakLogEntry[] = [
			{ date: '2026-08-20', status: 'cleared' },
			{ date: TODAY, status: 'cleared' }
		];
		const result = deriveStreakState(logs, 0, TODAY);
		expect(result).toEqual({
			streakCount: 1,
			freezesConsumed: 0,
			freezesRemaining: 0,
			broken: true
		});
	});

	it('今日未学習の状態でフリーズが尽きて broken: streakCount は加算されず0', () => {
		const logs: StreakLogEntry[] = [{ date: '2026-08-18', status: 'cleared' }];
		// 08-19, 08-20, 08-21 が未学習（欠落）、TODAY も未記録
		const result = deriveStreakState(logs, 2, TODAY);
		expect(result).toEqual({
			streakCount: 0,
			freezesConsumed: 2,
			freezesRemaining: 0,
			broken: true
		});
	});

	it('既に frozen 記録済みの日は所持フリーズ数に影響せずストリーク維持', () => {
		const logs: StreakLogEntry[] = [
			{ date: '2026-08-20', status: 'cleared' },
			{ date: '2026-08-21', status: 'frozen' },
			{ date: TODAY, status: 'cleared' }
		];
		const result = deriveStreakState(logs, 2, TODAY);
		expect(result).toEqual({
			streakCount: 2,
			freezesConsumed: 0,
			freezesRemaining: 2,
			broken: false
		});
	});

	it('日付跨ぎ（月末→月初）でも1日として正しく連続判定される', () => {
		const logs: StreakLogEntry[] = [
			{ date: '2026-07-31', status: 'cleared' },
			{ date: '2026-08-01', status: 'cleared' }
		];
		const result = deriveStreakState(logs, 2, '2026-08-01');
		expect(result).toEqual({
			streakCount: 2,
			freezesConsumed: 0,
			freezesRemaining: 2,
			broken: false
		});
	});

	it('年跨ぎ（年末→年始）でも1日として正しく連続判定される', () => {
		const logs: StreakLogEntry[] = [
			{ date: '2025-12-31', status: 'cleared' },
			{ date: '2026-01-01', status: 'cleared' }
		];
		const result = deriveStreakState(logs, 2, '2026-01-01');
		expect(result).toEqual({
			streakCount: 2,
			freezesConsumed: 0,
			freezesRemaining: 2,
			broken: false
		});
	});

	it('今日未学習かつ前日も欠落: 今日は猶予、前日はフリーズ消費', () => {
		const logs: StreakLogEntry[] = [{ date: '2026-08-20', status: 'cleared' }];
		// 2026-08-21（前日）は欠落、TODAY（今日）は未記録
		const result = deriveStreakState(logs, 2, TODAY);
		expect(result).toEqual({
			streakCount: 1,
			freezesConsumed: 1,
			freezesRemaining: 1,
			broken: false
		});
	});

	it('過去に途切れがあっても最古ログより前には遡らず broken にしない', () => {
		const logs: StreakLogEntry[] = [{ date: TODAY, status: 'cleared' }];
		const result = deriveStreakState(logs, 0, TODAY);
		expect(result).toEqual({
			streakCount: 1,
			freezesConsumed: 0,
			freezesRemaining: 0,
			broken: false
		});
	});
});
