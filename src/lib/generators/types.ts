import type { Question } from '$lib/content/types';

/** 生成器が作る問題の中身。ID・出どころは gen:content が付ける */
export type GeneratedBody = Omit<Question, 'id' | 'source' | 'sanitized' | 'generated'>;

/**
 * 問題生成器。論点 1 つ（ノード 1 つ）に対し、数値と場面を変えた問題を seed から決定的に作る。
 *
 * 実行時に乱数は使わない。`pnpm run gen:content` が `seeds` から問題を作って content に書き出し、
 * アプリは書き出された JSON だけを読む。
 *
 * P = sample が作る場面と数値（params）、A = solve が出す答え。
 */
export type Generator<P, A> = {
	/** 一意な ID。問題 ID は `<id>-s<seed>` になる */
	id: string;
	/** 出題先のノード */
	nodeId: string;
	/** 主題の論点。ノードの meta.topic と一致させる（不足監査の突き合わせ単位） */
	topic: string;
	/** content に書き出す seed。増やすと問題が増える */
	seeds: readonly number[];
	sample(seed: number): P;
	solve(params: P): A;
	render(params: P): GeneratedBody;
	/** render が作った問題の正解が solve の答えと一致するか */
	verify(question: GeneratedBody, answer: A): boolean;
};

/** 型パラメータを消した生成器。レジストリで配列に並べる用 */
export type AnyGenerator = Generator<unknown, unknown>;

export function defineGenerator<P, A>(g: Generator<P, A>): AnyGenerator {
	return g as unknown as AnyGenerator;
}
