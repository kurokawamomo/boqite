import type { Question } from '$lib/content/types';
import { baikyakuGenerator } from './baikyaku';
import { kakeGenerator } from './kake';
import { accruedGenerator, prepaidGenerator } from './keika';
import { rishiGenerator } from './rishi';
import { sagakuGenerator } from './sagaku';
import { seisanGenerator } from './seisan';
import { shohinGenerator } from './shohin';
import { shohizeiGenerator } from './shohizei';
import { teigakuGenerator } from './teigaku';
import { teiritsuGenerator } from './teiritsu';
import type { AnyGenerator } from './types';

export type { AnyGenerator, Generator } from './types';

export const GENERATORS: readonly AnyGenerator[] = [
	kakeGenerator,
	shohinGenerator,
	teigakuGenerator,
	teiritsuGenerator,
	baikyakuGenerator,
	rishiGenerator,
	sagakuGenerator,
	prepaidGenerator,
	accruedGenerator,
	shohizeiGenerator,
	seisanGenerator
];

/** 生成器が作る問題の ID */
export function generatedQuestionId(generatorId: string, seed: number): string {
	return `${generatorId}-s${seed}`;
}

/** 生成器が content に書き出す問題（seeds の順） */
export function questionsOf(g: AnyGenerator): Question[] {
	return g.seeds.map((seed) => ({
		id: generatedQuestionId(g.id, seed),
		source: 'generated',
		sanitized: true,
		...g.render(g.sample(seed)),
		generated: { generator: g.id, seed }
	}));
}
