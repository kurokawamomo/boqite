import type { JournalEntryLine, JournalTask } from '$lib/content/types';
import type { GeneratedBody } from './types';

/** 仕訳問題の答え。借方・貸方の行 */
export type JournalAnswer = { debit: JournalEntryLine[]; credit: JournalEntryLine[] };

export function journalBody(args: {
	text: string;
	answer: JournalAnswer;
	options: string[];
	explanation: string;
}): GeneratedBody {
	const task: JournalTask = {
		kind: 'journal',
		debit: args.answer.debit,
		credit: args.answer.credit,
		accountOptions: args.options,
		amountInput: 'numpad'
	};
	return { stimulus: { text: args.text }, task, explanation: args.explanation };
}

/** render が作った仕訳問題の正解が、solve の答えと一致するか */
export function verifyJournal(q: GeneratedBody, answer: JournalAnswer): boolean {
	return (
		q.task.kind === 'journal' &&
		JSON.stringify(q.task.debit) === JSON.stringify(answer.debit) &&
		JSON.stringify(q.task.credit) === JSON.stringify(answer.credit)
	);
}

/** 金額を 3 桁区切りで文章に入れる */
export function yen(n: number): string {
	return `${n.toLocaleString('en-US')}円`;
}
