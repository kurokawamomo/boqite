import { selectReviewQuestions, type ReviewAttemptRecord } from '$lib/review';

const EPOCH = new Date(0).toISOString();

/**
 * 既習プールに対する attempts 履歴が無い（履歴ゼロ）場合のフォールバック。
 *
 * 全問題を「正解済み」とみなす合成履歴を渡し、selectReviewQuestions の
 * 弱点重みがすべて 0 になる状態（＝既習ランダム側のみで埋まる状態）に委ねる。
 * こうすることで、隣接重複回避や件数充足などの選出ロジックを再実装せず再利用できる。
 */
export function uniformPoolFallback(learnedPool: string[], count: number, seed: number): string[] {
	const syntheticAttempts: ReviewAttemptRecord[] = learnedPool.map((questionId) => ({
		questionId,
		correct: true,
		firstTry: true,
		answeredAt: EPOCH
	}));
	return selectReviewQuestions(syntheticAttempts, learnedPool, { count, seed });
}
