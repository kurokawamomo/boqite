import type { JournalTask } from '$lib/content/types';
import { defineGenerator, type GeneratedBody } from './types';
import { intBetween, pick, rngFor } from './rng';

/**
 * U8-2「定額法の月割」。決算日は3月31日。期首に買った場合は12か月、
 * 期中に買った場合は買った月から決算月までを月割にする（間接法）。
 */

type Params = {
	asset: '備品' | '建物' | '車両運搬具';
	usefulLife: number;
	/** 1年分の償却額（12 の倍数にして、月割が割り切れるようにする） */
	annual: number;
	residual: number;
	/** 取得した月（1〜12）。4 なら期首 */
	acquiredMonth: number;
};

type Answer = { months: number; amount: number };

const ASSETS = ['備品', '建物', '車両運搬具'] as const;
const LIVES = [4, 5, 6, 8, 10] as const;
const DISTRACTORS: Record<Params['asset'], string> = {
	備品: '修繕費',
	建物: '修繕費',
	車両運搬具: '修繕費'
};

function sample(seed: number): Params {
	const rng = rngFor(seed);
	return {
		asset: pick(rng, ASSETS),
		usefulLife: pick(rng, LIVES),
		annual: intBetween(rng, 5, 40) * 120,
		residual: pick(rng, [0, 0, 100, 200, 500]),
		acquiredMonth: pick(rng, [4, 4, 5, 7, 9, 10, 12, 1, 2])
	};
}

function monthsInFirstYear(acquiredMonth: number): number {
	return acquiredMonth >= 4 ? 16 - acquiredMonth : 4 - acquiredMonth;
}

function cost(p: Params): number {
	return p.annual * p.usefulLife + p.residual;
}

function solve(p: Params): Answer {
	const months = monthsInFirstYear(p.acquiredMonth);
	return { months, amount: (p.annual / 12) * months };
}

function stimulus(p: Params): string {
	const residual = p.residual === 0 ? '残存価額ゼロ' : `残存価額${p.residual}円`;
	const acquired =
		p.acquiredMonth === 4 ? '期首（4月1日）に' : `${p.acquiredMonth}月1日に`;
	return `${acquired}${p.asset}${cost(p)}円を購入していた（耐用年数${p.usefulLife}年、${residual}）。決算日は3月31日、定額法・間接法で、購入した年度の減価償却を月割で行う。仕訳しよう。`;
}

function render(p: Params): GeneratedBody {
	const { months, amount } = solve(p);
	const task: JournalTask = {
		kind: 'journal',
		debit: [{ account: '減価償却費', amount }],
		credit: [{ account: '減価償却累計額', amount }],
		accountOptions: ['減価償却費', '減価償却累計額', p.asset, DISTRACTORS[p.asset]],
		amountInput: 'numpad'
	};
	return {
		stimulus: { text: stimulus(p) },
		task,
		explanation: `1年分は(${cost(p)}円 − ${p.residual}円)÷${p.usefulLife}年＝${p.annual}円。${months}か月ぶんなので${p.annual}円×${months}／12＝${amount}円。間接法だから、${p.asset}は減らさず減価償却累計額を貸方に置くよ。`
	};
}

function verify(q: GeneratedBody, answer: Answer): boolean {
	return (
		q.task.kind === 'journal' &&
		q.task.debit[0].amount === answer.amount &&
		q.task.credit[0].amount === answer.amount
	);
}

export const teigakuGenerator = defineGenerator<Params, Answer>({
	id: 'b3-u08-n2-teigaku',
	nodeId: 'b3-u08-n2',
	topic: '定額法の月割',
	seeds: [201, 202, 203],
	sample,
	solve,
	render,
	verify
});
