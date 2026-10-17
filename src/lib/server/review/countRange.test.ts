import { describe, expect, it } from 'vitest';
import { createSeededRng } from '../../review';
import { MAX_REVIEW_QUESTION_COUNT, MIN_REVIEW_QUESTION_COUNT, pickReviewQuestionCount } from './countRange';

describe('pickReviewQuestionCount', () => {
	it('5〜7の範囲に収まる', () => {
		const rng = createSeededRng(1);
		for (let i = 0; i < 200; i++) {
			const c = pickReviewQuestionCount(rng);
			expect(c).toBeGreaterThanOrEqual(MIN_REVIEW_QUESTION_COUNT);
			expect(c).toBeLessThanOrEqual(MAX_REVIEW_QUESTION_COUNT);
		}
	});

	it('同じseedなら同じ数列を返す', () => {
		const a = pickReviewQuestionCount(createSeededRng(7));
		const b = pickReviewQuestionCount(createSeededRng(7));
		expect(a).toBe(b);
	});
});
