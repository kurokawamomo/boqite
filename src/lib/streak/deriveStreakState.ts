import type { StreakLogEntry, StreakState } from './types';
import { walkStreak } from './walkStreak';

/**
 * streak_logs 相当のログとフリーズ所持数から、today 時点のストリーク状態を導出する純関数。
 * 過去への遡り走査は `walkStreak` に一本化されており、この関数は today 自身の状態
 * （cleared / frozen / 未記録）を踏まえてその結果を射影するだけの薄い層。
 *
 * - today が cleared なら、today 直前までの連続日数（broken 後の再スタートを含む）に +1 する。
 *   これは recordClear が書き込む newStreakCount と常に一致する（POST 後の GET 整合性）。
 * - today が未記録（まだ学習していない）または frozen 記録済みなら、加算はせず維持のみ。
 */
export function deriveStreakState(
	logs: StreakLogEntry[],
	freezeCount: number,
	today: string
): StreakState {
	const todayStatus = logs.find((l) => l.date === today)?.status;
	const result = walkStreak(logs, freezeCount, today);

	const streakCount = todayStatus === 'cleared' ? result.streak + 1 : result.streak;

	return {
		streakCount,
		freezesConsumed: result.freezesConsumed,
		freezesRemaining: result.freezesRemaining,
		broken: result.broken
	};
}
