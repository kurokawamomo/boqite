import { describe, expect, it } from 'vitest';
import { assertSolvable, assertStimulusDocument } from './assertSolvable';
import type { Question } from './types';

/** 全問を正解入力で解き切れることの保証（実コンテンツ） */

type UnitFile = { nodes: Array<{ id: string; questions: Question[] }> };

const unitModules = import.meta.glob<{ default: UnitFile }>('/content/boki3/*.json', { eager: true });

const questions: Question[] = Object.keys(unitModules)
	.sort()
	.flatMap((file) => unitModules[file].default.nodes)
	.flatMap((node) => node.questions);

const withDocument = questions.filter((q) => q.stimulus.document);

// 図つきの問題がまだ無い間は、検査対象が空になる
if (withDocument.length > 0) {
	describe('問題文の図（stimulus.document）', () => {
		for (const q of withDocument) {
			it(`${q.id}: 画面に図が描かれ、form_fill なら正解が書き込まれていない`, () => assertStimulusDocument(q));
		}
	});
}

describe('全問を正解入力で解き切れる', () => {
	it('問題が読み込めている', () => {
		expect(questions.length).toBeGreaterThan(0);
	});

	for (const q of questions) {
		it(`${q.id}: 正解どおりに入力して解き切れる`, () => assertSolvable(q));
	}
});
