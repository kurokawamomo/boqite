import { createSeededRng, type Rng } from './prng';
import type { ReviewAttemptRecord, SelectReviewQuestionsOptions } from './types';

/** 弱点優先 : 既習ランダム の既定比率（弱点側の割合）。目安 7:3 */
export const DEFAULT_WEAK_RATIO = 0.7;

type QuestionStats = {
	/** 誤答率（初回回答重視。初回回答が無い場合のみ全履歴で代替する） */
	errorRate: number;
};

/**
 * 弱点重みブレンドで復習問題を選ぶ純関数（仕様書 決定#6）。
 *
 * - 誤答率が高い問題ほど優先的に選ばれる「弱点重み付け」と、既習問題からの一様ランダム選出を
 *   weakRatio の比率でブレンドする。
 * - attempts に一度も登場しない問題（未出題）は復習対象外。learnedPool との積のみが候補になる。
 * - count が候補数より多い場合は重複選出を許容するが、同一問題の連続選出は
 *   （数学的に可能な限り）避けるよう最終列を再配置する。
 */
export function selectReviewQuestions(
	attempts: ReviewAttemptRecord[],
	learnedPool: string[],
	options: SelectReviewQuestionsOptions
): string[] {
	const { count } = options;
	if (count <= 0) return [];

	const weakRatio = clamp01(options.weakRatio ?? DEFAULT_WEAK_RATIO);
	const rng = createSeededRng(options.seed ?? Date.now());

	const stats = buildQuestionStats(attempts);
	const learnedSet = new Set(learnedPool);
	// 履歴ゼロ問題（未出題）は復習対象外
	const eligible = [...stats.keys()].filter((id) => learnedSet.has(id));
	if (eligible.length === 0) return [];

	const weakCandidates = eligible
		.map((id) => ({ id, weight: stats.get(id)!.errorRate }))
		.filter((c) => c.weight > 0);

	const weakCount = Math.min(count, Math.round(count * weakRatio));

	// 候補数の範囲内では同一問題を選び直さない（候補数を使い切ったら重複選出にフォールバック）
	const used = new Set<string>();
	const picked: string[] = [];
	if (weakCandidates.length > 0) {
		for (let i = 0; i < weakCount; i++) {
			const id = weightedPick(weakCandidates, rng, used);
			picked.push(id);
			used.add(id);
		}
	}

	const remaining = count - picked.length;
	for (let i = 0; i < remaining; i++) {
		const id = uniformPick(eligible, rng, used);
		picked.push(id);
		used.add(id);
	}

	return rearrangeNoAdjacentDuplicates(picked, rng);
}

function buildQuestionStats(attempts: ReviewAttemptRecord[]): Map<string, QuestionStats> {
	const byQuestion = new Map<string, ReviewAttemptRecord[]>();
	for (const a of attempts) {
		const list = byQuestion.get(a.questionId) ?? [];
		list.push(a);
		byQuestion.set(a.questionId, list);
	}

	const stats = new Map<string, QuestionStats>();
	for (const [id, records] of byQuestion) {
		const firstTryRecords = records.filter((r) => r.firstTry);
		const base = firstTryRecords.length > 0 ? firstTryRecords : records;
		const incorrect = base.filter((r) => !r.correct).length;
		stats.set(id, { errorRate: incorrect / base.length });
	}
	return stats;
}

function weightedPick(candidates: { id: string; weight: number }[], rng: Rng, exclude: Set<string>): string {
	const pool = candidates.filter((c) => !exclude.has(c.id));
	const usable = pool.length > 0 ? pool : candidates;
	const total = usable.reduce((sum, c) => sum + c.weight, 0);
	let r = rng() * total;
	for (const c of usable) {
		r -= c.weight;
		if (r <= 0) return c.id;
	}
	return usable[usable.length - 1].id;
}

function uniformPick(items: string[], rng: Rng, exclude: Set<string>): string {
	const pool = items.filter((id) => !exclude.has(id));
	const usable = pool.length > 0 ? pool : items;
	return usable[Math.floor(rng() * usable.length)];
}

/**
 * 選出済み多重集合を、可能な限り同一要素が隣接しないよう並び替える。
 * 各ステップで「直前と異なり、残数最大」の要素を選ぶ貪欲法（同数はseed駆動でタイブレーク）。
 * 最大出現数が全体の過半数を超える場合は数学的に隣接回避不可能なため、その分のみ許容する。
 */
function rearrangeNoAdjacentDuplicates(ids: string[], rng: Rng): string[] {
	const counts = new Map<string, number>();
	for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);

	const result: string[] = [];
	let last: string | null = null;

	for (let i = 0; i < ids.length; i++) {
		const remaining = [...counts.entries()].filter(([, c]) => c > 0);
		const differentFromLast = remaining.filter(([id]) => id !== last);
		const pool = differentFromLast.length > 0 ? differentFromLast : remaining;

		const maxCount = Math.max(...pool.map(([, c]) => c));
		const tied = pool.filter(([, c]) => c === maxCount);
		const [id] = tied[Math.floor(rng() * tied.length)];

		result.push(id);
		counts.set(id, counts.get(id)! - 1);
		last = id;
	}

	return result;
}

function clamp01(v: number): number {
	return Math.min(1, Math.max(0, v));
}
