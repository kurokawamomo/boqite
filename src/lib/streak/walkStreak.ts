import { fromEpochDays, toEpochDays } from './date';
import type { StreakLogEntry } from './types';

export type WalkStreakResult = {
	/** from の前日までの連続日数（broken 時は 0） */
	streak: number;
	/** from 直前の欠落日のうち、フリーズで新たに埋められた日付（新しい順） */
	frozenDates: string[];
	/** 欠落日の自動消費で実際に消費されたフリーズ数 */
	freezesConsumed: number;
	/** 消費後の残フリーズ数 */
	freezesRemaining: number;
	/** フリーズが尽きて連続記録が途切れたか */
	broken: boolean;
};

/**
 * streak_logs から `from` の前日を起点に過去へ 1 日ずつ遡る、ストリークの唯一の走査規則。
 * `deriveStreakState`（表示用の状態導出）と `computeClearOutcome`（書き込み内容の導出）は
 * どちらもこの結果を射影して使う。
 *
 * ルール:
 * - cleared の日は streak を加算して先へ進む。
 * - frozen として記録済みの日は消費済み扱いとしてそのまま先へ進む（フリーズ所持数に影響しない）。
 * - 欠落日（記録が無い日）は自動でフリーズを1個消費して streak を維持（加算はしない）。
 * - フリーズが尽きた状態で欠落日に当たると、そこで打ち切り、streak は 0 にリセットされる（broken）。
 * - ログの最古日より過去には遡らない（記録の始まり以前は判定対象外）。
 *
 * `from` 自身の状態（cleared/frozen/未記録）は呼び出し側の責務で扱う。
 */
export function walkStreak(logs: StreakLogEntry[], freezeCount: number, from: string): WalkStreakResult {
	const logMap = new Map(logs.map((l) => [l.date, l.status]));
	const oldestDays = logs.length
		? Math.min(...logs.map((l) => toEpochDays(l.date)))
		: toEpochDays(from);

	let cursor = toEpochDays(from) - 1;
	let streak = 0;
	let freezesRemaining = freezeCount;
	const frozenDates: string[] = [];
	let broken = false;

	while (cursor >= oldestDays) {
		const dateStr = fromEpochDays(cursor);
		const status = logMap.get(dateStr);

		if (status === 'cleared') {
			streak += 1;
			cursor -= 1;
			continue;
		}

		if (status === 'frozen') {
			cursor -= 1;
			continue;
		}

		// 欠落日（未学習日）
		if (freezesRemaining > 0) {
			freezesRemaining -= 1;
			frozenDates.push(dateStr);
			cursor -= 1;
			continue;
		}

		broken = true;
		break;
	}

	if (broken) {
		streak = 0;
	}

	return { streak, frozenDates, freezesConsumed: frozenDates.length, freezesRemaining, broken };
}
