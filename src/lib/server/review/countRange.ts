import type { Rng } from '$lib/review';

/** 復習レッスンの出題数レンジ（仕様書の「復習ノード5-7問」目安） */
export const MIN_REVIEW_QUESTION_COUNT = 5;
export const MAX_REVIEW_QUESTION_COUNT = 7;

export function pickReviewQuestionCount(rng: Rng): number {
	const span = MAX_REVIEW_QUESTION_COUNT - MIN_REVIEW_QUESTION_COUNT + 1;
	return MIN_REVIEW_QUESTION_COUNT + Math.floor(rng() * span);
}
