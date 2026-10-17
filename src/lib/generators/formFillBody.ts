import type { Document } from '$lib/content/documents';
import { getCell } from '$lib/components/forms/refs';
import { isRecord } from '$lib/util/isRecord';
import type { FormBlank, FormFillTask } from '$lib/content/types';
import type { GeneratedBody } from './types';

/** 答えがすべて入った完成形の帳簿から、指定した ref の欄を空欄にした問題を作る（数値の欄だけ） */
export function formFillBody(args: {
	text: string;
	/** 空欄にする前の、答えが入った帳簿 */
	full: Document;
	refs: readonly string[];
	explanation: string;
}): GeneratedBody {
	const document: Document = JSON.parse(JSON.stringify(args.full));
	const blanks: FormBlank[] = args.refs.map((ref) => {
		const answer = getCell(args.full, ref);
		if (typeof answer !== 'number') throw new Error(`空欄 ${ref} が数値ではありません: ${String(answer)}`);
		clearCell(document, ref);
		return { ref, input: 'numpad', answer };
	});
	const task: FormFillTask = { kind: 'form_fill', document, blanks };
	return { stimulus: { text: args.text }, task, explanation: args.explanation };
}

/** ref の欄の値を null にする */
function clearCell(doc: Document, ref: string): void {
	const [rowKey, ...path] = ref.split('.');
	const data = doc.data as unknown as Record<string, unknown>;
	const rows = (['rows', 'debit', 'credit'] as const).flatMap((k) =>
		Array.isArray(data[k]) ? (data[k] as Array<{ key: string; cells: unknown }>) : []
	);
	const row = rows.find((r) => r.key === rowKey);
	if (!row) throw new Error(`行 ${rowKey} がありません`);
	let holder: unknown = row.cells;
	for (const segment of path.slice(0, -1)) {
		holder = Array.isArray(holder) ? holder[Number(segment)] : isRecord(holder) ? holder[segment] : undefined;
	}
	const last = path[path.length - 1];
	if (Array.isArray(holder)) holder[Number(last)] = null;
	else if (isRecord(holder)) holder[last] = null;
	else throw new Error(`欄 ${ref} がありません`);
}

/** 完成形の帳簿から、ref ごとの答えを集める */
export function answersOf(full: Document, refs: readonly string[]): Record<string, number> {
	return Object.fromEntries(refs.map((ref) => [ref, getCell(full, ref) as number]));
}

/** render が作った問題の空欄の正解が、答えの集まりと一致するか */
export function verifyBlanks(q: GeneratedBody, answers: Record<string, number>): boolean {
	if (q.task.kind !== 'form_fill') return false;
	const got = Object.fromEntries(q.task.blanks.map((b) => [b.ref, b.answer]));
	return JSON.stringify(Object.entries(got).sort()) === JSON.stringify(Object.entries(answers).sort());
}
