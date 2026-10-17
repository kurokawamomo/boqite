/**
 * コース構造の型（Course → Unit → Node）。
 *
 * 読み込み・検証は `$lib/server/content/loader` の仕事だが、構造そのものは
 * サーバ固有ではない。マップ表示のようなクライアント側の消費者が
 * `$lib/server/` を参照せずに済むよう、型はここに置く。
 */
import type { Question } from './types';

/**
 * ノードの種類。
 * - lesson: 静的な問題一覧を持つ通常レッスン
 * - practice: 直前のレッスンを反復する練習ノード（動的抽選）
 * - review-unit: 章の復習（動的抽選）
 * - review-mix: 数章ごとのミックス復習（動的抽選）
 */
export type NodeKind = 'lesson' | 'practice' | 'review-unit' | 'review-mix';

/**
 * 動的抽選ノードの出題プール指定。
 * どの範囲から問題を集めるかだけを表し、何問選ぶか・どう重み付けするかは抽選側の責務。
 */
export type QuestionPool =
	/** 指定 Unit 群の通常レッスンが持つ全問題（章の復習・ミックス復習） */
	| { from: 'units'; unitIds: string[] }
	/** 指定ノード群が持つ全問題（練習ノード） */
	| { from: 'nodes'; nodeIds: string[] };

/**
 * ノードの設計メタ（学習設計図の1行）。通常レッスンのみが持つ。
 * 問題が空でも「何を教えるノードか」「何問必要か」が残る。
 */
export type NodeMeta = {
	/** 到達目標（「〜できる」の形） */
	goal: string;
	/** 主題の論点。生成器と不足監査の突き合わせ単位 */
	topic: string;
	/** このノードに置く問題数の下限 */
	minQuestions: number;
	/** 問題の型。下限の決め方と生成問題の割合を決める */
	nodeType: NodeType;
	/** 試験の第何問の形で練習するか。模擬試験は全問なので null */
	examPart: 1 | 2 | 3 | 4 | 5 | null;
	/** 2級の第4問は (1) 仕訳と (2) 原価計算に分かれる。第4問のノードだけが持つ */
	examSub?: 1 | 2;
	/** このノードが初出の科目 */
	introduces: string[];
	/** 2027年度から3級に入る論点 */
	isNew: boolean;
};

/**
 * basic: 基本の仕訳 / application: 応用の組み合わせ / ledger: 帳簿と表の記入 / discriminate: 見分け /
 * calculation: 計算（2級の工業簿記など。数値を変えた生成問題が半分）
 */
export type NodeType = 'basic' | 'application' | 'ledger' | 'discriminate' | 'calculation';

export type ContentNode = {
	id: string;
	title: string;
	kind: NodeKind;
	/** 学習設計図に沿った新コースのノードだけが持つ */
	meta?: NodeMeta;
	/** lesson: 静的な問題一覧。それ以外: getNodeQuestions 時点で動的に埋める（静的には空） */
	questions: Question[];
	/** kind !== 'lesson' の場合のみ設定。抽選元の問題プール */
	pool?: QuestionPool;
};

/**
 * Unit の種別。
 * - chapter: 通常の章。練習・復習ノードの動的挿入対象
 * - checktest: 最終チェックテスト（章の集大成として全問固定で出題する）。
 *   練習・復習ノードは意味を持たない（既に全論点の総まとめのため）ので動的挿入の対象外
 */
export type UnitKind = 'chapter' | 'checktest';

export type ContentUnit = {
	id: string;
	course: string;
	chapter: number;
	title: string;
	/** 省略時は 'chapter' */
	kind: UnitKind;
	nodes: ContentNode[];
};

/** 同じアプリで並べられるコース 1 本の属性 */
export type CourseInfo = {
	id: string;
	title: string;
	/** false のコースは node_progress / attempts に何も書かず、マップは全ノードを開放する */
	persistProgress: boolean;
};

export type Course = {
	units: ContentUnit[];
};

/** マップ表示用の要約（正解データを含まない） */
export type CourseSummary = {
	units: Array<{
		id: string;
		course: string;
		chapter: number;
		title: string;
		nodes: Array<{ id: string; title: string; kind: NodeKind; questionCount: number }>;
	}>;
};
