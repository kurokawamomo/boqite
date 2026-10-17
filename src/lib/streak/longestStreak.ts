import { toEpochDays } from './date';
import type { StreakLogEntry } from './types';

/**
 * streak_logs 全体から過去最長の連続記録日数を求める（cleared/frozen を問わず、
 * 隣接する日付が1日差で並んでいれば連続とみなす）。
 */
export function computeLongestStreak(logs: StreakLogEntry[]): number {
	if (logs.length === 0) return 0;

	const sortedDays = logs.map((l) => toEpochDays(l.date)).sort((a, b) => a - b);

	let longest = 1;
	let current = 1;
	for (let i = 1; i < sortedDays.length; i++) {
		const diff = sortedDays[i] - sortedDays[i - 1];
		if (diff === 0) continue; // 重複日付（想定外だが安全側で無視）
		current = diff === 1 ? current + 1 : 1;
		longest = Math.max(longest, current);
	}

	return longest;
}
