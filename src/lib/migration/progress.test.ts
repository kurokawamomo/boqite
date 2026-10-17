import { describe, expect, it } from 'vitest';
import { withDynamicNodes } from '$lib/content/dynamicNodes';
import type { ContentNode, ContentUnit } from '$lib/content/course';
import { type NodeMap, type OldProgress, parseNodeMap, planMigration } from './progress';

const lesson = (id: string): ContentNode => ({ id, title: id, kind: 'lesson', questions: [] });
const unit = (id: string, chapter: number, nodeIds: string[]): ContentUnit => ({
	id,
	course: 'c',
	chapter,
	title: id,
	kind: 'chapter',
	nodes: nodeIds.map(lesson)
});

const units = withDynamicNodes([unit('x1', 1, ['x1-a', 'x1-b']), unit('x2', 2, ['x2-a', 'x2-b'])]);

const map: NodeMap = {
	version: 1,
	nodes: [
		{ id: 'x1-a', from: ['old-1'] },
		{ id: 'x1-b', from: ['old-1', 'old-2'] },
		{ id: 'x2-a', from: ['old-3'] },
		{ id: 'x2-b', from: [] }
	]
};

const done = (clearedAt: string, bestResult: number): OldProgress => ({ clearedAt: new Date(clearedAt), bestResult });

describe('planMigration', () => {
	it('対応する旧ノードが全部クリア済みなら、新ノードをクリア済みにする', () => {
		const old = new Map([
			['old-1', done('2026-01-01T00:00:00Z', 80)],
			['old-2', done('2026-01-03T00:00:00Z', 60)]
		]);
		const plan = planMigration(map, units, old);
		const ids = plan.rows.map((r) => r.nodeId);
		expect(ids).toContain('x1-a');
		expect(ids).toContain('x1-b');
		expect(ids).not.toContain('x2-a');
	});

	it('一部の旧ノードが未クリアなら、引き継がない', () => {
		const old = new Map([['old-1', done('2026-01-01T00:00:00Z', 80)]]);
		const plan = planMigration(map, units, old);
		const ids = plan.rows.map((r) => r.nodeId);
		expect(ids).toContain('x1-a');
		expect(ids).not.toContain('x1-b');
	});

	it('クリア日時は最新、結果は最小を引き継ぐ', () => {
		const old = new Map([
			['old-1', done('2026-01-01T00:00:00Z', 80)],
			['old-2', done('2026-01-03T00:00:00Z', 60)]
		]);
		const row = planMigration(map, units, old).rows.find((r) => r.nodeId === 'x1-b');
		expect(row?.clearedAt).toEqual(new Date('2026-01-03T00:00:00Z'));
		expect(row?.bestResult).toBe(60);
	});

	it('対応する旧ノードが無い新ノードと、holdBack のノードは引き継がない', () => {
		const old = new Map([
			['old-1', done('2026-01-01T00:00:00Z', 80)],
			['old-3', done('2026-01-01T00:00:00Z', 80)]
		]);
		const held: NodeMap = { ...map, nodes: map.nodes.map((n) => (n.id === 'x2-a' ? { ...n, holdBack: true } : n)) };
		const ids = planMigration(held, units, old).rows.map((r) => r.nodeId);
		expect(ids).not.toContain('x2-a');
		expect(ids).not.toContain('x2-b');
	});

	it('練習ノードは元のレッスンに、章の復習は章の全レッスンに従う', () => {
		const old = new Map([
			['old-1', done('2026-01-01T00:00:00Z', 80)],
			['old-2', done('2026-01-01T00:00:00Z', 80)]
		]);
		const ids = planMigration(map, units, old).rows.map((r) => r.nodeId);
		expect(ids.filter((id) => id.startsWith('practice-x1-a-')).length).toBeGreaterThan(0);
		expect(ids).toContain('review-x1');
		expect(ids).not.toContain('review-x2');
	});

	it('現在地は、引き継いだあとの最初の未クリアノード', () => {
		const old = new Map([
			['old-1', done('2026-01-01T00:00:00Z', 80)],
			['old-2', done('2026-01-01T00:00:00Z', 80)]
		]);
		expect(planMigration(map, units, old).current).toBe('x2-a');
	});

	it('対応表の漏れと余りを報告する', () => {
		const partial: NodeMap = { version: 1, nodes: [{ id: 'x1-a', from: [] }, { id: 'zzz', from: [] }] };
		const plan = planMigration(partial, units, new Map());
		expect(plan.unmapped).toEqual(['x1-b', 'x2-a', 'x2-b']);
		expect(plan.unknown).toEqual(['zzz']);
	});
});

describe('parseNodeMap', () => {
	it('形が違う対応表は拒否する', () => {
		expect(() => parseNodeMap({ version: 2, nodes: [] })).toThrow();
		expect(() => parseNodeMap({ version: 1, nodes: [{ id: 'a' }] })).toThrow();
		expect(() =>
			parseNodeMap({ version: 1, nodes: [{ id: 'a', from: [] }, { id: 'a', from: [] }] })
		).toThrow(/重複/);
	});
});
