import { eq } from 'drizzle-orm';
import { db, schema } from '$lib/server/db';
import { deriveStreakState } from '$lib/streak/deriveStreakState';
import {
	applyBonusFreezeMilestone,
	applyFreezeRefill,
	consumeFreezes,
	totalFreezeCap,
	totalFreezeCount,
	type FreezeBalance
} from '$lib/streak/freezeMilestones';
import type { StreakLogEntry } from '$lib/streak/types';
import { computeClearOutcome } from './computeClearOutcome';

/** 新規ユーザー行の初期フリーズ所持数（Boqite.md 既定事項） */
const INITIAL_FREEZE_COUNT = 2;

function balanceOf(userState: { freezeCount: number; freezeBonusCount: number; freezeBonusUnlocked: boolean }): FreezeBalance {
	return {
		normal: userState.freezeCount,
		bonus: userState.freezeBonusCount,
		bonusUnlocked: userState.freezeBonusUnlocked
	};
}

async function ensureUserState() {
	const existing = await db.query.userState.findFirst({ where: (u, { eq }) => eq(u.id, 1) });
	if (existing) return existing;

	const [created] = await db
		.insert(schema.userState)
		.values({ id: 1, streakCount: 0, freezeCount: INITIAL_FREEZE_COUNT })
		.onConflictDoNothing()
		.returning();

	return created ?? (await db.query.userState.findFirst({ where: (u, { eq }) => eq(u.id, 1) }))!;
}

async function getAllLogs(): Promise<StreakLogEntry[]> {
	const rows = await db.query.streakLogs.findMany();
	return rows.map((r) => ({ date: r.date, status: r.status }));
}

export type StreakSummary = {
	streakCount: number;
	freezeCount: number;
	/** 現在の所持上限（ボーナス未解禁=2 / 解禁済み=5） */
	freezeCap: number;
	clearedToday: boolean;
	/** この呼び出しで今日のストリークが加算された（その日の初クリア） */
	streakAdvanced: boolean;
	/** この呼び出しで通常枠のフリーズが補充された */
	freezeRefilled: boolean;
};

/** GET /api/streak 用: today 時点のストリーク状態を返す（DB は書き換えない） */
export async function getStreakSummary(today: string): Promise<StreakSummary> {
	const userState = await ensureUserState();
	const logs = await getAllLogs();
	const balance = balanceOf(userState);
	const state = deriveStreakState(logs, totalFreezeCount(balance), today);
	const clearedToday = logs.some((l) => l.date === today && l.status === 'cleared');

	return {
		streakCount: state.streakCount,
		freezeCount: state.freezesRemaining,
		freezeCap: totalFreezeCap(balance),
		clearedToday,
		streakAdvanced: false,
		freezeRefilled: false
	};
}

/**
 * POST /api/streak/clear 用: clearDate をクリア済みとして記録する。
 * 同日 2 回目の呼び出しは冪等（加算しない）。
 */
export async function recordClear(clearDate: string): Promise<StreakSummary> {
	const userState = await ensureUserState();
	const logs = await getAllLogs();
	const balance = balanceOf(userState);

	const outcome = computeClearOutcome(logs, totalFreezeCount(balance), clearDate);

	if (outcome.alreadyCleared) {
		return {
			streakCount: userState.streakCount,
			freezeCount: totalFreezeCount(balance),
			freezeCap: totalFreezeCap(balance),
			clearedToday: true,
			streakAdvanced: false,
			freezeRefilled: false
		};
	}

	if (outcome.frozenDates.length > 0) {
		await db
			.insert(schema.streakLogs)
			.values(outcome.frozenDates.map((date) => ({ date, status: 'frozen' as const })))
			.onConflictDoNothing();
	}

	await db
		.insert(schema.streakLogs)
		.values({ date: clearDate, status: 'cleared' })
		.onConflictDoNothing();

	// 欠落日消費（通常枠優先）→ 100日ボーナス → 通常枠の確率補充の順に反映する
	const afterConsume = consumeFreezes(balance, outcome.freezesConsumed);
	const afterBonus = applyBonusFreezeMilestone(
		outcome.streakBeforeClear,
		outcome.newStreakCount,
		afterConsume
	);
	const { balance: finalBalance, clearsSinceRefill, refilled } = applyFreezeRefill(
		userState.clearsSinceRefill,
		clearDate,
		afterBonus
	);

	await db
		.update(schema.userState)
		.set({
			streakCount: outcome.newStreakCount,
			freezeCount: finalBalance.normal,
			freezeBonusCount: finalBalance.bonus,
			freezeBonusUnlocked: finalBalance.bonusUnlocked,
			clearsSinceRefill,
			updatedAt: new Date()
		})
		.where(eq(schema.userState.id, 1));

	return {
		streakCount: outcome.newStreakCount,
		freezeCount: totalFreezeCount(finalBalance),
		freezeCap: totalFreezeCap(finalBalance),
		clearedToday: true,
		streakAdvanced: true,
		freezeRefilled: refilled
	};
}
