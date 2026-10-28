import type { CourseSummary, NodeKind } from '$lib/content/course';

/**
 * - current: 最初の未クリア（現在地）
 * - open: 選べる。直前のノードがクリア済み、または進捗を保存しないコース
 * - locked: 直前のノードが未クリア
 */
export type NodeStatus = 'locked' | 'current' | 'cleared' | 'open';

export type MapNodeView = {
	id: string;
	label: string;
	status: NodeStatus;
	/** 通常レッスン / 練習 / 復習。マップ側のアイコン・形の出し分けに使う */
	kind: NodeKind;
};

export type MapUnitView = {
	id: string;
	title: string;
	color: string;
	nodes: MapNodeView[];
};

const UNIT_COLORS = ['#55c50d', '#1fa9ee', '#c97bf9', '#fb9407', '#f24a4a'];

/**
 * ノード状態はコース全体を通した出現順で導出する（Unit境界を跨いで連続）。
 * clearedNodeIds に含まれる=クリア済、それ以外で最初に出現するもの=現在地。
 * それ以外の未クリアは、直前のノードがクリア済みなら open（選べる）、未クリアなら locked。
 * sequential=false なら全ノードを open にする（進捗を保存しないコース用）。
 */
export function deriveMapUnits(
	course: CourseSummary,
	clearedNodeIds: ReadonlySet<string>,
	options: { sequential?: boolean } = {}
): MapUnitView[] {
	const sequential = options.sequential ?? true;
	let currentAssigned = false;
	let previousCleared = false;

	return course.units.map((unit, unitIndex) => ({
		id: unit.id,
		title: unit.title,
		color: UNIT_COLORS[unitIndex % UNIT_COLORS.length],
		nodes: unit.nodes.map((node) => {
			let status: NodeStatus;
			if (!sequential) {
				status = 'open';
			} else if (clearedNodeIds.has(node.id)) {
				status = 'cleared';
			} else if (!currentAssigned) {
				status = 'current';
				currentAssigned = true;
			} else {
				status = previousCleared ? 'open' : 'locked';
			}
			previousCleared = status === 'cleared';
			return { id: node.id, label: node.title, status, kind: node.kind };
		})
	}));
}
