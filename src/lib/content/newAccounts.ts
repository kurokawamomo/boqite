import { isRecord } from '$lib/util/isRecord';
import { INTERNAL_COURSE_ORDER } from './courses';

/**
 * 科目の初出（newAccounts）は手で持たず、コースの並び順で最初に使った問題に自動で付ける。
 * 「使う」は、答えに現れる科目（仕訳の借方・貸方、様式の科目選択欄の正解）。選択肢のダミーは数えない。
 */

type Unit = { unit: Record<string, unknown>; nodes: Array<Record<string, unknown>> };
type Question = Record<string, unknown>;

function linesOf(task: Record<string, unknown>, side: 'debit' | 'credit'): string[] {
	const lines = task[side];
	if (!Array.isArray(lines)) return [];
	return lines.flatMap((l) => (isRecord(l) && typeof l.account === 'string' ? [l.account] : []));
}

/** 問題の答えに現れる科目（出てくる順、重複なし） */
export function accountsUsedBy(q: Question): string[] {
	const task = isRecord(q.task) ? q.task : undefined;
	if (!task) return [];
	let used: string[] = [];
	if (task.kind === 'journal') {
		used = [...linesOf(task, 'debit'), ...linesOf(task, 'credit')];
	} else if (task.kind === 'form_fill' && Array.isArray(task.blanks)) {
		used = task.blanks.flatMap((b) =>
			isRecord(b) && b.input === 'account_picker' && typeof b.answer === 'string' ? [b.answer] : []
		);
	}
	return [...new Set(used)];
}

/**
 * 全問題の newAccounts を、コースの並び順（章番号、ノード、問題の順）で付け直す。
 * コースが複数あるときは、courseOrder の順（既定は日商3級、日商2級）に数える。
 * units は書き換える。マスタにない科目には付けない。
 * 戻り値は、科目ごとに最初に使われたユニットの章番号（科目マスタの chapter に使う）。
 */
export function assignNewAccounts(
	units: Unit[],
	accountNames: ReadonlySet<string>,
	courseOrder: readonly string[] = INTERNAL_COURSE_ORDER
): Map<string, number> {
	const firstUseChapter = new Map<string, number>();
	const rank = (u: Unit) => {
		const i = courseOrder.indexOf(String(u.unit.course));
		return i === -1 ? courseOrder.length : i;
	};
	// コースの順、その中は章番号の順
	const ordered = [...units].sort((a, b) => rank(a) - rank(b) || Number(a.unit.chapter) - Number(b.unit.chapter));
	for (const unit of ordered) {
		for (const node of unit.nodes) {
			if (!Array.isArray(node.questions)) continue;
			for (const q of node.questions as Question[]) {
				const fresh = accountsUsedBy(q).filter((a) => accountNames.has(a) && !firstUseChapter.has(a));
				for (const a of fresh) firstUseChapter.set(a, Number(unit.unit.chapter));
				delete q.newAccounts;
				if (fresh.length > 0) q.newAccounts = fresh;
			}
		}
	}
	return firstUseChapter;
}
