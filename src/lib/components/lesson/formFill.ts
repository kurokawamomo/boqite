import type { FormBlank } from '$lib/content/types';
import type { Document } from '$lib/content/documents';
import { labelForCell } from '$lib/components/forms/formColumns';

export type FormFillAnswers = Record<string, string | number>;

export type WrongBlank = {
	ref: string;
	/** 欄名（様式の列定義から引いた見出し） */
	label: string;
	correctAnswer: string | number;
};

/** 全blankが一致していれば正解 */
export function checkFormFillAnswers(answers: FormFillAnswers, blanks: FormBlank[]): boolean {
	return blanks.every((b) => answers[b.ref] === b.answer);
}

/** 誤っていた欄を欄名・正答つきで返す（JudgmentSheet表示用） */
export function findWrongBlanks(answers: FormFillAnswers, blanks: FormBlank[], document: Document): WrongBlank[] {
	return blanks
		.filter((b) => answers[b.ref] !== b.answer)
		.map((b) => ({ ref: b.ref, label: labelForCell(document, b.ref) ?? '', correctAnswer: b.answer }));
}
