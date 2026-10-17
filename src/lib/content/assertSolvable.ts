import { render } from 'svelte/server';
import { expect } from 'vitest';
import LessonSession from '$lib/components/lesson/LessonSession.svelte';
import FormFillBody from '$lib/components/forms/FormFillBody.svelte';
import { labelForCell, renderedCellRefs } from '$lib/components/forms/formColumns';
import { getCell } from '$lib/components/forms/refs';
import { checkFormFillAnswers } from '$lib/components/lesson/formFill';
import {
	addLine,
	canSubmit,
	checkAnswer,
	createEmptyEntry,
	setLineAccount,
	setLineAmount,
	type EnteredJournal,
	type JournalSide
} from '$lib/components/lesson/journal';
import { type CalcKey, createInitialCalcState, reduceCalc } from '$lib/components/numpad/calculator';
import { blankOptions, type FormBlank, type FormFillTask, type Question } from './types';

/**
 * 問題の「解き切れる」検査。実コンテンツの検査（solvable.test）と生成器の property テストが共有する。
 * 画面（SSR 描画）に出る入力欄の数と、電卓・選択肢で正解を入力できるかを確かめる。
 */


/** 電卓のキー列として数値を打ち込み、「=」で確定した値を返す */
export function typeOnCalculator(target: number): number {
	const digits = String(Math.abs(target)).split('') as CalcKey[];
	const keys: CalcKey[] = target < 0 ? ['0', '-', ...digits, '='] : [...digits, '='];
	const state = keys.reduce(reduceCalc, createInitialCalcState());
	return Number(state.display);
}

function countRenderedBlanks(task: FormFillTask): number {
	const { body } = render(FormFillBody, { props: { task } });
	return body.match(/<button[^>]*class="blank-btn/g)?.length ?? 0;
}

function canInput(blank: FormBlank): boolean {
	if (blank.input === 'numpad') return typeOnCalculator(blank.answer) === blank.answer;
	return blankOptions(blank)?.includes(blank.answer) ?? false;
}

function solveJournal(task: Extract<Question['task'], { kind: 'journal' }>): EnteredJournal {
	let entry = createEmptyEntry();
	for (const side of ['debit', 'credit'] as JournalSide[]) {
		task[side].forEach((line, i) => {
			if (i > 0) entry = addLine(entry, side);
			entry = setLineAccount(entry, side, i, line.account);
			entry = setLineAmount(entry, side, i, line.amount);
		});
	}
	return entry;
}

/** 問題 1 問を、正解どおりに入力して解き切れることを確かめる（失敗は expect が投げる） */
export function assertSolvable(q: Question): void {
	const task = q.task;

	if (task.kind === 'form_fill') {
		const rendered = renderedCellRefs(task.document);
		const refs = task.blanks.map((b) => b.ref);

		expect(new Set(refs).size, '空欄 ref の重複').toBe(refs.length);
		for (const blank of task.blanks) {
			expect(getCell(task.document, blank.ref), `${blank.ref} は null セル`).toBeNull();
			expect(rendered.has(blank.ref), `${blank.ref} が画面に描画されるセル`).toBe(true);
			expect(canInput(blank), `${blank.ref} の正解を入力できる`).toBe(true);
		}

		for (const blank of task.blanks) {
			const label = labelForCell(task.document, blank.ref);
			expect(label, `${blank.ref} の見出し`).toBeTruthy();
			expect(label, `${blank.ref} の見出しに ref の生文字が出ない`).not.toMatch(/[A-Za-z]|\d/);
		}

		expect(countRenderedBlanks(task), '空欄数 == 描画される入力欄数').toBe(task.blanks.length);

		const answers = Object.fromEntries(task.blanks.map((b) => [b.ref, b.answer]));
		expect(checkFormFillAnswers(answers, task.blanks)).toBe(true);
	}

	if (task.kind === 'journal') {
		for (const line of [...task.debit, ...task.credit]) {
			expect(task.accountOptions, `科目 ${line.account} が選択肢にある`).toContain(line.account);
			expect(typeOnCalculator(line.amount), `金額 ${line.amount} を電卓で入力できる`).toBe(line.amount);
		}
		const entry = solveJournal(task);
		expect(canSubmit(entry)).toBe(true);
		expect(checkAnswer(entry, task)).toBe(true);
	}

	if (task.kind === 'calc') {
		expect(typeOnCalculator(task.answer)).toBe(task.answer);
	}

	if (task.kind === 'choice') {
		expect(task.options[task.answerIndex]).toBeDefined();
	}

	if (task.kind === 'match') {
		expect(task.pairs.length).toBeGreaterThan(0);
	}
}

/** 図つきの問題が、画面に図を描き、form_fill なら図に正解が入っていないことを確かめる */
export function assertStimulusDocument(q: Question): void {
	const { body } = render(LessonSession, { props: { questions: [q] } });
	expect(body, '問題文の図が描画される').toContain('<table');

	const doc = q.stimulus.document;
	if (q.task.kind !== 'form_fill' || !doc) return;
	for (const blank of q.task.blanks) {
		expect(getCell(doc, blank.ref), `${blank.ref} に正解が入っている`).not.toBe(blank.answer);
	}
}
