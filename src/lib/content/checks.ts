import { renderedCellRefs } from '$lib/components/forms/formColumns';
import { getCell } from '$lib/components/forms/refs';
import { MAX_DIGITS } from '$lib/components/numpad/calculator';
import { blankOptions, type FormBlank } from '$lib/content/types';
import { DOCUMENT_TYPES } from '$lib/content/documents';
import type { Document } from '$lib/content/documents';
import { isRecord } from '$lib/util/isRecord';

/**
 * 問題 1 問ぶんの整合性検査。check-content（JSON 全体）と、生成器の property テスト
 * （生成した問題）が同じ検査を使う。
 */

export type CheckIssue = { rule: string; message: string };

/** 問題文が単独で読めない言い回し。前の問題・上の資料に頼る文は、順序が変わる復習で成り立たない */
const NON_STANDALONE_PHRASES = ['上記', '先ほど', 'さきほど', '前問', '前の問題', '上と同じ', '前述', '下記'];

export function checkQuestion(q: Record<string, unknown>, accountNames: ReadonlySet<string>): CheckIssue[] {
	const issues: CheckIssue[] = [];
	const push = (rule: string, message: string) => issues.push({ rule, message });
	checkTask(q, push, accountNames as Set<string>);
	checkStandalone(q, push);
	return issues;
}

function checkStandalone(q: Record<string, unknown>, push: (rule: string, message: string) => void) {
	const text = isRecord(q.stimulus) && typeof q.stimulus.text === 'string' ? q.stimulus.text : '';
	for (const phrase of NON_STANDALONE_PHRASES) {
		if (text.includes(phrase)) {
			push('stimulus-not-standalone', `問題文に「${phrase}」があり、単独では読めません`);
		}
	}
}

function checkTask(
	q: Record<string, unknown>,
	push: (rule: string, message: string) => void,
	accountNames: Set<string>
) {
	const task = isRecord(q.task) ? q.task : undefined;
	if (!task) return;

	if (task.kind === 'journal') {
		const debit = Array.isArray(task.debit) ? (task.debit as Array<Record<string, unknown>>) : [];
		const credit = Array.isArray(task.credit) ? (task.credit as Array<Record<string, unknown>>) : [];
		const accountOptions = Array.isArray(task.accountOptions)
			? (task.accountOptions as unknown[]).filter((a): a is string => typeof a === 'string')
			: [];

		// 1. 借貸合計一致
		const debitSum = debit.reduce((s, l) => s + toNumber(l.amount), 0);
		const creditSum = credit.reduce((s, l) => s + toNumber(l.amount), 0);
		if (debitSum !== creditSum) {
			push('journal-balance', `借方合計(${debitSum}) !== 貸方合計(${creditSum})`);
		}

		// 2. 正解科目が accountOptions に全て含まれる
		for (const line of [...debit, ...credit]) {
			const account = typeof line.account === 'string' ? line.account : undefined;
			if (account && !accountOptions.includes(account)) {
				push('journal-options-missing-answer', `正解科目 "${account}" が accountOptions に含まれていません`);
			}
		}

		// 3. accountOptions / 正解科目が accounts.json に実在
		const allNamesUsed = new Set<string>(accountOptions);
		for (const line of [...debit, ...credit]) {
			if (typeof line.account === 'string') allNamesUsed.add(line.account);
		}
		for (const name of allNamesUsed) {
			if (!accountNames.has(name)) {
				push('journal-unknown-account', `科目 "${name}" が accounts.json に存在しません`);
			}
		}

		// 4. 同一科目の借方内・貸方内それぞれでの重複なし
		checkSideDuplicates(debit, '借方', push);
		checkSideDuplicates(credit, '貸方', push);
	}

	if (task.kind === 'choice') {
		const options = Array.isArray(task.options) ? task.options : [];
		const answerIndex = task.answerIndex;
		if (
			typeof answerIndex !== 'number' ||
			answerIndex < 0 ||
			answerIndex >= options.length
		) {
			push('choice-answer-index', `answerIndex(${String(answerIndex)}) が options(${options.length}件) の範囲外です`);
		}
	}

	if (task.kind === 'match') {
		const pairs = Array.isArray(task.pairs) ? task.pairs : [];
		if (pairs.length === 0) {
			push('match-empty-pairs', 'pairs が空です');
		}
	}

	if (task.kind === 'form_fill') {
		checkFormFill(task, isRecord(q.stimulus) ? q.stimulus.document : undefined, push);
	}
}

function checkFormFill(
	task: Record<string, unknown>,
	stimulusDocument: unknown,
	push: (rule: string, message: string) => void
) {
	const document = isRecord(task.document) ? (task.document as unknown as Document) : undefined;
	if (!document) return;

	// 12. document.type が実在様式
	if (!DOCUMENT_TYPES.includes(document.type)) {
		push('form-fill-unknown-document-type', `document.type "${String(document.type)}" が不正です（許可値: ${DOCUMENT_TYPES.join(', ')}）`);
	}

	const blanks = Array.isArray(task.blanks) ? (task.blanks as Array<Record<string, unknown>>) : [];
	const rendered = renderedCellRefs(document);
	const seenRefs = new Set<string>();
	for (const blank of blanks) {
		const ref = typeof blank.ref === 'string' ? blank.ref : undefined;
		if (!ref) {
			push('form-fill-blank-missing-ref', '空欄に "ref" がありません');
			continue;
		}

		// 16. stimulus.document に正解が書き込まれていない
		if (isRecord(stimulusDocument)) {
			const shown = getCell(stimulusDocument as unknown as Document, ref);
			if (shown !== undefined && shown !== null && shown === blank.answer) {
				push('form-fill-stimulus-leaks-answer', `stimulus.document の "${ref}" に正解 ${JSON.stringify(blank.answer)} が書き込まれています`);
			}
		}

		// 14. ref の重複なし
		if (seenRefs.has(ref)) {
			push('form-fill-duplicate-ref', `blank.ref "${ref}" が重複しています`);
		}
		seenRefs.add(ref);

		// 9. ref が実在するセルを指す / 10. ref 先セルの値が null
		const cell = getCell(document, ref);
		if (cell === undefined) {
			push('form-fill-ref-not-found', `blank.ref "${ref}" が document に実在するセルを指していません`);
		} else if (cell !== null) {
			push('form-fill-ref-not-blank', `blank.ref "${ref}" 先のセルが null ではありません（値=${JSON.stringify(cell)}）`);
		}

		// 13. ref が画面に描画されるセルを指す
		if (cell !== undefined && !rendered.has(ref)) {
			push(
				'form-fill-ref-not-rendered',
				`blank.ref "${ref}" のセルは ${document.type} の画面に描画されません（入力欄が出ず判定に進めない）。formColumns.ts の列定義を確認してください`
			);
		}

		// 15. numpad の answer が電卓で入力できる
		if (blank.input === 'numpad' && !isTypeableAmount(blank.answer)) {
			push('form-fill-numpad-answer', `blank.ref "${ref}" の answer(${String(blank.answer)}) は電卓で入力できる整数ではありません`);
		}

		// 11. choice/chips/account_picker の選択肢が answer を含む
		if (blank.input === 'choice' || blank.input === 'chips' || blank.input === 'account_picker') {
			const options = blankOptions(blank as unknown as FormBlank);
			if (!options || !options.includes(blank.answer as string | number)) {
				push(
					'form-fill-options-missing-answer',
					`blank.ref "${ref}" の選択肢(${blank.input})が answer "${String(blank.answer)}" を含んでいません`
				);
			}
		}
	}
}

function checkSideDuplicates(
	lines: Array<Record<string, unknown>>,
	sideLabel: string,
	push: (rule: string, message: string) => void
) {
	const seen = new Set<string>();
	for (const line of lines) {
		const account = typeof line.account === 'string' ? line.account : undefined;
		if (!account) continue;
		if (seen.has(account)) {
			push('journal-duplicate-account', `${sideLabel}に同一科目 "${account}" が複数回登場しています`);
		}
		seen.add(account);
	}
}

function isTypeableAmount(v: unknown): boolean {
	return typeof v === 'number' && Number.isInteger(v) && String(Math.abs(v)).length <= MAX_DIGITS;
}

function toNumber(v: unknown): number {
	return typeof v === 'number' && !Number.isNaN(v) ? v : 0;
}

/** 科目の初出紹介（newAccounts）が、コース全体で 1 回だけで、マスタに実在するか */
export function checkNewAccounts(
	q: Record<string, unknown>,
	file: string,
	nodeId: string,
	questionId: string,
	accountNames: ReadonlySet<string>,
	firstIntroducedBy: Map<string, { file: string; nodeId: string; questionId: string }>,
	push: (rule: string, message: string) => void
) {
	const newAccounts = Array.isArray(q.newAccounts) ? q.newAccounts : undefined;
	if (!newAccounts) return;

	for (const name of newAccounts) {
		if (typeof name !== 'string') continue;

		if (!accountNames.has(name)) {
			push('new-account-unknown', `newAccounts の科目 "${name}" が accounts.json に存在しません`);
			continue;
		}

		const existing = firstIntroducedBy.get(name);
		if (existing) {
			push(
				'new-account-duplicate-introduction',
				`科目 "${name}" は既に [${existing.file}] ${existing.nodeId}/${existing.questionId} で初出紹介済みです（重複紹介）`
			);
		} else {
			firstIntroducedBy.set(name, { file, nodeId, questionId });
		}
	}
}
