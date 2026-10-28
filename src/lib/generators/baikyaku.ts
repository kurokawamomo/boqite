import { defineGenerator, type GeneratedBody } from './types';
import { journalBody, verifyJournal, yen, type JournalAnswer } from './journalBody';
import { intBetween, pick, rngFor } from './rng';

/**
 * U8-4「固定資産の売却」。帳簿価額（取得原価 − 累計額）と売却価額の差が売却損益。
 * 代金は現金のこともあれば、あとで受け取る（未収入金）こともある。
 */

type Params = {
	asset: '備品' | '車両運搬具' | '建物';
	cost: number;
	accumulated: number;
	/** 売却価額 − 帳簿価額。正なら売却益、負なら売却損 */
	diff: number;
	credit: boolean;
};

const ASSETS = ['備品', '車両運搬具', '建物'] as const;

function sample(seed: number): Params {
	const rng = rngFor(seed);
	const cost = intBetween(rng, 2, 20) * 100000;
	const accumulated = (cost * intBetween(rng, 2, 8) * 10) / 100;
	// 売却価額が 0 以下にならないよう、差は帳簿価額の半分までにする
	const book = cost - accumulated;
	const size = intBetween(rng, 1, Math.min(9, Math.max(1, Math.floor(book / 20000)))) * 10000;
	return {
		asset: pick(rng, ASSETS),
		cost,
		accumulated,
		diff: rng() < 0.5 ? size : -size,
		credit: rng() < 0.5
	};
}

function solve(p: Params): JournalAnswer {
	const price = p.cost - p.accumulated + p.diff;
	const receivable = p.credit ? '未収入金' : '現金';
	const debit = [
		{ account: '減価償却累計額', amount: p.accumulated },
		{ account: receivable, amount: price },
		...(p.diff < 0 ? [{ account: '固定資産売却損', amount: -p.diff }] : [])
	];
	const credit = [
		{ account: p.asset, amount: p.cost },
		...(p.diff > 0 ? [{ account: '固定資産売却益', amount: p.diff }] : [])
	];
	return { debit, credit };
}

function render(p: Params): GeneratedBody {
	const book = p.cost - p.accumulated;
	const price = book + p.diff;
	const how = p.credit ? '代金はあとで受け取ることにした' : '代金は現金で受け取った';
	const result = p.diff > 0 ? `売却価額のほうが${yen(p.diff)}高いので売却益` : `売却価額のほうが${yen(-p.diff)}低いので売却損`;
	return journalBody({
		text: `${p.asset}（取得原価${yen(p.cost)}、減価償却累計額${yen(p.accumulated)}）を${yen(price)}で売却し、${how}。当期分の減価償却は済んでおり、間接法で記帳している。仕訳しよう。`,
		answer: solve(p),
		options: [p.asset, '減価償却累計額', '現金', '未収入金', '固定資産売却益', '固定資産売却損'],
		explanation: `帳簿価額は${yen(p.cost)}−${yen(p.accumulated)}＝${yen(book)}。${result}だよ。${p.asset}と減価償却累計額を消して、受け取る分と損益を書くと、借方と貸方が合うよ。`
	});
}

export const baikyakuGenerator = defineGenerator<Params, JournalAnswer>({
	id: 'b3-u08-n4-baikyaku',
	nodeId: 'b3-u08-n4',
	topic: '固定資産の売却',
	seeds: [401, 402, 403],
	sample,
	solve,
	render,
	verify: verifyJournal
});
