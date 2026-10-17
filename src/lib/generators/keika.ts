import { defineGenerator, type AnyGenerator, type GeneratedBody } from './types';
import { journalBody, verifyJournal, yen, type JournalAnswer } from './journalBody';
import { intBetween, pick, rngFor } from './rng';

/**
 * U13「経過勘定の月割」。決算日は3月31日（会計期間は4月〜3月）。
 * n1 前払費用: 期中に払った数か月分のうち、翌期にかかる分を前払へ振り替える。
 * n2 未払費用: まだ払っていないが、当期にかかっている分を未払へ計上する。
 */

const ITEMS = [
	{ expense: '支払家賃', name: '家賃', prepaid: '前払家賃', accrued: '未払家賃' },
	{ expense: '支払保険料', name: '保険料', prepaid: '前払保険料', accrued: '未払保険料' },
	{ expense: '支払地代', name: '地代', prepaid: '前払地代', accrued: '未払地代' }
] as const;

type Item = (typeof ITEMS)[number];

/* ---- 前払費用 ---- */

type PrepaidParams = { item: Item; payMonth: number; term: number; monthly: number };

/** 翌期にかかる月数。4月を 0 として数える */
function monthsAfterYearEnd(payMonth: number, term: number): number {
	const start = (payMonth - 4 + 12) % 12;
	return Math.max(0, start + term - 12);
}

function samplePrepaid(seed: number): PrepaidParams {
	const rng = rngFor(seed);
	for (let tries = 0; tries < 50; tries++) {
		const p: PrepaidParams = {
			item: pick(rng, ITEMS),
			payMonth: intBetween(rng, 1, 12),
			term: pick(rng, [6, 12]),
			monthly: intBetween(rng, 2, 20) * 1000
		};
		if (monthsAfterYearEnd(p.payMonth, p.term) > 0) return p;
	}
	return { item: ITEMS[0], payMonth: 10, term: 12, monthly: 10000 };
}

function solvePrepaid(p: PrepaidParams): JournalAnswer {
	const amount = p.monthly * monthsAfterYearEnd(p.payMonth, p.term);
	return {
		debit: [{ account: p.item.prepaid, amount }],
		credit: [{ account: p.item.expense, amount }]
	};
}

function renderPrepaid(p: PrepaidParams): GeneratedBody {
	const after = monthsAfterYearEnd(p.payMonth, p.term);
	const total = p.monthly * p.term;
	return journalBody({
		text: `${p.payMonth}月1日に、${p.item.name}${p.term}か月分${yen(total)}を現金で支払い、全額を${p.item.expense}として処理していた。決算日（3月31日）に、翌期にあたる分を前払${p.item.name}へ振り替える。仕訳しよう。`,
		answer: solvePrepaid(p),
		options: [p.item.prepaid, p.item.expense, p.item.accrued, '現金'],
		explanation: `1か月あたり${yen(total)}÷${p.term}＝${yen(p.monthly)}。決算日のあとにかかるのは${after}か月分だから${yen(p.monthly)}×${after}＝${yen(p.monthly * after)}。費用を取り消して、前払${p.item.name}（資産）に移すよ。`
	});
}

/* ---- 未払費用 ---- */

type AccruedParams = { item: Item; monthly: number; months: number };

function sampleAccrued(seed: number): AccruedParams {
	const rng = rngFor(seed);
	return {
		item: pick(rng, ITEMS),
		monthly: intBetween(rng, 2, 20) * 1000,
		months: intBetween(rng, 1, 4)
	};
}

function solveAccrued(p: AccruedParams): JournalAnswer {
	const amount = p.monthly * p.months;
	return {
		debit: [{ account: p.item.expense, amount }],
		credit: [{ account: p.item.accrued, amount }]
	};
}

function renderAccrued(p: AccruedParams): GeneratedBody {
	const total = p.monthly * p.months;
	return journalBody({
		text: `毎月${yen(p.monthly)}の${p.item.name}について、決算日（3月31日）までの${p.months}か月分をまだ支払っていない。この分を当期の費用として計上する。仕訳しよう。`,
		answer: solveAccrued(p),
		options: [p.item.expense, p.item.accrued, p.item.prepaid, '現金'],
		explanation: `まだ払っていなくても、当期にかかった分は当期の費用だよ。${yen(p.monthly)}×${p.months}か月＝${yen(total)}を${p.item.expense}（費用）に入れて、あとで払う義務を未払${p.item.name}（負債）に書くよ。`
	});
}

export const prepaidGenerator: AnyGenerator = defineGenerator<PrepaidParams, JournalAnswer>({
	id: 'b3-u13-n1-maebarai',
	nodeId: 'b3-u13-n1',
	topic: '前払費用',
	seeds: [701, 702, 703],
	sample: samplePrepaid,
	solve: solvePrepaid,
	render: renderPrepaid,
	verify: verifyJournal
});

export const accruedGenerator: AnyGenerator = defineGenerator<AccruedParams, JournalAnswer>({
	id: 'b3-u13-n2-mibarai',
	nodeId: 'b3-u13-n2',
	topic: '未払費用',
	seeds: [711, 712, 713],
	sample: sampleAccrued,
	solve: solveAccrued,
	render: renderAccrued,
	verify: verifyJournal
});
