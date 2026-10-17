import { defineGenerator, type GeneratedBody } from './types';
import { journalBody, verifyJournal, yen, type JournalAnswer } from './journalBody';
import { intBetween, pick, rngFor } from './rng';

/**
 * U9-2「利息の月割と日割」。返済日に元本と利息をまとめて現金で受け払いする場面。
 * 月割は年利×月数÷12、日割は年利×日数÷365（1年を365日とする）。
 */

type Params = { direction: 'lend' | 'borrow'; mode: 'month' | 'day'; principal: number; rate: number; span: number };

const MONTH_PRINCIPALS = [120000, 240000, 360000, 600000, 1200000];
const MONTHS = [3, 4, 6, 8, 9, 12];
const DAY_PRINCIPALS = [365000, 730000, 1095000, 1460000, 1825000];

function interest(p: Params): number {
	return p.mode === 'month'
		? (p.principal * p.rate * p.span) / 1200
		: (p.principal * p.rate * p.span) / 36500;
}

function sample(seed: number): Params {
	const rng = rngFor(seed);
	const mode = pick(rng, ['month', 'day'] as const);
	return {
		direction: pick(rng, ['lend', 'borrow'] as const),
		mode,
		principal: mode === 'month' ? pick(rng, MONTH_PRINCIPALS) : pick(rng, DAY_PRINCIPALS),
		rate: intBetween(rng, 1, 6),
		span: mode === 'month' ? pick(rng, MONTHS) : intBetween(rng, 20, 200)
	};
}

function solve(p: Params): JournalAnswer {
	const i = interest(p);
	return p.direction === 'lend'
		? {
				debit: [{ account: '現金', amount: p.principal + i }],
				credit: [
					{ account: '貸付金', amount: p.principal },
					{ account: '受取利息', amount: i }
				]
			}
		: {
				debit: [
					{ account: '借入金', amount: p.principal },
					{ account: '支払利息', amount: i }
				],
				credit: [{ account: '現金', amount: p.principal + i }]
			};
}

function render(p: Params): GeneratedBody {
	const i = interest(p);
	const span = p.mode === 'month' ? `${p.span}か月後` : `${p.span}日後`;
	const rule = p.mode === 'month' ? '利息は月割で計算する' : '利息は日割（1年を365日）で計算する';
	const text =
		p.direction === 'lend'
			? `取引先に貸し付けていた${yen(p.principal)}（年利${p.rate}%）を、貸付けから${span}に、利息とともに現金で回収した。${rule}。仕訳しよう。`
			: `銀行から借りていた${yen(p.principal)}（年利${p.rate}%）を、借入れから${span}に、利息とともに現金で返済した。${rule}。仕訳しよう。`;
	const calc =
		p.mode === 'month'
			? `${yen(p.principal)}×${p.rate}%×${p.span}／12＝${yen(i)}`
			: `${yen(p.principal)}×${p.rate}%×${p.span}／365＝${yen(i)}`;
	return journalBody({
		text,
		answer: solve(p),
		options:
			p.direction === 'lend'
				? ['現金', '貸付金', '受取利息', '支払利息']
				: ['現金', '借入金', '支払利息', '受取利息'],
		explanation: `利息は ${calc}。元本と利息をまとめて動かすので、${p.direction === 'lend' ? '現金が増えて借方、貸付金（元本）と受取利息（収益）が貸方' : '借入金（元本）と支払利息（費用）が借方、現金が減って貸方'}だよ。`
	});
}

export const rishiGenerator = defineGenerator<Params, JournalAnswer>({
	id: 'b3-u09-n2-rishi',
	nodeId: 'b3-u09-n2',
	topic: '利息の月割と日割',
	seeds: [501, 502, 503],
	sample,
	solve,
	render,
	verify: verifyJournal
});
