import type { JournalEntryLine, JournalTask } from '$lib/content/types';
import { defineGenerator, type GeneratedBody } from './types';
import { intBetween, pick, rngFor } from './rng';

/**
 * U2-1「掛けの売り買い」。6 種類の取引（現金・売掛金・買掛金・売上・仕入・備品）だけで、
 * 掛け仕入・掛け売上・買掛金の支払い・売掛金の回収を出す。
 */

type Kind = 'purchase' | 'sale' | 'pay' | 'collect';

type Params = {
	kind: Kind;
	partner: string;
	item: string;
	quantity: number;
	unitPrice: number;
};

type Answer = { debit: JournalEntryLine[]; credit: JournalEntryLine[] };

const PARTNERS = ['ひだまり商店', 'きりしま商店', 'こもれび商店', 'あさひ商店', 'ゆりの木商店', 'かぜのこ商店'];
const ITEMS = ['コーヒーカップ', 'ティーポット', '花びん', 'マグカップ', 'トレー', 'キャンドル'];
const KINDS: readonly Kind[] = ['purchase', 'sale', 'pay', 'collect'];

const OPTIONS = ['現金', '売掛金', '買掛金', '売上', '仕入', '備品'];

function sample(seed: number): Params {
	const rng = rngFor(seed);
	return {
		kind: pick(rng, KINDS),
		partner: pick(rng, PARTNERS),
		item: pick(rng, ITEMS),
		quantity: intBetween(rng, 5, 40),
		unitPrice: intBetween(rng, 2, 9) * 10
	};
}

function solve(p: Params): Answer {
	const amount = p.quantity * p.unitPrice;
	switch (p.kind) {
		case 'purchase':
			return { debit: [{ account: '仕入', amount }], credit: [{ account: '買掛金', amount }] };
		case 'sale':
			return { debit: [{ account: '売掛金', amount }], credit: [{ account: '売上', amount }] };
		case 'pay':
			return { debit: [{ account: '買掛金', amount }], credit: [{ account: '現金', amount }] };
		case 'collect':
			return { debit: [{ account: '現金', amount }], credit: [{ account: '売掛金', amount }] };
	}
}

const STIMULUS: Record<Kind, (p: Params) => string> = {
	purchase: (p) => `${p.partner}から${p.item}${p.quantity}個を1個${p.unitPrice}円で仕入れ、代金は掛けとした。仕訳しよう。`,
	sale: (p) => `${p.partner}に${p.item}${p.quantity}個を1個${p.unitPrice}円で売り上げ、代金は掛けとした。仕訳しよう。`,
	pay: (p) => `${p.partner}への買掛金${p.quantity * p.unitPrice}円を、現金で支払った。仕訳しよう。`,
	collect: (p) => `${p.partner}から売掛金${p.quantity * p.unitPrice}円を、現金で回収した。仕訳しよう。`
};

const EXPLANATION: Record<Kind, string> = {
	purchase: '商品を買うので仕入(費用)が増えて借方。代金はまだ払っていないから、買掛金(負債)が増えて貸方だよ。',
	sale: '商品を売るので売上(収益)が増えて貸方。代金はまだもらっていないから、売掛金(資産)が増えて借方だよ。',
	pay: 'あとで払う約束(買掛金)を果たしたので、買掛金(負債)が減って借方。現金(資産)が減って貸方だよ。',
	collect: 'あとでもらう約束(売掛金)が実現したので、現金(資産)が増えて借方。売掛金(資産)が減って貸方だよ。'
};

function render(p: Params): GeneratedBody {
	const answer = solve(p);
	const task: JournalTask = {
		kind: 'journal',
		debit: answer.debit,
		credit: answer.credit,
		accountOptions: OPTIONS,
		amountInput: 'numpad'
	};
	return { stimulus: { text: STIMULUS[p.kind](p) }, task, explanation: EXPLANATION[p.kind] };
}

function verify(q: GeneratedBody, answer: Answer): boolean {
	return (
		q.task.kind === 'journal' &&
		JSON.stringify(q.task.debit) === JSON.stringify(answer.debit) &&
		JSON.stringify(q.task.credit) === JSON.stringify(answer.credit)
	);
}

export const kakeGenerator = defineGenerator<Params, Answer>({
	id: 'b3-u02-n1-kake',
	nodeId: 'b3-u02-n1',
	topic: '掛けの売り買い',
	seeds: [101, 102, 103],
	sample,
	solve,
	render,
	verify
});
