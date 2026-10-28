import { defineGenerator, type GeneratedBody } from './types';
import { journalBody, verifyJournal, yen, type JournalAnswer } from './journalBody';
import { intBetween, pick, rngFor } from './rng';

/**
 * U14-2「消費税（税抜方式）」。仕入と売上で仮払・仮受を立て、決算で差額を未払消費税にする。
 * 税率は10%。税抜の金額は 1,000 円刻みにして、税額が割り切れるようにする。
 */

type Params =
	| { kind: 'purchase'; base: number }
	| { kind: 'sale'; base: number }
	| { kind: 'settle'; paid: number; received: number };

const OPTIONS = ['仕入', '売上', '買掛金', '売掛金', '仮払消費税', '仮受消費税', '未払消費税'];

function sample(seed: number): Params {
	const rng = rngFor(seed);
	const kind = pick(rng, ['purchase', 'sale', 'settle'] as const);
	if (kind === 'settle') {
		const paid = intBetween(rng, 2, 20) * 10000;
		return { kind, paid, received: paid + intBetween(rng, 1, 15) * 10000 };
	}
	return { kind, base: intBetween(rng, 3, 90) * 1000 } as Params;
}

function solve(p: Params): JournalAnswer {
	if (p.kind === 'purchase') {
		return {
			debit: [
				{ account: '仕入', amount: p.base },
				{ account: '仮払消費税', amount: p.base / 10 }
			],
			credit: [{ account: '買掛金', amount: p.base + p.base / 10 }]
		};
	}
	if (p.kind === 'sale') {
		return {
			debit: [{ account: '売掛金', amount: p.base + p.base / 10 }],
			credit: [
				{ account: '売上', amount: p.base },
				{ account: '仮受消費税', amount: p.base / 10 }
			]
		};
	}
	return {
		debit: [{ account: '仮受消費税', amount: p.received }],
		credit: [
			{ account: '仮払消費税', amount: p.paid },
			{ account: '未払消費税', amount: p.received - p.paid }
		]
	};
}

function render(p: Params): GeneratedBody {
	if (p.kind === 'settle') {
		return journalBody({
			text: `決算にあたり、仮払消費税${yen(p.paid)}と仮受消費税${yen(p.received)}を相殺し、差額を納付額として処理する。税抜方式で記帳している。仕訳しよう。`,
			answer: solve(p),
			options: OPTIONS,
			explanation: `預かった消費税(仮受)${yen(p.received)}から、払った消費税(仮払)${yen(p.paid)}を引いた${yen(p.received - p.paid)}が納める額だよ。仮受と仮払を消して、納める分を未払消費税（負債）に置くよ。`
		});
	}
	const tax = p.base / 10;
	const verb = p.kind === 'purchase' ? '仕入れ' : '売り上げ';
	return journalBody({
		text: `商品${yen(p.base)}（税抜）を掛けで${verb}た。消費税は10%で、税抜方式で記帳する。仕訳しよう。`,
		answer: solve(p),
		options: OPTIONS,
		explanation:
			p.kind === 'purchase'
				? `消費税は${yen(p.base)}×10%＝${yen(tax)}。税抜方式では仕入は税を含めず、払う消費税は仮払消費税（資産）で借方。買掛金は税込の${yen(p.base + tax)}だよ。`
				: `消費税は${yen(p.base)}×10%＝${yen(tax)}。税抜方式では売上は税を含めず、預かる消費税は仮受消費税（負債）で貸方。売掛金は税込の${yen(p.base + tax)}だよ。`
	});
}

export const shohizeiGenerator = defineGenerator<Params, JournalAnswer>({
	id: 'b3-u14-n2-shohizei',
	nodeId: 'b3-u14-n2',
	topic: '消費税（税抜方式）',
	seeds: [801, 802, 803],
	sample,
	solve,
	render,
	verify: verifyJournal
});
