import { describe, expect, it } from 'vitest';
import { selectReviewQuestions } from './selectReviewQuestions';
import { createSeededRng } from './prng';
import type { ReviewAttemptRecord } from './types';

function attempt(questionId: string, correct: boolean, firstTry = true): ReviewAttemptRecord {
	return { questionId, correct, firstTry, answeredAt: '2026-08-01T00:00:00.000Z' };
}

describe('selectReviewQuestions', () => {
	it('count が 0 なら空配列を返す', () => {
		expect(selectReviewQuestions([], [], { count: 0 })).toEqual([]);
	});

	it('未出題（attempts に無い）問題は既習プールにあっても除外される', () => {
		const attempts = [attempt('q1', true)];
		const result = selectReviewQuestions(attempts, ['q1', 'q2'], { count: 5, seed: 1 });
		expect(result.every((id) => id === 'q1')).toBe(true);
		expect(result).not.toContain('q2');
	});

	it('既習プールに無い問題は attempts があっても除外される', () => {
		const attempts = [attempt('q1', false), attempt('q2', true)];
		const result = selectReviewQuestions(attempts, ['q1'], { count: 5, seed: 1 });
		expect(result.every((id) => id === 'q1')).toBe(true);
	});

	it('候補が無ければ空配列を返す', () => {
		const attempts = [attempt('q1', true)];
		expect(selectReviewQuestions(attempts, ['q2'], { count: 3, seed: 1 })).toEqual([]);
	});

	it('要求した件数だけ返す（候補が少ない場合は重複を許容して埋める）', () => {
		const attempts = [attempt('q1', false), attempt('q2', true)];
		const result = selectReviewQuestions(attempts, ['q1', 'q2'], { count: 8, seed: 42 });
		expect(result).toHaveLength(8);
		expect(result.every((id) => id === 'q1' || id === 'q2')).toBe(true);
	});

	it('同じ seed・同じ入力なら常に同じ結果を返す（決定性）', () => {
		const attempts = [
			attempt('q1', false),
			attempt('q2', true),
			attempt('q3', false),
			attempt('q4', true)
		];
		const pool = ['q1', 'q2', 'q3', 'q4'];
		const a = selectReviewQuestions(attempts, pool, { count: 10, seed: 12345 });
		const b = selectReviewQuestions(attempts, pool, { count: 10, seed: 12345 });
		expect(a).toEqual(b);
	});

	it('seed が異なれば結果が変わりうる', () => {
		const attempts = [attempt('q1', true), attempt('q2', true), attempt('q3', false)];
		const pool = ['q1', 'q2', 'q3'];
		const a = selectReviewQuestions(attempts, pool, { count: 20, seed: 1 });
		const b = selectReviewQuestions(attempts, pool, { count: 20, seed: 2 });
		expect(a).not.toEqual(b);
	});

	it('誤答率が高い問題ほど高頻度で選ばれる（弱点重み付け）', () => {
		// q1: 常に誤答（重み最大） / q2: 常に正答（弱点重み0、既習ランダム経由でのみ出現）
		const attempts = [attempt('q1', false), attempt('q2', true)];
		const pool = ['q1', 'q2'];

		const counts: Record<string, number> = { q1: 0, q2: 0 };
		for (let seed = 0; seed < 200; seed++) {
			const result = selectReviewQuestions(attempts, pool, { count: 10, seed });
			for (const id of result) counts[id]++;
		}

		expect(counts.q1).toBeGreaterThan(counts.q2 * 2);
	});

	it('weakRatio を大きくするほど弱点問題の出現比率が上がる', () => {
		const attempts = [attempt('q1', false), attempt('q2', true)];
		const pool = ['q1', 'q2'];

		function weakShare(weakRatio: number) {
			let weak = 0;
			let total = 0;
			for (let seed = 0; seed < 200; seed++) {
				const result = selectReviewQuestions(attempts, pool, { count: 10, seed, weakRatio });
				weak += result.filter((id) => id === 'q1').length;
				total += result.length;
			}
			return weak / total;
		}

		expect(weakShare(0.9)).toBeGreaterThan(weakShare(0.1));
	});

	it('初回回答を重視する（firstTry=false の再挑戦結果はerrorRateに影響しにくい）', () => {
		// q1: 初回は正解、再挑戦(firstTry=false)で誤答 → 初回回答重視なら誤答率は低いまま
		const attempts = [attempt('q1', true, true), attempt('q1', false, false)];
		// q2: 初回誤答のみ → 誤答率1
		const attemptsQ2 = [attempt('q2', false, true)];
		const combined = [...attempts, ...attemptsQ2];
		const pool = ['q1', 'q2'];

		const counts: Record<string, number> = { q1: 0, q2: 0 };
		for (let seed = 0; seed < 200; seed++) {
			const result = selectReviewQuestions(combined, pool, { count: 10, seed });
			for (const id of result) counts[id]++;
		}

		expect(counts.q2).toBeGreaterThan(counts.q1);
	});

	it('隣接しない配置になるよう再配置する（可能な場合）', () => {
		const attempts = [attempt('q1', false), attempt('q2', false), attempt('q3', false)];
		const pool = ['q1', 'q2', 'q3'];
		const result = selectReviewQuestions(attempts, pool, { count: 9, seed: 7 });

		let adjacentDuplicates = 0;
		for (let i = 1; i < result.length; i++) {
			if (result[i] === result[i - 1]) adjacentDuplicates++;
		}
		expect(adjacentDuplicates).toBe(0);
	});

	it('候補が1件しかない場合は隣接回避が不可能でもエラーにならない', () => {
		const attempts = [attempt('q1', false)];
		const result = selectReviewQuestions(attempts, ['q1'], { count: 4, seed: 1 });
		expect(result).toEqual(['q1', 'q1', 'q1', 'q1']);
	});
});

describe('createSeededRng', () => {
	it('同じ seed なら同じ数列を返す', () => {
		const a = createSeededRng(999);
		const b = createSeededRng(999);
		const seqA = Array.from({ length: 5 }, () => a());
		const seqB = Array.from({ length: 5 }, () => b());
		expect(seqA).toEqual(seqB);
	});

	it('0以上1未満の値を返す', () => {
		const rng = createSeededRng(1);
		for (let i = 0; i < 100; i++) {
			const v = rng();
			expect(v).toBeGreaterThanOrEqual(0);
			expect(v).toBeLessThan(1);
		}
	});
});
