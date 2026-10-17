import { db } from '$lib/server/db';
import { deriveStreakState } from '$lib/streak/deriveStreakState';
import { todayInJst } from '$lib/streak/date';
import { totalFreezeCap, totalFreezeCount, type FreezeBalance } from '$lib/streak/freezeMilestones';
import type { StreakLogEntry } from '$lib/streak/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// 読取専用。書き込み・スキーマ変更は src/lib/server/streak/ の担当範囲のため行わない。
	const [userState, logRows] = await Promise.all([
		db.query.userState.findFirst({ where: (u, { eq }) => eq(u.id, 1) }),
		db.query.streakLogs.findMany()
	]);

	const logs: StreakLogEntry[] = logRows.map((r) => ({ date: r.date, status: r.status }));
	// クライアント（ブラウザ）が自身のローカル日付を送る設計に統一。ここはSSR初回描画時の
	// 既定値のみで、日本ユーザー向けアプリのため JST 基準にする（UTC 固定だと朝 0-9 時が前日扱いになる）。
	const today = todayInJst();

	const balance: FreezeBalance = {
		normal: userState?.freezeCount ?? 0,
		bonus: userState?.freezeBonusCount ?? 0,
		bonusUnlocked: userState?.freezeBonusUnlocked ?? false
	};

	const state = deriveStreakState(logs, totalFreezeCount(balance), today);

	return {
		logs,
		today,
		currentStreak: state.streakCount,
		freezeCount: state.freezesRemaining,
		freezeCap: totalFreezeCap(balance)
	};
};
