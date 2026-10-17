import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import type { JournalTask } from '$lib/content/types';
import InputSheet from '$lib/components/forms/InputSheet.svelte';
import { createInitialCalcState, reduceCalc, settleCalc, type CalcKey } from '$lib/components/numpad/calculator';
import CalcForm from './CalcForm.svelte';
import JournalForm from './JournalForm.svelte';

const journalTask = (amountInput: JournalTask['amountInput']): JournalTask => ({
	kind: 'journal',
	debit: [{ account: '現金', amount: 100 }],
	credit: [{ account: '資本金', amount: 100 }],
	accountOptions: ['現金', '資本金'],
	amountInput
});

describe('電卓の小数点キー', () => {
	it('0・00・「.」のキーがこの順で並び、「0」は 1 マス', () => {
		const { body } = render(CalcForm, { props: { task: { kind: 'calc', answer: 5 }, onsubmit: () => {} } });
		const keys = [...body.matchAll(/<button[^>]*class="key[^"]*"[^>]*>\s*([^<\s]+)\s*<\/button>/g)].map((m) => m[1]);
		expect(keys.slice(-3)).toEqual(['0', '00', '.']);
		expect(body).not.toContain('class="key zero');
	});
});

describe('電卓入力の「=」確定', () => {
	it('仕訳の電卓入力は「=」で確定し、OK ボタンはない', () => {
		const { body } = render(JournalForm, { props: { task: journalTask('numpad'), onsubmit: () => {} } });
		expect(body).toMatch(/class="key[^"]*equals"/);
		expect(body).not.toContain('numpad-ok');
		expect(body).not.toMatch(/>\s*OK\s*</);
	});

	it('仕訳のチップ入力には電卓がない', () => {
		const { body } = render(JournalForm, { props: { task: journalTask('chips'), onsubmit: () => {} } });
		expect(body).not.toContain('class="numpad');
	});

	it('計算問題は数字を入れる前は「こたえる」が押せない', () => {
		const { body } = render(CalcForm, { props: { task: { kind: 'calc', answer: 5 }, onsubmit: () => {} } });
		expect(body).toMatch(/<button[^>]*class="submit[^"]*"[^>]*disabled/);
	});
});

describe('電卓の表示が「=」で確定したあとも残る', () => {
	const typed = (keys: CalcKey[]) => settleCalc(keys.reduce(reduceCalc, createInitialCalcState()));

	it('様式の穴埋め: 電卓の状態を渡すと、次の空欄の電卓が前の値を表示する', () => {
		const calc = typed(['5', '0', '0', '0', '0']);
		const { body } = render(InputSheet, {
			props: {
				blank: { ref: 'r2.credit', input: 'numpad', answer: 50000 },
				label: '貸方',
				calc,
				onCommit: () => {},
				onCancel: () => {}
			}
		});
		expect(body).toContain('50,000');
	});

	it('様式の穴埋め: 状態が初期なら 0 を表示する', () => {
		const { body } = render(InputSheet, {
			props: {
				blank: { ref: 'r2.credit', input: 'numpad', answer: 1 },
				label: '貸方',
				calc: createInitialCalcState(),
				onCommit: () => {},
				onCancel: () => {}
			}
		});
		expect(body).not.toContain('50,000');
	});
});
