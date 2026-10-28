import type { ContentUnit } from '$lib/content/course';
import { isRecord } from '$lib/util/isRecord';

/**
 * 旧コースから新コースへの進捗の引き継ぎ（純粋な計画づくり）。
 *
 * 対応表は旧ノードの ID を含むので、リポジトリには置かない（.spec/migration/ 側）。
 * ここには旧 ID を書かない。
 */

export type NodeMapEntry = {
	/** 新ノード ID */
	id: string;
	/** 対応する旧ノード ID。全部クリア済みなら新ノードもクリア済みにする。空なら引き継がない */
	from: string[];
	/** true なら from がクリア済みでも引き継がない */
	holdBack?: boolean;
	note?: string;
};

export type NodeMap = { version: 1; nodes: NodeMapEntry[] };

export type OldProgress = { clearedAt: Date | null; bestResult: number | null };

export type ClearedRow = {
	nodeId: string;
	clearedAt: Date | null;
	bestResult: number | null;
	reason: 'mapped' | 'practice' | 'review-unit' | 'review-mix';
};

export type MigrationPlan = {
	/** 新たにクリア済みにする行（コース順） */
	rows: ClearedRow[];
	/** 引き継ぎ後に現在地になるノード（最初の未クリア）。全部クリアなら null */
	current: string | null;
	/** 新ノードのうち、対応表に載っていないもの */
	unmapped: string[];
	/** 対応表にあるが、新コースに存在しないノード */
	unknown: string[];
};

export function parseNodeMap(raw: unknown): NodeMap {
	if (!isRecord(raw) || raw.version !== 1 || !Array.isArray(raw.nodes)) {
		throw new Error('対応表の形が違います（version: 1 と nodes 配列が必要）');
	}
	const seen = new Set<string>();
	const nodes = raw.nodes.map((n, i): NodeMapEntry => {
		if (!isRecord(n) || typeof n.id !== 'string' || !Array.isArray(n.from) || !n.from.every((f) => typeof f === 'string')) {
			throw new Error(`対応表 nodes[${i}] の形が違います（id: string, from: string[]）`);
		}
		if (seen.has(n.id)) throw new Error(`対応表に ${n.id} が重複しています`);
		seen.add(n.id);
		return {
			id: n.id,
			from: n.from as string[],
			holdBack: n.holdBack === true,
			note: typeof n.note === 'string' ? n.note : undefined
		};
	});
	return { version: 1, nodes };
}

function lessonOf(practiceNodeId: string, lessonIds: ReadonlySet<string>): string | undefined {
	for (const id of lessonIds) {
		if (practiceNodeId.startsWith(`practice-${id}-`)) return id;
	}
	return undefined;
}

/**
 * @param units 練習・復習ノード（withDynamicNodes）を挿入済みの新コース
 * @param oldProgress 旧ノード ID → クリア記録（クリア済みのものだけ）
 * @param existing すでに新ノードとしてクリア済みの ID（再実行でも結果が同じになるよう、現在地の判定に含める）
 */
export function planMigration(
	map: NodeMap,
	units: ContentUnit[],
	oldProgress: ReadonlyMap<string, OldProgress>,
	existing: ReadonlySet<string> = new Set()
): MigrationPlan {
	const entries = new Map(map.nodes.map((n) => [n.id, n]));
	const nodes = units.flatMap((u) => u.nodes);
	const lessons = nodes.filter((n) => n.kind === 'lesson');
	const lessonIds = new Set(lessons.map((n) => n.id));

	const clearedLesson = new Map<string, ClearedRow>();
	for (const node of lessons) {
		const entry = entries.get(node.id);
		if (!entry || entry.holdBack || entry.from.length === 0) continue;
		const sources = entry.from.map((id) => oldProgress.get(id));
		if (sources.some((s) => s === undefined)) continue;
		const done = sources as OldProgress[];
		const times = done.map((s) => s.clearedAt?.getTime()).filter((t): t is number => t !== undefined);
		const results = done.map((s) => s.bestResult).filter((r): r is number => r !== null);
		clearedLesson.set(node.id, {
			nodeId: node.id,
			clearedAt: times.length > 0 ? new Date(Math.max(...times)) : null,
			bestResult: results.length > 0 ? Math.min(...results) : null,
			reason: 'mapped'
		});
	}

	const unitLessonsCleared = (unit: ContentUnit) =>
		unit.nodes.filter((n) => n.kind === 'lesson').every((n) => clearedLesson.has(n.id));

	const rows: ClearedRow[] = [];
	const cleared = new Set<string>();
	for (const unit of units) {
		for (const node of unit.nodes) {
			let row: ClearedRow | undefined;
			if (node.kind === 'lesson') {
				row = clearedLesson.get(node.id);
			} else if (node.kind === 'practice') {
				const lesson = lessonOf(node.id, lessonIds);
				const base = lesson ? clearedLesson.get(lesson) : undefined;
				if (base) row = { ...base, nodeId: node.id, reason: 'practice' };
			} else if (node.kind === 'review-unit') {
				if (unitLessonsCleared(unit)) {
					row = { nodeId: node.id, clearedAt: null, bestResult: null, reason: 'review-unit' };
				}
			} else if (node.kind === 'review-mix' && node.pool?.from === 'units') {
				const scope = node.pool.unitIds;
				if (units.filter((u) => scope.includes(u.id)).every(unitLessonsCleared)) {
					row = { nodeId: node.id, clearedAt: null, bestResult: null, reason: 'review-mix' };
				}
			}
			if (row) {
				rows.push(row);
				cleared.add(node.id);
			}
		}
	}

	const current = nodes.find((n) => !cleared.has(n.id) && !existing.has(n.id))?.id ?? null;
	const unmapped = lessons.filter((n) => !entries.has(n.id)).map((n) => n.id);
	const unknown = map.nodes.filter((n) => !lessonIds.has(n.id)).map((n) => n.id);
	return { rows, current, unmapped, unknown };
}
