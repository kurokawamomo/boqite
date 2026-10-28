import { describe, expect, it } from 'vitest';
import {
	applyBonusFreezeMilestone,
	applyFreezeRefill,
	refillProbability,
	consumeFreezes,
	totalFreezeCap,
	totalFreezeCount,
	type FreezeBalance
} from './freezeMilestones';

const initial: FreezeBalance = { normal: 0, bonus: 0, bonusUnlocked: false };

describe('applyBonusFreezeMilestone', () => {
	it('100日到達でボーナス枠解禁・上限5相当（bonus=3）が付与される', () => {
		const result = applyBonusFreezeMilestone(99, 100, { normal: 2, bonus: 0, bonusUnlocked: false });
		expect(result).toEqual({ normal: 2, bonus: 3, bonusUnlocked: true });
		expect(totalFreezeCap(result)).toBe(5);
		expect(totalFreezeCount(result)).toBe(5);
	});

	it('100日到達でも通常枠は増えない（10日節目の付与は廃止）', () => {
		const result = applyBonusFreezeMilestone(99, 100, { normal: 1, bonus: 0, bonusUnlocked: false });
		expect(result.normal).toBe(1);
	});

	it('10日・20日の節目では何も起きない', () => {
		expect(applyBonusFreezeMilestone(9, 10, initial)).toEqual(initial);
		expect(applyBonusFreezeMilestone(19, 20, initial)).toEqual(initial);
	});

	it('200日到達（2回目の100日節目）でボーナス枠が3未満なら3までリフィルされる', () => {
		const result = applyBonusFreezeMilestone(199, 200, { normal: 2, bonus: 1, bonusUnlocked: true });
		expect(result).toEqual({ normal: 2, bonus: 3, bonusUnlocked: true });
	});

	it('一度解禁されたら bonusUnlocked は維持される（枠を使い切っていても）', () => {
		const result = applyBonusFreezeMilestone(150, 151, { normal: 0, bonus: 0, bonusUnlocked: true });
		expect(result.bonusUnlocked).toBe(true);
		expect(totalFreezeCap(result)).toBe(5);
	});
});

describe('refillProbability', () => {
	it('n<10 は0', () => {
		for (let n = 0; n < 10; n++) expect(refillProbability(n)).toBe(0);
	});

	it('n=10..16 は仕様の確率表どおり', () => {
		expect([10, 11, 12, 13, 14, 15, 16].map(refillProbability)).toEqual([
			0.05, 0.1, 0.15, 0.25, 0.35, 0.5, 0.7
		]);
	});

	it('n>=17 は必ず1', () => {
		expect(refillProbability(17)).toBe(1);
		expect(refillProbability(100)).toBe(1);
	});
});

function dateOf(index: number): string {
	return new Date(Date.UTC(2026, 0, 1 + index)).toISOString().slice(0, 10);
}

/** 補充が起きるまでの日数を返す（上限に当たらない残高で開始） */
function daysUntilRefill(startIndex: number): number {
	let n = 0;
	let balance = initial;
	for (let day = 0; day < 40; day++) {
		const result = applyFreezeRefill(n, dateOf(startIndex + day), balance);
		if (result.clearsSinceRefill === 0) return day + 1;
		n = result.clearsSinceRefill;
		balance = result.balance;
	}
	throw new Error('40日以内に補充されなかった');
}

describe('applyFreezeRefill', () => {
	it('n<10 では何日付でも絶対に付与されない', () => {
		for (let i = 0; i < 2000; i++) {
			for (const before of [0, 5, 8]) {
				const result = applyFreezeRefill(before, dateOf(i), initial);
				expect(result.balance).toEqual(initial);
				expect(result.clearsSinceRefill).toBe(before + 1);
			}
		}
	});

	it('n>=17 では必ず付与され、n が0に戻る', () => {
		for (let i = 0; i < 2000; i++) {
			const result = applyFreezeRefill(16, dateOf(i), { normal: 1, bonus: 0, bonusUnlocked: false });
			expect(result.balance.normal).toBe(2);
			expect(result.clearsSinceRefill).toBe(0);
		}
	});

	it('refilled は付与された判定だけ true（n<10・上限は false）', () => {
		expect(applyFreezeRefill(5, '2026-04-01', initial).refilled).toBe(false);
		expect(applyFreezeRefill(16, '2026-04-01', initial).refilled).toBe(true);
		const full: FreezeBalance = { normal: 2, bonus: 0, bonusUnlocked: false };
		expect(applyFreezeRefill(16, '2026-04-01', full).refilled).toBe(false);
	});

	it('同じ日付・同じ入力なら何度判定しても結果が同じ', () => {
		for (let i = 0; i < 200; i++) {
			const first = applyFreezeRefill(11, dateOf(i), initial);
			const second = applyFreezeRefill(11, dateOf(i), initial);
			expect(second).toEqual(first);
		}
	});

	it('シード固定: 日付から付与日が決まる（2026-01-01 起点は固定の日数で補充）', () => {
		const first = daysUntilRefill(0);
		expect(daysUntilRefill(0)).toBe(first);
		expect(first).toBeGreaterThanOrEqual(10);
		expect(first).toBeLessThanOrEqual(17);
	});

	it('通常枠が上限2なら付与されず、n はリセットされず増え続ける', () => {
		const full: FreezeBalance = { normal: 2, bonus: 0, bonusUnlocked: false };
		const result = applyFreezeRefill(16, '2026-03-01', full);
		expect(result.balance).toEqual(full);
		expect(result.clearsSinceRefill).toBe(17);
	});

	it('上限で溜まった後、枠が空けば次のクリア日に必ず付与される', () => {
		const result = applyFreezeRefill(30, '2026-03-02', { normal: 1, bonus: 0, bonusUnlocked: false });
		expect(result.balance.normal).toBe(2);
		expect(result.clearsSinceRefill).toBe(0);
	});

	it('ボーナス枠・解禁状態は補充で変わらない', () => {
		const result = applyFreezeRefill(16, '2026-03-03', { normal: 0, bonus: 2, bonusUnlocked: true });
		expect(result.balance).toEqual({ normal: 1, bonus: 2, bonusUnlocked: true });
	});

	// 確率表の理論平均は約13.66日
	it('1万回シミュレーションで平均補充間隔が理論値（約13.66日）に収まる', () => {
		let total = 0;
		const runs = 10000;
		for (let i = 0; i < runs; i++) total += daysUntilRefill(i * 3);
		const mean = total / runs;
		expect(mean).toBeGreaterThanOrEqual(13.2);
		expect(mean).toBeLessThanOrEqual(14.2);
	});
});

describe('consumeFreezes', () => {
	it('通常枠から優先的に消費する', () => {
		const result = consumeFreezes({ normal: 2, bonus: 3, bonusUnlocked: true }, 1);
		expect(result).toEqual({ normal: 1, bonus: 3, bonusUnlocked: true });
	});

	it('通常枠を使い切ったらボーナス枠から消費する', () => {
		const result = consumeFreezes({ normal: 2, bonus: 3, bonusUnlocked: true }, 3);
		expect(result).toEqual({ normal: 0, bonus: 2, bonusUnlocked: true });
	});

	it('所持数を超える消費要求は0でクランプされる', () => {
		const result = consumeFreezes({ normal: 1, bonus: 1, bonusUnlocked: true }, 5);
		expect(result).toEqual({ normal: 0, bonus: 0, bonusUnlocked: true });
	});

	it('消費0要求は変化なし', () => {
		const balance: FreezeBalance = { normal: 1, bonus: 2, bonusUnlocked: true };
		expect(consumeFreezes(balance, 0)).toEqual(balance);
	});
});

describe('消費と付与の相互作用（同一クリアで両方起こりうる）', () => {
	it('欠落日消費で通常枠が空いた直後なら、n>=17 の補充は上限に阻まれず付与される', () => {
		const afterConsume = consumeFreezes({ normal: 2, bonus: 0, bonusUnlocked: false }, 1);
		const result = applyFreezeRefill(16, '2026-05-01', afterConsume);
		expect(result.balance).toEqual({ normal: 2, bonus: 0, bonusUnlocked: false });
		expect(result.clearsSinceRefill).toBe(0);
	});

	it('ボーナス解禁済み状態で欠落日消費后も100日リフィルは残数依存で正しく働く', () => {
		const afterConsume = consumeFreezes({ normal: 0, bonus: 3, bonusUnlocked: true }, 2);
		expect(afterConsume.bonus).toBe(1);
		const afterMilestone = applyBonusFreezeMilestone(199, 200, afterConsume);
		expect(afterMilestone.bonus).toBe(3);
	});
});
