import { checkQuestion } from './checks';
import { assignNewAccounts } from './newAccounts';
import { isRecord } from '$lib/util/isRecord';
import { ContentValidationError, validateUnitFile } from '$lib/server/content/validate';

/**
 * 下書き（ノード ID → 問題の配列）を content/boki3 の JSON に取り込む。
 * 検査に通らない問題は取り込まず、理由つきで返す。通った問題は同じ ID の既存問題を置き換える。
 * 下書きの newAccounts は無視し、全問題の newAccounts をコースの並び順で付け直す。
 */

export type UnitJson = { unit: Record<string, unknown>; nodes: Array<Record<string, unknown>> };

export type DraftFile = { file: string; data: unknown };

export type Rejection = { file: string; nodeId: string; questionId: string; reasons: string[] };

export type ImportResult = {
	units: UnitJson[];
	/** 科目ごとに最初に使われたユニットの章番号（科目マスタの chapter に使う） */
	firstUseChapters: Map<string, number>;
	/** 取り込んだ問題の ID */
	accepted: string[];
	rejected: Rejection[];
};

type Question = Record<string, unknown>;

function questionsOf(node: Record<string, unknown>): Question[] {
	return Array.isArray(node.questions) ? (node.questions as Question[]) : [];
}

function isGenerated(q: Question): boolean {
	return isRecord(q.generated);
}

/** 1 問を読み込み時の検証に通す（構造の不備を拾う） */
function structuralError(q: Question, unit: UnitJson, node: Record<string, unknown>): string | null {
	try {
		validateUnitFile(
			{ unit: unit.unit, nodes: [{ id: node.id, title: node.title, questions: [q] }] },
			'draft.json'
		);
		return null;
	} catch (e) {
		if (e instanceof ContentValidationError) return `形式: ${e.message}`;
		throw e;
	}
}

export type ImportOptions = {
	/** 取り込み先のコースのノード ID の接頭辞（例: "b2-"）。ほかのコースのノードへの下書きは弾く */
	nodeIdPrefix?: string;
	/** 科目の初出を付けるコースの順（既定は content/courses.ts の順） */
	courseOrder?: readonly string[];
};

export function importDrafts(
	units: UnitJson[],
	drafts: DraftFile[],
	accountNames: ReadonlySet<string>,
	options: ImportOptions = {}
): ImportResult {
	const next: UnitJson[] = JSON.parse(JSON.stringify(units));
	const nodeIndex = new Map<string, { unit: UnitJson; node: Record<string, unknown> }>();
	for (const unit of next) for (const node of unit.nodes) nodeIndex.set(String(node.id), { unit, node });

	const rejected: Rejection[] = [];
	const accepted: Array<{ nodeId: string; q: Question; file: string }> = [];
	const reject = (file: string, nodeId: string, questionId: string, ...reasons: string[]) =>
		rejected.push({ file, nodeId, questionId, reasons });

	const draftIds = new Set<string>();
	for (const { file, data } of drafts) {
		if (!isRecord(data)) {
			reject(file, '(file)', '', 'トップレベルは「ノード ID → 問題の配列」のオブジェクトである必要があります');
			continue;
		}
		for (const [nodeId, rawQuestions] of Object.entries(data)) {
			const hit = nodeIndex.get(nodeId);
			if (hit && options.nodeIdPrefix && !nodeId.startsWith(options.nodeIdPrefix)) {
				reject(file, nodeId, '', `このノードは取り込み先のコース（${options.nodeIdPrefix}…）のものではありません`);
				continue;
			}
			if (!hit) {
				reject(file, nodeId, '', 'このノード ID は content にありません');
				continue;
			}
			if (!Array.isArray(rawQuestions)) {
				reject(file, nodeId, '', '問題は配列である必要があります');
				continue;
			}
			rawQuestions.forEach((raw, i) => {
				if (!isRecord(raw) || typeof raw.id !== 'string') {
					reject(file, nodeId, `(${i + 1}問目)`, '問題はオブジェクトで、文字列の id が必要です');
					return;
				}
				// 科目の初出は手で持たず、取り込みの最後に自動で付ける
				const { newAccounts: _ignored, ...q } = raw as Question;
				const id = q.id as string;
				const reasons: string[] = [];
				if (!id.startsWith(`${nodeId}-`)) reasons.push(`id が "${nodeId}-" で始まっていません`);
				if (draftIds.has(id)) reasons.push('id が下書きの中で重複しています');
				const structural = structuralError(q, hit.unit, hit.node);
				if (structural) reasons.push(structural);
				else {
					for (const issue of checkQuestion(q, accountNames)) reasons.push(`${issue.rule}: ${issue.message}`);
				}
				if (reasons.length > 0) {
					reject(file, nodeId, id, ...reasons);
					return;
				}
				draftIds.add(id);
				accepted.push({ nodeId, q, file });
			});
		}
	}

	// 他のノードにある同じ ID（置き換えではなく衝突）を弾く
	const existingIdNode = new Map<string, string>();
	for (const unit of next) {
		for (const node of unit.nodes) {
			for (const q of questionsOf(node)) existingIdNode.set(String(q.id), String(node.id));
		}
	}
	const afterId = accepted.filter(({ nodeId, q, file }) => {
		const owner = existingIdNode.get(q.id as string);
		if (owner && owner !== nodeId) {
			reject(file, nodeId, q.id as string, `id が別のノード ${owner} の問題と衝突しています`);
			return false;
		}
		return true;
	});

	// 置き換え: 手書きの既存問題（下書きと同じ ID を除く）、下書き、生成問題の順に並べる
	const byNode = new Map<string, Question[]>();
	for (const { nodeId, q } of afterId) byNode.set(nodeId, [...(byNode.get(nodeId) ?? []), q]);
	for (const [nodeId, drafted] of byNode) {
		const node = nodeIndex.get(nodeId)!.node;
		const ids = new Set(drafted.map((q) => q.id));
		const existing = questionsOf(node).filter((e) => !ids.has(e.id));
		node.questions = [...existing.filter((e) => !isGenerated(e)), ...drafted, ...existing.filter(isGenerated)];
	}

	const firstUseChapters = assignNewAccounts(next, accountNames, options.courseOrder);

	return {
		units: next,
		firstUseChapters,
		accepted: afterId.map((a) => a.q.id as string),
		rejected
	};
}
