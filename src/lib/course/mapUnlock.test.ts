import { describe, expect, it } from 'vitest';
import type { CourseSummary } from '$lib/content/course';
import { withDynamicNodes } from '$lib/content/dynamicNodes';
import { validateUnitFile } from '$lib/server/content/validate';
import { createSeededRng } from '$lib/review/prng';
import { deriveMapUnits, type NodeStatus } from './courseView';

const unitModules = import.meta.glob<{ default: unknown }>('/content/boki3/*.json', { eager: true });

/** ローダと同じ手順（検証 → chapter 順 → 練習・復習ノード挿入）で作る、実データのコース要約 */
function getCourseSummary(courseId: string): CourseSummary {
	const units = Object.keys(unitModules)
		.sort()
		.map((file) => validateUnitFile(unitModules[file].default, file.split('/').pop()!))
		.sort((a, b) => a.chapter - b.chapter);
	return {
		units: withDynamicNodes(units)
			.filter((unit) => unit.course === courseId)
			.map((unit) => ({
				id: unit.id,
				course: unit.course,
				chapter: unit.chapter,
				title: unit.title,
				nodes: unit.nodes.map((n) => ({ id: n.id, title: n.title, kind: n.kind, questionCount: n.questions.length }))
			}))
	};
}

/** 実データのコース全体（練習・復習ノード込み）を、出現順の平坦な列にする */
function flatNodes(courseId: string) {
	const summary = getCourseSummary(courseId);
	return { summary, nodes: summary.units.flatMap((u) => u.nodes.map((n) => ({ ...n, unitId: u.id }))) };
}

function statusesOf(courseId: string, cleared: ReadonlySet<string>): NodeStatus[] {
	return deriveMapUnits(getCourseSummary(courseId), cleared).flatMap((u) => u.nodes.map((n) => n.status));
}

/** 直前がクリア済みの未クリアノードが locked になっていないこと、および locked の条件を確かめる */
function assertUnlockRule(nodeIds: string[], cleared: ReadonlySet<string>, statuses: NodeStatus[]) {
	let currentSeen = false;
	for (let i = 0; i < nodeIds.length; i++) {
		const isCleared = cleared.has(nodeIds[i]);
		if (isCleared) {
			expect(statuses[i]).toBe('cleared');
			continue;
		}
		const previousCleared = i > 0 && cleared.has(nodeIds[i - 1]);
		if (!currentSeen) {
			expect(statuses[i]).toBe('current');
			currentSeen = true;
		} else if (previousCleared) {
			expect(statuses[i]).not.toBe('locked');
		} else {
			expect(statuses[i]).toBe('locked');
		}
	}
}

describe('マップの解放規則（実データ）', () => {
	for (const course of [{ id: 'boki3' }]) {
		it(`${course.id}: 直前がクリア済みのノードは、練習・復習を含め決して locked にならない`, () => {
			const { nodes } = flatNodes(course.id);
			const ids = nodes.map((n) => n.id);
			const rng = createSeededRng(20261017);

			// 1ノードだけクリア済み、を全ノードで
			for (const id of ids) {
				const cleared = new Set([id]);
				assertUnlockRule(ids, cleared, statusesOf(course.id, cleared));
			}
			// ランダムな穴あき・まばらなクリア状態
			for (let trial = 0; trial < 300; trial++) {
				const density = rng();
				const cleared = new Set(ids.filter(() => rng() < density));
				assertUnlockRule(ids, cleared, statusesOf(course.id, cleared));
			}
		});
	}

	it('移行後の形: U7-4 未クリア・U8-2 クリア・U8-3 未クリアでも U8-3 を選べる', () => {
		const { summary, nodes } = flatNodes('boki3');
		const nodeOf = (unit: number, position: number) => {
			const id = summary.units[unit - 1].nodes[position - 1].id;
			return { id, index: nodes.findIndex((n) => n.id === id) };
		};
		const u74 = nodeOf(7, 4);
		const u82 = nodeOf(8, 2);
		const u83 = nodeOf(8, 3);

		// U7-4 より前は全部クリア済み、U7-4 は未クリア、U8-2 だけクリア済み
		const cleared = new Set(nodes.slice(0, u74.index).map((n) => n.id));
		cleared.add(u82.id);

		const statuses = statusesOf('boki3', cleared);
		expect(statuses[u74.index]).toBe('current');
		expect(statuses[u82.index]).toBe('cleared');
		expect(statuses[u83.index]).not.toBe('locked');
		// U8-3 の直後は、直前（U8-3）が未クリアなので閉じたまま
		expect(statuses[u83.index + 1]).toBe('locked');
	});

	it('移行後の形: U17-2 クリア・U17-3 未クリアで U17-3 を選べる', () => {
		const { summary, nodes } = flatNodes('boki3');
		const u172 = summary.units[16].nodes[1].id;
		const u173 = summary.units[16].nodes[2].id;

		const statuses = statusesOf('boki3', new Set([u172]));
		expect(statuses[nodes.findIndex((n) => n.id === u173)]).not.toBe('locked');
	});
});
