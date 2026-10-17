import { db, schema } from '$lib/server/db';
import { createSeededRng, selectReviewQuestions, type ReviewAttemptRecord } from '$lib/review';
import { pickReviewQuestionCount } from './countRange';
import { uniformPoolFallback } from './fallback';

export type SelectReviewNodeOptions = {
	/** テスト・再現性用。省略時は呼び出し時刻から生成する */
	seed?: number;
};

/**
 * 復習ノード（章の復習・ミックス復習）の出題を、既習プールと attempts 履歴から動的に抽選する。
 *
 * - 出題数は 5〜7 問の範囲でシード駆動に決める。
 * - 通常は attempts 履歴に基づく弱点重みブレンド（$lib/review）で抽選する。
 * - 履歴ゼロ（このプールに対応する attempts が無い）場合は、既習プールからの
 *   seedランダムにフォールバックする。
 */
export async function selectReviewNodeQuestionIds(
	learnedPool: string[],
	options: SelectReviewNodeOptions = {}
): Promise<string[]> {
	if (learnedPool.length === 0) return [];

	const seed = options.seed ?? Date.now();
	const rng = createSeededRng(seed);
	const count = pickReviewQuestionCount(rng);

	const attemptRows = await db.select().from(schema.attempts);
	const attempts: ReviewAttemptRecord[] = attemptRows.map((a) => ({
		questionId: a.questionId,
		correct: a.correct,
		firstTry: a.firstTry,
		answeredAt: a.answeredAt.toISOString()
	}));

	const selected = selectReviewQuestions(attempts, learnedPool, { count, seed });
	if (selected.length > 0) return selected;

	return uniformPoolFallback(learnedPool, count, seed);
}

/** 練習ノードの弱点寄せ比率。復習より低くして反復の網羅性を優先する */
const PRACTICE_WEAK_RATIO = 0.4;

/**
 * 練習ノードの出題を抽選する。
 *
 * 復習ノードとの違いは「候補の広さ」だけ。復習は既習（attempts に履歴のある問題）に限るが、
 * 練習は直前のレッスンを反復するものなので、まだ一度も解いていない問題も候補に入れる必要がある。
 * 履歴の無い問題には「正解済み」の合成履歴を与えて弱点重み 0 として混ぜることで、
 * 重み付け・件数充足・隣接重複回避のロジックはそのまま再利用する。
 */
export async function selectPracticeQuestionIds(
	pool: string[],
	options: SelectReviewNodeOptions = {}
): Promise<string[]> {
	if (pool.length === 0) return [];

	const seed = options.seed ?? Date.now();
	const rng = createSeededRng(seed);
	const count = pickReviewQuestionCount(rng);

	const attemptRows = await db.select().from(schema.attempts);
	const inPool = new Set(pool);
	const real: ReviewAttemptRecord[] = attemptRows
		.filter((a) => inPool.has(a.questionId))
		.map((a) => ({
			questionId: a.questionId,
			correct: a.correct,
			firstTry: a.firstTry,
			answeredAt: a.answeredAt.toISOString()
		}));

	const seen = new Set(real.map((a) => a.questionId));
	const synthetic: ReviewAttemptRecord[] = pool
		.filter((id) => !seen.has(id))
		.map((questionId) => ({
			questionId,
			correct: true,
			firstTry: true,
			answeredAt: new Date(0).toISOString()
		}));

	// 練習は直近レッスンを薄く一周させたいので、復習（既定 0.7）より弱点寄せを緩める
	return selectReviewQuestions([...real, ...synthetic], pool, {
		count,
		seed,
		weakRatio: PRACTICE_WEAK_RATIO
	});
}
