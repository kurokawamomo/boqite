import { walkStreak } from '$lib/streak/walkStreak';
import type { StreakLogEntry } from '$lib/streak/types';

export type ClearOutcome = {
	/** clearDate に対し当日分がすでに記録済み（冪等ヒット）か */
	alreadyCleared: true;
} | {
	alreadyCleared: false;
	/** 新たに frozen として確定記録すべき日付（clearDate 直前のギャップを埋めた分） */
	frozenDates: string[];
	/** フリーズが尽きて連続記録が途切れたか */
	reset: boolean;
	/** clearDate をクリアした後のストリーク数 */
	newStreakCount: number;
	/** clearDate クリア直前（reset時は0）のストリーク数。節目ボーナス判定の起点に使う */
	streakBeforeClear: number;
	/** 欠落日の自動消費で実際に消費されたフリーズ数 */
	freezesConsumed: number;
};

/**
 * 既存の streak_logs と現在のフリーズ所持数から、clearDate をクリアした結果
 * DB に何を書き込むべきかを導出する純関数（DB 非依存）。
 *
 * 過去への遡り走査は `walkStreak`（`$lib/streak/`）に一本化されている。この関数は
 * その結果を「クリア記録」の形に射影するだけ。
 */
export function computeClearOutcome(
	existingLogs: StreakLogEntry[],
	freezeCount: number,
	clearDate: string
): ClearOutcome {
	if (existingLogs.some((l) => l.date === clearDate && l.status === 'cleared')) {
		return { alreadyCleared: true };
	}

	const result = walkStreak(existingLogs, freezeCount, clearDate);

	return {
		alreadyCleared: false,
		frozenDates: result.frozenDates,
		reset: result.broken,
		newStreakCount: result.streak + 1,
		// フリーズ残数は呼び出し側(service.ts)が freezesConsumed から
		// consumeFreezes()/applyBonusFreezeMilestone()/applyFreezeRefill() で算出する（節目ボーナスの反映後が「正」の残数のため）。
		// ここで別途 result.freezesRemaining を返すと「残数の答えが2つある」状態になるので持たない（レビュー🟡-7）。
		streakBeforeClear: result.streak,
		freezesConsumed: result.freezesConsumed
	};
}
