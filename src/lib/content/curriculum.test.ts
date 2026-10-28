import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import LessonPage from '../../routes/lesson/[nodeId]/+page.svelte';
import { withDynamicNodes } from './dynamicNodes';
import type { ContentNode, ContentUnit, NodeType } from './course';
import { validateUnitFile } from '$lib/server/content/validate';

/** 学習設計図（日商3級 U1〜U19、日商2級 U1〜U24）に沿った content の形 */

const boki3Modules = import.meta.glob<{ default: unknown }>('/content/boki3/*.json', { eager: true });
const boki2Modules = import.meta.glob<{ default: unknown }>('/content/boki2/*.json', { eager: true });

function load(modules: Record<string, { default: unknown }>): ContentUnit[] {
	return Object.keys(modules)
		.sort()
		.map((file) => validateUnitFile(modules[file].default, file))
		.sort((a, b) => a.chapter - b.chapter);
}

const MIN_BY_TYPE: Record<NodeType, number> = { basic: 4, application: 2, ledger: 2, discriminate: 6, calculation: 4 };

const COURSES = [
	{ id: 'boki3', prefix: 'b3', units: load(boki3Modules), unitCount: 19, nodeCount: 76, mockQuestions: 3 },
	{ id: 'boki2', prefix: 'b2', units: load(boki2Modules), unitCount: 24, nodeCount: 131, mockQuestions: 5 }
];

describe.each(COURSES)('コースの骨組み $id', ({ id, prefix, units, unitCount, nodeCount, mockQuestions }) => {
	const nodes = units.flatMap((u) => u.nodes);

	it(`U1〜U${unitCount} が章番号の順に並ぶ`, () => {
		expect(units.map((u) => u.chapter)).toEqual(Array.from({ length: unitCount }, (_, i) => i + 1));
		expect(units.map((u) => u.id)).toEqual(units.map((_, i) => `${prefix}-u${String(i + 1).padStart(2, '0')}`));
		expect(units.every((u) => u.course === id)).toBe(true);
	});

	it(`ノードは全部で ${nodeCount} 個、ID は ${prefix}-uNN-nN 形式で、所属ユニットと連番が合う`, () => {
		expect(nodes).toHaveLength(nodeCount);
		for (const unit of units) {
			unit.nodes.forEach((node, i) => expect(node.id).toBe(`${unit.id}-n${i + 1}`));
		}
	});

	it('全ノードが meta を持つ', () => {
		for (const node of nodes) expect(node.meta, node.id).toBeDefined();
	});

	it('問題数の下限は、問題の型ごとの決まりどおり（模擬試験は試験の問数）', () => {
		for (const unit of units) {
			for (const node of unit.nodes) {
				const expected = unit.kind === 'checktest' ? mockQuestions : MIN_BY_TYPE[node.meta!.nodeType];
				expect(node.meta!.minQuestions, node.id).toBe(expected);
			}
		}
	});

	it('論点はノード間で重ならない', () => {
		const topics = nodes.map((n) => n.meta!.topic);
		expect(new Set(topics).size).toBe(topics.length);
	});

	it('最後のユニットは模擬試験で、練習・復習ノードの対象外', () => {
		const withDynamic = withDynamicNodes(units);
		const mock = withDynamic.find((u) => u.kind === 'checktest');
		expect(mock?.id).toBe(units[units.length - 1].id);
		expect(mock?.nodes.every((n: ContentNode) => n.kind === 'lesson')).toBe(true);
	});
});

describe('日商3級', () => {
	it('2027年度の新論点は U7-4・U8-3・U8-5 だけ', () => {
		const nodes = COURSES[0].units.flatMap((u) => u.nodes);
		expect(nodes.filter((n) => n.meta!.isNew).map((n) => n.id)).toEqual(['b3-u07-n4', 'b3-u08-n3', 'b3-u08-n5']);
	});
});

describe('日商2級', () => {
	const units = COURSES[1].units;
	const nodes = units.flatMap((u) => u.nodes);

	it('2027年度の新論点は、リース（U7）の全ノード', () => {
		expect(nodes.filter((n) => n.meta!.isNew).map((n) => n.id)).toEqual(
			units[6].nodes.map((n) => n.id)
		);
	});

	it('工業簿記（第4問・第5問）のノードだけが examPart 4・5 を持ち、第4問は (1)(2) を持つ', () => {
		for (const node of nodes) {
			const { examPart, examSub } = node.meta!;
			if (examPart === 4) expect([1, 2], node.id).toContain(examSub);
			else expect(examSub, node.id).toBeUndefined();
		}
		expect(nodes.filter((n) => n.meta!.examPart === 5).length).toBeGreaterThan(0);
	});

	it('計算のノードは、工業簿記の第4問(2)と第5問から選ばれる', () => {
		for (const node of nodes.filter((n) => n.meta!.nodeType === 'calculation')) {
			const { examPart, examSub } = node.meta!;
			expect(examPart === 5 || (examPart === 4 && examSub === 2), node.id).toBe(true);
		}
	});

	it('「見分ける」のノードは 6 問の見分けの型', () => {
		const discriminate = nodes.filter((n) => n.title.startsWith('見分ける'));
		expect(discriminate.length).toBe(8);
		expect(discriminate.every((n) => n.meta!.nodeType === 'discriminate')).toBe(true);
	});

	it('日商3級とノード・ユニットの ID が重ならない', () => {
		const ids = new Set(COURSES[0].units.flatMap((u) => [u.id, ...u.nodes.map((n) => n.id)]));
		for (const id of units.flatMap((u) => [u.id, ...u.nodes.map((n) => n.id)])) expect(ids.has(id), id).toBe(false);
	});

	it('ミックス復習の ID は日商3級と重ならない', () => {
		const mixIds = (us: ContentUnit[], opts?: { mixPrefix?: string }) =>
			withDynamicNodes(us, opts)
				.flatMap((u) => u.nodes)
				.filter((n) => n.kind === 'review-mix')
				.map((n) => n.id);
		const boki3 = mixIds(COURSES[0].units);
		const boki2 = mixIds(units, { mixPrefix: 'mix-review-b2' });
		expect(boki3[0]).toBe('mix-review-1');
		expect(boki2.length).toBeGreaterThan(0);
		for (const id of boki2) expect(boki3).not.toContain(id);
	});
});

describe('問題が空のノード', () => {
	it('「準備中」を出し、レッスンを始めさせない', () => {
		// 全ノードに問題が入ったあとも確かめられるよう、問題を空にしたノードで描く
		const empty = { ...COURSES[0].units[0].nodes[0], questions: [] };
		const data = {
			node: empty,
			accounts: [],
			course: { id: 'boki3', title: '日商3級', persistProgress: true }
		};
		const { body } = render(LessonPage, { props: { data } as never });
		expect(body).toContain('準備中');
		expect(body).not.toContain('レッスンをはじめる');
	});
});
