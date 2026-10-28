import type { Document } from '$lib/content/documents';
import { defineGenerator, type GeneratedBody } from './types';
import { answersOf, formFillBody, verifyBlanks } from './formFillBody';
import { intBetween, pick, rngFor } from './rng';

/**
 * U18-3「精算表」。数値を差し替える型。残高試算表と決算整理事項（期末商品・貸倒引当金・減価償却）から、
 * 修正記入・損益計算書・貸借対照表の各欄を求める。空欄は 6 つ。
 */

type Params = {
	closingGoods: number;
	openingGoods: number;
	purchases: number;
	salary: number;
	receivable: number;
	allowanceRate: number;
	allowanceBefore: number;
	equipment: number;
	accumulatedPct: number;
	usefulLife: number;
	payables: number;
	capital: number;
	profitMargin: number;
	/** 空欄にする欄（候補の添字） */
	blankPicks: number[];
};

const K = 1000;

/** 乱数の取り出し位置をずらして、seed ごとの数値の並びを入れ替える */
const SEED_OFFSET = 40017;

type Side = { debit: number | null; credit: number | null };
type Line = { key: string; name: string; tb: Side; adj: Side; kind: 'PL' | 'BS' };

const none: Side = { debit: null, credit: null };
const d = (n: number): Side => ({ debit: n || null, credit: null });
const c = (n: number): Side => ({ debit: null, credit: n || null });

function derive(p: Params) {
	const requiredAllowance = (p.receivable * p.allowanceRate) / 100;
	const provision = requiredAllowance - p.allowanceBefore;
	const depreciation = p.equipment / p.usefulLife;
	const accumulated = (p.equipment * p.accumulatedPct) / 100;
	const cogs = p.openingGoods + p.purchases - p.closingGoods;
	const expenses = cogs + p.salary + provision + depreciation;
	const sales = Math.ceil(expenses / K) * K + p.profitMargin;
	const nonCash = p.receivable + p.openingGoods + p.equipment + p.purchases + p.salary;
	const credits = p.payables + p.allowanceBefore + accumulated + sales + p.capital;
	const cash = credits - nonCash;
	return { provision, depreciation, accumulated, sales, cash, expenses };
}

function lines(p: Params): Line[] {
	const x = derive(p);
	return [
		{ key: 'r-cash', name: '現金', tb: d(x.cash), adj: none, kind: 'BS' },
		{ key: 'r-ar', name: '売掛金', tb: d(p.receivable), adj: none, kind: 'BS' },
		{ key: 'r-goods', name: '繰越商品', tb: d(p.openingGoods), adj: { debit: p.closingGoods, credit: p.openingGoods }, kind: 'BS' },
		{ key: 'r-equip', name: '備品', tb: d(p.equipment), adj: none, kind: 'BS' },
		{ key: 'r-ap', name: '買掛金', tb: c(p.payables), adj: none, kind: 'BS' },
		{ key: 'r-allow', name: '貸倒引当金', tb: c(p.allowanceBefore), adj: c(x.provision), kind: 'BS' },
		{ key: 'r-accum', name: '減価償却累計額', tb: c(x.accumulated), adj: c(x.depreciation), kind: 'BS' },
		{ key: 'r-cap', name: '資本金', tb: c(p.capital), adj: none, kind: 'BS' },
		{ key: 'r-sales', name: '売上', tb: c(x.sales), adj: none, kind: 'PL' },
		{ key: 'r-purchase', name: '仕入', tb: d(p.purchases), adj: { debit: p.openingGoods, credit: p.closingGoods }, kind: 'PL' },
		{ key: 'r-salary', name: '給料', tb: d(p.salary), adj: none, kind: 'PL' },
		{ key: 'r-bad', name: '貸倒引当金繰入', tb: none, adj: d(x.provision), kind: 'PL' },
		{ key: 'r-dep', name: '減価償却費', tb: none, adj: d(x.depreciation), kind: 'PL' }
	];
}

/** 修正記入のあとの残高を、借方か貸方の片側に置く */
function settle(l: Line): Side {
	const bal = (l.tb.debit ?? 0) + (l.adj.debit ?? 0) - (l.tb.credit ?? 0) - (l.adj.credit ?? 0);
	return bal >= 0 ? d(bal) : c(-bal);
}

const sum = (sides: Side[], k: 'debit' | 'credit') => sides.reduce((s, x) => s + (x[k] ?? 0), 0);

/** 空欄にできる欄の候補（答えが入った帳簿のすべての数値の欄から、決算整理に関わるもの） */
const CANDIDATES = [
	'r-goods.adjustment.debit',
	'r-goods.balanceSheet.debit',
	'r-purchase.adjustment.debit',
	'r-purchase.adjustment.credit',
	'r-purchase.incomeStatement.debit',
	'r-allow.adjustment.credit',
	'r-allow.balanceSheet.credit',
	'r-accum.adjustment.credit',
	'r-accum.balanceSheet.credit',
	'r-bad.adjustment.debit',
	'r-bad.incomeStatement.debit',
	'r-dep.adjustment.debit',
	'r-dep.incomeStatement.debit',
	'r-ni.incomeStatement.debit',
	'r-ni.balanceSheet.credit',
	'r-total.incomeStatement.credit',
	'r-total.balanceSheet.debit'
];

export function fullWorksheet(p: Params): Document {
	const ls = lines(p);
	const settled = ls.map(settle);
	const isSides = ls.map((l, i) => (l.kind === 'PL' ? settled[i] : none));
	const bsSides = ls.map((l, i) => (l.kind === 'BS' ? settled[i] : none));
	const profit = sum(isSides, 'credit') - sum(isSides, 'debit');

	const rows = ls.map((l, i) => ({
		key: l.key,
		cells: {
			accountName: l.name,
			trialBalance: l.tb,
			adjustment: l.adj,
			incomeStatement: isSides[i],
			balanceSheet: bsSides[i]
		}
	}));
	const total = (pick: (l: Line, i: number) => Side, extra: Side = none): Side => {
		const all = ls.map(pick).concat(extra);
		return { debit: sum(all, 'debit') || null, credit: sum(all, 'credit') || null };
	};
	rows.push({
		key: 'r-ni',
		role: 'net_income',
		cells: { accountName: '当期純利益', trialBalance: none, adjustment: none, incomeStatement: d(profit), balanceSheet: c(profit) }
	} as (typeof rows)[number]);
	rows.push({
		key: 'r-total',
		role: 'total',
		ruledAfter: 'double',
		cells: {
			accountName: '合　計',
			trialBalance: total((l) => l.tb),
			adjustment: total((l) => l.adj),
			incomeStatement: total((_, i) => isSides[i], d(profit)),
			balanceSheet: total((_, i) => bsSides[i], c(profit))
		}
	} as (typeof rows)[number]);
	return { type: 'worksheet', data: { header: { title: '精算表' }, rows } } as Document;
}

export function sample(seed: number): Params {
	const rng = rngFor(seed + SEED_OFFSET);
	const picks = new Set<number>();
	while (picks.size < 6) picks.add(Math.floor(rng() * CANDIDATES.length));
	const receivable = intBetween(rng, 20, 60) * 100;
	const rate = pick(rng, [2, 3, 5]);
	const required = (receivable * rate) / 100;
	return {
		closingGoods: intBetween(rng, 5, 18) * K,
		openingGoods: intBetween(rng, 5, 15) * K,
		purchases: intBetween(rng, 40, 90) * K,
		salary: intBetween(rng, 5, 12) * K,
		receivable,
		allowanceRate: rate,
		allowanceBefore: pick(rng, [0, Math.floor(required / 2 / 10) * 10]),
		equipment: intBetween(rng, 3, 8) * 10 * K,
		accumulatedPct: pick(rng, [10, 20, 30, 40]),
		usefulLife: pick(rng, [4, 5, 10]),
		payables: intBetween(rng, 10, 30) * K,
		capital: intBetween(rng, 300, 600) * K,
		profitMargin: intBetween(rng, 5, 40) * K,
		blankPicks: [...picks].sort((a, b) => a - b)
	};
}

const refsOf = (p: Params) => p.blankPicks.map((i) => CANDIDATES[i]);

function solve(p: Params): Record<string, number> {
	return answersOf(fullWorksheet(p), refsOf(p));
}

function render(p: Params): GeneratedBody {
	const x = derive(p);
	const text = `次の決算整理事項にもとづいて、精算表の空欄を埋めよう。(1)期末商品の棚卸高は${p.closingGoods}円。(2)期末の売掛金残高の${p.allowanceRate}%を貸倒れと見積もり、差額補充法で貸倒引当金を設定する。(3)備品は耐用年数${p.usefulLife}年、残存価額ゼロの定額法で減価償却する（間接法）。`;
	return formFillBody({
		text,
		full: fullWorksheet(p),
		refs: refsOf(p),
		explanation: `期末商品は、仕入の貸方に${p.closingGoods}円、繰越商品の借方に${p.closingGoods}円。貸倒引当金は${p.receivable}円×${p.allowanceRate}%＝${x.provision + p.allowanceBefore}円から残高${p.allowanceBefore}円を引いた${x.provision}円。減価償却費は${p.equipment}円÷${p.usefulLife}年＝${x.depreciation}円。費用と収益は損益計算書へ、資産・負債・純資産は貸借対照表へ移して、差額が当期純利益だよ。`
	});
}

export const seisanGenerator = defineGenerator<Params, Record<string, number>>({
	id: 'b3-u18-n3-seisan',
	nodeId: 'b3-u18-n3',
	topic: '精算表',
	seeds: [1001, 1002, 1003],
	sample,
	solve,
	render,
	verify: verifyBlanks
});
