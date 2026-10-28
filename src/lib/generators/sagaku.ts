import { defineGenerator, type GeneratedBody } from './types';
import { journalBody, verifyJournal, yen, type JournalAnswer } from './journalBody';
import { intBetween, pick, rngFor } from './rng';

/**
 * U12-2「貸倒引当金の差額補充」。期末の債権に率を掛けた額と、残っている引当金の差額だけを繰り入れる。
 * 不足する場面だけを出す。
 */

type Params = { receivable: number; electronic: number; rate: number; before: number };

function required(p: Params): number {
	return ((p.receivable + p.electronic) * p.rate) / 100;
}

function sample(seed: number): Params {
	const rng = rngFor(seed);
	const receivable = intBetween(rng, 3, 20) * 100000;
	const electronic = pick(rng, [0, 0, 100000, 200000, 300000]);
	const rate = pick(rng, [1, 2, 3, 5]);
	const need = ((receivable + electronic) * rate) / 100;
	// 残高は必要額より少なくする（差額 1000 円刻み、残高 0 もありうる）
	const before = pick(rng, [0, intBetween(rng, 1, need / 1000 - 1) * 1000, intBetween(rng, 1, need / 1000 - 1) * 1000]);
	return { receivable, electronic, rate, before };
}

function solve(p: Params): JournalAnswer {
	const diff = required(p) - p.before;
	return {
		debit: [{ account: '貸倒引当金繰入', amount: diff }],
		credit: [{ account: '貸倒引当金', amount: diff }]
	};
}

function render(p: Params): GeneratedBody {
	const need = required(p);
	const diff = need - p.before;
	const base = p.electronic > 0 ? `売掛金${yen(p.receivable)}と電子記録債権${yen(p.electronic)}` : `売掛金${yen(p.receivable)}`;
	const balance = p.before === 0 ? '貸倒引当金の残高はない' : `貸倒引当金の残高は${yen(p.before)}である`;
	return journalBody({
		text: `決算にあたり、${base}に対して${p.rate}%の貸倒引当金を、差額補充法で設定する。${balance}。仕訳しよう。`,
		answer: solve(p),
		options: ['貸倒引当金繰入', '貸倒引当金', '貸倒損失', p.electronic > 0 ? '電子記録債権' : '売掛金'],
		explanation: `必要な引当金は(${yen(p.receivable + p.electronic)})×${p.rate}%＝${yen(need)}。いまの残高が${yen(p.before)}なので、足りない${yen(diff)}だけを繰り入れるよ（差額補充法）。`
	});
}

export const sagakuGenerator = defineGenerator<Params, JournalAnswer>({
	id: 'b3-u12-n2-sagaku',
	nodeId: 'b3-u12-n2',
	topic: '貸倒引当金の差額補充',
	seeds: [601, 602, 603],
	sample,
	solve,
	render,
	verify: verifyJournal
});
