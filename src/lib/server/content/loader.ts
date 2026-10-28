import type { Account, Question } from '$lib/content/types';
import {
	MAX_REVIEW_QUESTION_COUNT,
	MIN_REVIEW_QUESTION_COUNT,
	selectPracticeQuestionIds,
	selectReviewNodeQuestionIds
} from '$lib/server/review';
import { withDynamicNodes } from '$lib/content/dynamicNodes';
import { getCourseDirs } from './courseDir';
import { assertNoIdCollision, loadExternalCourses } from './externalCourse';
import { ContentValidationError, validateAccount, validateUnitFile } from './validate';
import type {
	ContentNode,
	ContentUnit,
	Course,
	CourseInfo,
	CourseSummary,
	NodeKind,
	QuestionPool,
	UnitKind
} from '$lib/content/course';

export type {
	ContentNode,
	ContentUnit,
	Course,
	CourseInfo,
	CourseSummary,
	NodeKind,
	QuestionPool,
	UnitKind
};

/**
 * content/boki3/*.json + content/accounts.json のローダ。
 * 型は src/lib/content/types.ts を信頼できる定義とし、ここでは手書きバリデーションのみ行う。
 *
 * ファイル読み込みは import.meta.glob（Vite）で行う。node:fs を使わないため
 * dev / build いずれのバンドル文脈でも同じ経路で解決され、dev 中の変更は Vite の HMR で自動反映される。
 */

const unitModules = import.meta.glob<{ default: unknown }>('/content/boki3/*.json', { eager: true });
const boki2Modules = import.meta.glob<{ default: unknown }>('/content/boki2/*.json', { eager: true });
const accountsModule = import.meta.glob<{ default: unknown }>('/content/accounts.json', { eager: true });

export { ContentValidationError };

export type ContentBundle = {
	/** 本体と追加コースの Unit を出現順に並べたもの。Unit の `course` で見分ける */
	course: Course;
	accounts: Account[];
	courses: CourseInfo[];
};

export const MAIN_COURSE: CourseInfo = { id: 'boki3', title: '日商3級', persistProgress: true };
export const BOKI2_COURSE: CourseInfo = { id: 'boki2', title: '日商2級', persistProgress: true };

/** マップ要約表示用の目安出題数（実際の抽選数は 5-7 の範囲で毎回変動する） */
const REVIEW_QUESTION_COUNT_DISPLAY = Math.round(
	(MIN_REVIEW_QUESTION_COUNT + MAX_REVIEW_QUESTION_COUNT) / 2
);

/**
 * プロセス内キャッシュ（モジュール変数）。import.meta.glob({ eager: true }) は
 * dev 中のファイル変更で Vite が本モジュールごと再評価するため、追加の再読込処理は不要。
 */
let cache: ContentBundle | null = null;

export function loadContent(): ContentBundle {
	if (cache) return cache;
	const mainUnits = withDynamicNodes(loadUnits(unitModules, MAIN_COURSE));
	const boki2Units = withDynamicNodes(loadUnits(boki2Modules, BOKI2_COURSE), { mixPrefix: 'mix-review-b2' });
	assertNoIdCollision({ info: MAIN_COURSE, units: mainUnits }, { info: BOKI2_COURSE, units: boki2Units });
	const accounts = loadAccounts();
	const courses = [MAIN_COURSE, BOKI2_COURSE];
	const units = [...mainUnits, ...boki2Units];

	const externals = loadExternalCourses(getCourseDirs(), [
		{ info: MAIN_COURSE, units: mainUnits },
		{ info: BOKI2_COURSE, units: boki2Units }
	]);
	for (const external of externals) {
		courses.push(external.info);
		// 進捗を保存しないコースは練習・復習ノード（履歴からの抽選）が成り立たないので挿入しない
		// ミックス復習の ID は進捗に入るので、コースごとに接頭辞を変えて重ならないようにする
		units.push(
			...(external.info.persistProgress
				? withDynamicNodes(external.units, { mixPrefix: `mix-review-${external.info.id}` })
				: external.units)
		);
		const known = new Set(accounts.map((a) => a.name));
		accounts.push(...external.accounts.filter((a) => !known.has(a.name)));
	}

	cache = { course: { units }, accounts, courses };
	return cache;
}

export function listCourses(): CourseInfo[] {
	return loadContent().courses;
}

/** 未指定・不明な id は本体コースに倒す */
export function resolveCourse(courseId: string | null | undefined): CourseInfo {
	return listCourses().find((c) => c.id === courseId) ?? MAIN_COURSE;
}

/** ノードが属するコース。ノードが見つからなければ undefined */
export function getCourseOfNode(nodeId: string): CourseInfo | undefined {
	const { course, courses } = loadContent();
	const unit = course.units.find((u) => u.nodes.some((n) => n.id === nodeId));
	return unit ? courses.find((c) => c.id === unit.course) : undefined;
}

export function getCourseSummary(courseId: string = MAIN_COURSE.id): CourseSummary {
	const { course } = loadContent();
	return {
		units: course.units
			.filter((unit) => unit.course === courseId)
			.map((unit) => ({
			id: unit.id,
			course: unit.course,
			chapter: unit.chapter,
			title: unit.title,
			nodes: unit.nodes.map((node) => ({
				id: node.id,
				title: node.title,
				kind: node.kind,
				questionCount: node.kind === 'lesson' ? node.questions.length : REVIEW_QUESTION_COUNT_DISPLAY
			}))
		}))
	};
}

/**
 * ノードを ID で引く（同期・既存互換）。
 * 練習・復習ノード（practice / review-*）は動的抽選前の静的形（questions: []）を返す。
 * 動的抽選が必要な呼び出し元は {@link getNodeQuestions} を使うこと。
 */
export function getNodeById(nodeId: string): ContentNode | undefined {
	const { course } = loadContent();
	return findNode(course, nodeId);
}

/**
 * ノードの全問題を返す。
 * 通常レッスンは静的な問題一覧をそのまま返す。練習・復習ノードは
 * リクエストのたびに出題プール（node.pool）と attempts 履歴から動的に抽選する。
 * レスポンス形状（{ id, title, questions }）は通常レッスンと変わらないため、呼び出し側の変更は不要。
 */
export async function getNodeQuestions(nodeId: string): Promise<ContentNode | undefined> {
	const { course } = loadContent();
	const node = findNode(course, nodeId);
	if (!node) return undefined;
	if (node.kind === 'lesson') return node;

	const pool = resolvePool(course, node.pool);
	// 練習は「まだ解いていない問題」も候補に入れる。復習は既習に限る（$lib/server/review 参照）
	const ids =
		node.kind === 'practice'
			? await selectPracticeQuestionIds(pool)
			: await selectReviewNodeQuestionIds(pool);
	return { ...node, questions: getQuestionsByIds(course, ids) };
}

function findNode(course: Course, nodeId: string): ContentNode | undefined {
	for (const unit of course.units) {
		const node = unit.nodes.find((n) => n.id === nodeId);
		if (node) return node;
	}
	return undefined;
}

/** 出題プール指定を実際の問題 ID 列に解決する（出現順・動的ノード自身は除外） */
function resolvePool(course: Course, pool: QuestionPool | undefined): string[] {
	if (!pool) return [];
	const ids: string[] = [];
	for (const unit of course.units) {
		if (pool.from === 'units' && !pool.unitIds.includes(unit.id)) continue;
		for (const node of unit.nodes) {
			if (node.kind !== 'lesson') continue;
			if (pool.from === 'nodes' && !pool.nodeIds.includes(node.id)) continue;
			for (const q of node.questions) ids.push(q.id);
		}
	}
	return ids;
}

/** 問題 ID 列（重複可）を実体の Question[] に解決する */
function getQuestionsByIds(course: Course, ids: string[]): Question[] {
	const byId = new Map<string, Question>();
	for (const unit of course.units) {
		for (const node of unit.nodes) {
			if (node.kind !== 'lesson') continue;
			for (const q of node.questions) byId.set(q.id, q);
		}
	}
	return ids.map((id) => {
		const q = byId.get(id);
		if (!q) throw new ContentValidationError(`復習抽選で解決できない question id: ${id}`);
		return q;
	});
}

function loadUnits(modules: Record<string, { default: unknown }>, course: CourseInfo): ContentUnit[] {
	const files = Object.keys(modules).sort();
	if (files.length === 0) {
		throw new ContentValidationError(`content/${course.id} に *.json が見つかりません`);
	}
	const units = files.map((filePath) => {
		const fileName = filePath.split('/').pop()!;
		const unit = validateUnitFile(modules[filePath].default, fileName);
		if (unit.course !== course.id) {
			throw new ContentValidationError(`${fileName}: unit.course は "${course.id}" である必要があります（実際: "${unit.course}"）`);
		}
		return unit;
	});
	// ファイル名ではなく chapter で並べる。checktest.json は 'c' が 'u' より前に
	// ソートされてしまい、ファイル名順だとチェックテストが先頭に来てしまうため。
	return units.sort((a, b) => a.chapter - b.chapter);
}

function loadAccounts(): Account[] {
	const entry = accountsModule['/content/accounts.json'];
	if (!entry) {
		throw new ContentValidationError('content/accounts.json を読み込めません');
	}
	const parsed = entry.default;
	if (!Array.isArray(parsed)) {
		throw new ContentValidationError('accounts.json: トップレベルは配列である必要があります');
	}
	return parsed.map((raw, i) => validateAccount(raw, `accounts.json[${i}]`));
}
