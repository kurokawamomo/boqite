import { defineGenerator, type GeneratedBody } from './types';
import { journalBody, verifyJournal, yen, type JournalAnswer } from './journalBody';
import { pick, rngFor } from './rng';

/**
 * U8-3「定率法」。未償却残高（取得原価 − 前年までの累計額）に償却率を掛ける。間接法。
 * 割り切れる組み合わせだけを出す。
 */

type Params = { asset: '備品' | '車両運搬具'; cost: number; rate: number; year: 1 | 2 | 3 };

const COSTS = [1000000, 1600000, 2000000, 2400000, 3000000, 4000000];
const RATES = [20, 25, 40, 50];
const ASSETS = ['備品', '車両運搬具'] as const;

/** 前年までの累計額と当期の償却額。割り切れなければ null */
function schedule(cost: number, rate: number, year: number): { accumulated: number; amount: number } | null {
	let book = cost;
	let accumulated = 0;
	for (let y = 1; y <= year; y++) {
		if ((book * rate) % 100 !== 0) return null;
		const dep = (book * rate) / 100;
		if (y === year) return { accumulated, amount: dep };
		accumulated += dep;
		book -= dep;
	}
	return null;
}

function sample(seed: number): Params {
	const rng = rngFor(seed);
	const rate = pick(rng, RATES);
	const year = pick(rng, [1, 2, 3] as const);
	const start = Math.floor(rng() * COSTS.length);
	for (let i = 0; i < COSTS.length; i++) {
		const cost = COSTS[(start + i) % COSTS.length];
		if (schedule(cost, rate, year)) return { asset: pick(rng, ASSETS), cost, rate, year };
	}
	return { asset: pick(rng, ASSETS), cost: 1000000, rate: 20, year: 1 };
}

function solve(p: Params): JournalAnswer {
	const { amount } = schedule(p.cost, p.rate, p.year)!;
	return {
		debit: [{ account: '減価償却費', amount }],
		credit: [{ account: '減価償却累計額', amount }]
	};
}

function render(p: Params): GeneratedBody {
	const { accumulated, amount } = schedule(p.cost, p.rate, p.year)!;
	const prior = p.year === 1 ? '' : `前年度までの減価償却累計額は${yen(accumulated)}。`;
	return journalBody({
		text: `${p.asset}（取得原価${yen(p.cost)}）について、定率法（償却率${p.rate}%）で${p.year}年目の減価償却を行う。${prior}間接法で記帳する。仕訳しよう。`,
		answer: solve(p),
		options: ['減価償却費', '減価償却累計額', p.asset, '修繕費'],
		explanation: `定率法は「未償却残高×償却率」。未償却残高は${yen(p.cost)}−${yen(accumulated)}＝${yen(p.cost - accumulated)}、これに${p.rate}%を掛けて${yen(amount)}。間接法だから、貸方は減価償却累計額だよ。`
	});
}

export const teiritsuGenerator = defineGenerator<Params, JournalAnswer>({
	id: 'b3-u08-n3-teiritsu',
	nodeId: 'b3-u08-n3',
	topic: '定率法',
	seeds: [301, 302, 303],
	sample,
	solve,
	render,
	verify: verifyJournal
});
