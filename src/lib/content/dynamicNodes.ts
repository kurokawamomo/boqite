import type { ContentNode, ContentUnit } from './course';

/**
 * 練習・復習ノード（動的抽選）の挿入。純関数にしてあるのは、
 * ローダと進捗移行スクリプト（Vite 外で動く）が同じノード ID を導くため。
 */

/** 3 Unit ごとにミックス復習ノードを挿入する間隔 */
const MIX_REVIEW_INTERVAL = 3;

/**
 * 練習ノードの挿入数を、ノード ID から決定的に 1〜2 個に決める。
 * 乱数にするとリロードのたびにマップの形が変わってしまうため、ID の安定ハッシュを使う。
 */
function practiceCountFor(nodeId: string): number {
	let hash = 0;
	for (let i = 0; i < nodeId.length; i++) hash = (hash * 31 + nodeId.charCodeAt(i)) | 0;
	return (Math.abs(hash) % 2) + 1;
}

/**
 * 通常レッスンの直後に練習ノードを 1〜2 個差し込む。
 *
 * 出題プールは「そのレッスン＋直前のレッスン」。直前レッスンは Unit 境界を跨いで
 * コース出現順で辿るため、章の切り替わり直後でも前章の内容が混ざって反復される。
 * 問題データは増やさず、既存問題の組み合わせでレッスン数を増やす。
 */
function withPracticeNodes(nodes: ContentNode[], prevLessonId: string | null): ContentNode[] {
	const result: ContentNode[] = [];
	let previous = prevLessonId;

	for (const node of nodes) {
		result.push(node);
		if (node.kind !== 'lesson') continue;

		const nodeIds = previous ? [previous, node.id] : [node.id];
		const count = practiceCountFor(node.id);
		for (let i = 1; i <= count; i++) {
			result.push({
				id: `practice-${node.id}-${i}`,
				title: count === 1 ? `${node.title}の練習` : `${node.title}の練習${i}`,
				kind: 'practice',
				questions: [],
				pool: { from: 'nodes', nodeIds }
			});
		}
		previous = node.id;
	}

	return result;
}

/** コース出現順で最後の通常レッスン ID を返す */
function lastLessonId(nodes: ContentNode[], fallback: string | null): string | null {
	for (let i = nodes.length - 1; i >= 0; i--) {
		if (nodes[i].kind === 'lesson') return nodes[i].id;
	}
	return fallback;
}

/**
 * 各レッスンの直後に練習ノード、各 Unit 末尾に「章の復習」、
 * MIX_REVIEW_INTERVAL Unit ごとに「ミックス復習」を挿入する。
 */
export function withDynamicNodes(
	units: ContentUnit[],
	options: { mixPrefix?: string } = {}
): ContentUnit[] {
	// ミックス復習の ID は進捗に入るので、コースごとに接頭辞を変えて重ならないようにする
	// （既定の接頭辞は、すでに進捗に入っている日商3級の ID と同じ）
	const mixPrefix = options.mixPrefix ?? 'mix-review';
	let prevLessonId: string | null = null;

	return units.map((unit, unitIndex) => {
		if (unit.kind === 'checktest') return unit;

		const withPractice = withPracticeNodes(unit.nodes, prevLessonId);
		prevLessonId = lastLessonId(unit.nodes, prevLessonId);

		const reviewUnitNode: ContentNode = {
			id: `review-${unit.id}`,
			title: `${unit.title}の復習`,
			kind: 'review-unit',
			questions: [],
			pool: { from: 'units', unitIds: [unit.id] }
		};

		const nodes = [...withPractice, reviewUnitNode];

		if ((unitIndex + 1) % MIX_REVIEW_INTERVAL === 0) {
			const groupNumber = (unitIndex + 1) / MIX_REVIEW_INTERVAL;
			const scopeUnitIds = units.slice(0, unitIndex + 1).map((u) => u.id);
			nodes.push({
				id: `${mixPrefix}-${groupNumber}`,
				title: `ミックス復習${groupNumber}（第1〜${unit.chapter}章）`,
				kind: 'review-mix',
				questions: [],
				pool: { from: 'units', unitIds: scopeUnitIds }
			});
		}

		return { ...unit, nodes };
	});
}
