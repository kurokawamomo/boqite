/**
 * JournalTask（仕訳問題）用の純粋ロジック。
 * バリデーション: 借貸合計一致 / 同一科目は借方・貸方それぞれ1回まで（仕様書3章）。
 */
import type { JournalEntryLine, JournalTask } from '$lib/content/types';
import { roundValue } from '$lib/components/numpad/calculator';

export type JournalSide = 'debit' | 'credit';

export type EnteredLine = {
	account: string | null;
	amount: number | null;
};

export type EnteredJournal = {
	debit: EnteredLine[];
	credit: EnteredLine[];
};

const MAX_LINES = 4;

export function createEmptyEntry(): EnteredJournal {
	return {
		debit: [{ account: null, amount: null }],
		credit: [{ account: null, amount: null }]
	};
}

function sideLines(entry: EnteredJournal, side: JournalSide): EnteredLine[] {
	return side === 'debit' ? entry.debit : entry.credit;
}

function withSide(entry: EnteredJournal, side: JournalSide, lines: EnteredLine[]): EnteredJournal {
	return side === 'debit' ? { ...entry, debit: lines } : { ...entry, credit: lines };
}

export function setLineAccount(entry: EnteredJournal, side: JournalSide, index: number, account: string): EnteredJournal {
	const lines = sideLines(entry, side).map((line, i) => (i === index ? { ...line, account } : line));
	return withSide(entry, side, lines);
}

export function setLineAmount(entry: EnteredJournal, side: JournalSide, index: number, amount: number | null): EnteredJournal {
	const lines = sideLines(entry, side).map((line, i) => (i === index ? { ...line, amount } : line));
	return withSide(entry, side, lines);
}

export function addLine(entry: EnteredJournal, side: JournalSide): EnteredJournal {
	const lines = sideLines(entry, side);
	if (lines.length >= MAX_LINES) return entry;
	return withSide(entry, side, [...lines, { account: null, amount: null }]);
}

export function removeLine(entry: EnteredJournal, side: JournalSide, index: number): EnteredJournal {
	const lines = sideLines(entry, side);
	if (lines.length <= 1) return entry;
	return withSide(entry, side, lines.filter((_, i) => i !== index));
}

function isLineComplete(line: EnteredLine): line is { account: string; amount: number } {
	return line.account !== null && line.amount !== null && line.amount > 0;
}

export function lineSum(lines: EnteredLine[]): number {
	// 小数の金額を足すときの誤差（0.1+0.2 など）を丸める
	return roundValue(lines.reduce((sum, line) => sum + (line.amount ?? 0), 0));
}

export function hasDuplicateAccount(lines: EnteredLine[]): boolean {
	const accounts = lines.filter((l) => l.account !== null).map((l) => l.account);
	return new Set(accounts).size !== accounts.length;
}

export function canSubmit(entry: EnteredJournal): boolean {
	const debitComplete = entry.debit.every(isLineComplete);
	const creditComplete = entry.credit.every(isLineComplete);
	if (!debitComplete || !creditComplete) return false;
	if (hasDuplicateAccount(entry.debit) || hasDuplicateAccount(entry.credit)) return false;
	const debitSum = lineSum(entry.debit);
	const creditSum = lineSum(entry.credit);
	return debitSum > 0 && debitSum === creditSum;
}

function linesMatch(answer: JournalEntryLine[], entered: EnteredLine[]): boolean {
	const keyOf = (l: { account: string; amount: number }) => `${l.account}::${l.amount}`;
	const filled = entered.filter(isLineComplete);
	if (filled.length !== answer.length) return false;
	const sortedAnswer = [...answer].map(keyOf).sort();
	const sortedEntered = filled.map(keyOf).sort();
	return sortedAnswer.every((key, i) => key === sortedEntered[i]);
}

/** 借方・貸方それぞれ、正解行と入力行が順不同で一致するか */
export function checkAnswer(entry: EnteredJournal, task: JournalTask): boolean {
	return linesMatch(task.debit, entry.debit) && linesMatch(task.credit, entry.credit);
}

/* ------------------------------------------------------------------ *
 * 入力欄（スロット）の選択と、金額・科目の置き方
 * ------------------------------------------------------------------ */

export type SlotField = 'account' | 'amount';
export type Slot = { side: JournalSide; index: number; field: SlotField };

function isSameSlot(a: Slot, b: Slot): boolean {
	return a.side === b.side && a.index === b.index && a.field === b.field;
}

export function isSlotEmpty(entry: EnteredJournal, slot: Slot): boolean {
	const line = sideLines(entry, slot.side)[slot.index];
	if (!line) return false;
	return slot.field === 'account' ? line.account === null : line.amount === null;
}

/** 行内で 科目→金額 の順、行を終えたら次の行、借方を終えたら貸方、の読み順 */
export function slotOrder(entry: EnteredJournal): Slot[] {
	const order: Slot[] = [];
	for (const side of ['debit', 'credit'] as JournalSide[]) {
		sideLines(entry, side).forEach((_, index) => {
			order.push({ side, index, field: 'account' });
			order.push({ side, index, field: 'amount' });
		});
	}
	return order;
}

/** 指定スロットの直後（読み順で一周）から見て、最初に見つかる空欄 */
export function nextEmptySlotAfter(entry: EnteredJournal, from: Slot): Slot | null {
	const order = slotOrder(entry);
	const pos = order.findIndex((s) => isSameSlot(s, from));
	const rotated = pos === -1 ? order : [...order.slice(pos + 1), ...order.slice(0, pos + 1)];
	return rotated.find((s) => isSlotEmpty(entry, s)) ?? null;
}

/** 読み順で最初の空欄 */
export function firstEmptySlot(entry: EnteredJournal, field: SlotField): Slot | null {
	return slotOrder(entry).find((s) => s.field === field && isSlotEmpty(entry, s)) ?? null;
}

export type Placement = { entry: EnteredJournal; activeSlot: Slot | null };

/**
 * 金額を欄に入れる。選んでいる欄が金額欄ならそこへ、そうでなければ最初の空の金額欄へ。
 * 入れる欄が無ければ何も変えない（空の金額欄が尽きたあとに OK を押しても、入力済みの欄は書き換わらない）。
 * 入れたら、次の空欄を選ぶ。
 */
export function placeAmount(entry: EnteredJournal, activeSlot: Slot | null, amount: number): Placement {
	const target = activeSlot?.field === 'amount' ? activeSlot : firstEmptySlot(entry, 'amount');
	if (!target) return { entry, activeSlot };
	const next = setLineAmount(entry, target.side, target.index, amount);
	return { entry: next, activeSlot: nextEmptySlotAfter(next, target) };
}

/** 科目を欄に入れる。置き方は placeAmount と同じ */
export function placeAccount(entry: EnteredJournal, activeSlot: Slot | null, account: string): Placement {
	const target = activeSlot?.field === 'account' ? activeSlot : firstEmptySlot(entry, 'account');
	if (!target) return { entry, activeSlot };
	const next = setLineAccount(entry, target.side, target.index, account);
	return { entry: next, activeSlot: nextEmptySlotAfter(next, target) };
}
