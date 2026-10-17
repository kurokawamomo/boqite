import { createSeededRng } from '$lib/review/prng';

/**
 * フリーズ配布ルール（購入・通貨・確率チェストなし）。
 *
 * - 通常枠: 上限2。前回補充から実際にクリアした日（フリーズ日は数えない）が10日以上になった日から、
 *   クリア時に確率で+1（applyFreezeRefill）。乱数はクリア日付がシードなので同じ日は何度判定しても同じ結果
 * - ボーナス枠: 上限3。ストリークが100日に初到達すると解禁され、3個満タンで付与される。
 *   以後 100 日ごと（200, 300 ...）に、残数が3未満なら3まで自動リフィルされる
 * - ボーナス枠が一度解禁されると、以後は所持上限が2→5に拡張される（枠を使い切っても解禁状態は続く）
 */

export const NORMAL_FREEZE_CAP = 2;
export const BONUS_FREEZE_CAP = 3;

/** 補充判定が始まる、前回補充からのクリア日数 */
export const REFILL_MIN_CLEARS = 10;

/** n = 前回補充からのクリア日数（当日含む）に対する補充確率。17以上は必ず補充 */
const REFILL_PROBABILITY: Record<number, number> = {
	10: 0.05,
	11: 0.1,
	12: 0.15,
	13: 0.25,
	14: 0.35,
	15: 0.5,
	16: 0.7
};

export function refillProbability(clearsSinceRefill: number): number {
	if (clearsSinceRefill < REFILL_MIN_CLEARS) return 0;
	return REFILL_PROBABILITY[clearsSinceRefill] ?? 1;
}

export type FreezeBalance = {
	/** 通常枠の残数 (0-2) */
	normal: number;
	/** ボーナス枠の残数 (0-3, 解禁前は常に0) */
	bonus: number;
	/** 100日到達済み（ボーナス枠が解禁されている）か */
	bonusUnlocked: boolean;
};

/** 現在の所持合計（表示・消費計算用） */
export function totalFreezeCount(balance: FreezeBalance): number {
	return balance.normal + balance.bonus;
}

/** 現在の所持上限（ボーナス解禁前は2、解禁後は5） */
export function totalFreezeCap(balance: FreezeBalance): number {
	return balance.bonusUnlocked ? NORMAL_FREEZE_CAP + BONUS_FREEZE_CAP : NORMAL_FREEZE_CAP;
}

/** streak が unit の倍数の節目を何回跨いだか（例: 9→22 なら 10, 20 の2回） */
function crossedMultiplesOf(unit: number, before: number, after: number): number {
	return Math.floor(after / unit) - Math.floor(before / unit);
}

/** YYYY-MM-DD を FNV-1a で 32bit シードにする */
function seedFromDate(date: string): number {
	let hash = 0x811c9dc5;
	for (let i = 0; i < date.length; i++) {
		hash ^= date.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193);
	}
	return hash >>> 0;
}

export type FreezeRefillResult = {
	balance: FreezeBalance;
	/** 前回補充からのクリア日数（当日含む）。補充できたら0 */
	clearsSinceRefill: number;
	/** この判定で通常枠が+1されたか */
	refilled: boolean;
};

/**
 * クリア日 clearDate のクリアを1日数え、通常枠の補充を判定する。
 * 補充できたら n を0に戻す。通常枠が上限で付与できない日は n を戻さない。
 */
export function applyFreezeRefill(
	clearsSinceRefill: number,
	clearDate: string,
	balance: FreezeBalance
): FreezeRefillResult {
	const n = clearsSinceRefill + 1;
	const hit = createSeededRng(seedFromDate(clearDate))() < refillProbability(n);

	if (!hit || balance.normal >= NORMAL_FREEZE_CAP) {
		return { balance, clearsSinceRefill: n, refilled: false };
	}
	return { balance: { ...balance, normal: balance.normal + 1 }, clearsSinceRefill: 0, refilled: true };
}

/**
 * クリア後のストリーク数 (beforeStreak → afterStreak) が100日の節目を跨いだら、
 * ボーナス枠の解禁・3個までのリフィルを反映した新しい残高を返す。
 */
export function applyBonusFreezeMilestone(
	beforeStreak: number,
	afterStreak: number,
	balance: FreezeBalance
): FreezeBalance {
	const crossed100 = crossedMultiplesOf(100, beforeStreak, afterStreak);
	if (crossed100 <= 0) return balance;

	return { normal: balance.normal, bonus: BONUS_FREEZE_CAP, bonusUnlocked: true };
}

/**
 * 欠落日の自動消費で count 個のフリーズを差し引く。通常枠から優先的に消費し、
 * 足りない分をボーナス枠から消費する。所持数を超える消費は 0 でクランプする。
 */
export function consumeFreezes(balance: FreezeBalance, count: number): FreezeBalance {
	const fromNormal = Math.min(balance.normal, count);
	const remaining = count - fromNormal;
	const fromBonus = Math.min(balance.bonus, remaining);

	return {
		normal: balance.normal - fromNormal,
		bonus: balance.bonus - fromBonus,
		bonusUnlocked: balance.bonusUnlocked
	};
}
