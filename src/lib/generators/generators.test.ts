import { describe, expect, it } from 'vitest';
import { checkQuestion } from '$lib/content/checks';
import { assertSolvable } from '$lib/content/assertSolvable';
import { validateUnitFile } from '$lib/server/content/validate';
import type { Question } from '$lib/content/types';
import { GENERATORS, generatedQuestionId, questionsOf } from './index';

/**
 * 生成器 1 本ごとに 100 シードを、既存の全検査（貸借一致・選択肢に正解・全欄が画面に出る・
 * 単独で読める・図に正解が入らない）に通す。
 */

const SEEDS = Array.from({ length: 100 }, (_, i) => i + 1);

type UnitFile = { nodes: Array<{ id: string; meta?: { topic: string; minQuestions: number }; questions: Question[] }> };
const unitModules = import.meta.glob<{ default: UnitFile }>('/content/boki3/*.json', { eager: true });
const accountsModule = import.meta.glob<{ default: Array<{ name: string }> }>('/content/accounts.json', {
	eager: true
});
const accountNames = new Set(Object.values(accountsModule)[0].default.map((a) => a.name));
const nodes = Object.values(unitModules).flatMap((m) => m.default.nodes);

function toQuestion(g: (typeof GENERATORS)[number], seed: number): Question {
	return {
		id: generatedQuestionId(g.id, seed),
		source: 'generated',
		sanitized: true,
		...g.render(g.sample(seed)),
		generated: { generator: g.id, seed }
	};
}

describe.each(GENERATORS.map((g) => [g.id, g] as const))('生成器 %s', (_id, g) => {
	it('同じ seed なら同じ問題になる', () => {
		for (const seed of SEEDS.slice(0, 20)) {
			expect(JSON.stringify(g.render(g.sample(seed)))).toBe(JSON.stringify(g.render(g.sample(seed))));
		}
	});

	it('100 シードで、solve の答えと render の正解が一致する', () => {
		for (const seed of SEEDS) {
			const params = g.sample(seed);
			expect(g.verify(g.render(params), g.solve(params)), `seed ${seed}`).toBe(true);
		}
	});

	it('100 シードで、既存の全検査に通る', () => {
		for (const seed of SEEDS) {
			const q = toQuestion(g, seed);
			expect(checkQuestion(q as unknown as Record<string, unknown>, accountNames), `seed ${seed}`).toEqual([]);
		}
	});

	it('100 シードで、読み込み時の検証に通る', () => {
		const unit = {
			unit: { id: 'u', course: 'c', chapter: 1, title: 't' },
			nodes: [{ id: 'n', title: 'n', questions: SEEDS.map((seed) => toQuestion(g, seed)) }]
		};
		expect(() => validateUnitFile(unit, 'generated.json')).not.toThrow();
	});

	it('100 シードで、正解どおりに入力して解き切れる', () => {
		for (const seed of SEEDS) assertSolvable(toQuestion(g, seed));
	});

	it('100 シードで、場面と数値が十分にばらける', () => {
		const texts = new Set(SEEDS.map((seed) => toQuestion(g, seed).stimulus.text));
		expect(texts.size).toBeGreaterThan(50);
	});

	it('書き出すシードの問題は互いに違う', () => {
		const texts = questionsOf(g).map((q) => q.stimulus.text);
		expect(new Set(texts).size).toBe(texts.length);
	});

	it('content に書き出された問題が最新（pnpm run gen:content 済み）', () => {
		const node = nodes.find((n) => n.id === g.nodeId);
		expect(node, `ノード ${g.nodeId}`).toBeDefined();
		expect(node?.meta?.topic).toBe(g.topic);
		// newAccounts は gen:content がコース全体の並び順で付けるので、ここでは比べない
		const strip = (qs: Question[]) => qs.map(({ newAccounts: _n, ...rest }) => rest);
		const written = (node?.questions ?? []).filter((q) => q.generated?.generator === g.id);
		expect(JSON.parse(JSON.stringify(strip(written)))).toEqual(JSON.parse(JSON.stringify(strip(questionsOf(g)))));
	});
});

describe('生成器の登録', () => {
	it('ID が重複しない', () => {
		const ids = GENERATORS.map((g) => g.id);
		expect(new Set(ids).size).toBe(ids.length);
	});
});
