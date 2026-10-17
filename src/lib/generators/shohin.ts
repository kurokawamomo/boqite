import type { Document, StockLayer } from '$lib/content/documents';
import { defineGenerator, type GeneratedBody } from './types';
import { answersOf, formFillBody, verifyBlanks } from './formFillBody';
import { intBetween, pick, rngFor } from './rng';

/**
 * U7-1「先入先出法と移動平均法」。商品有高帳の空欄を 3 つ埋める。
 * 先入先出法は、売上が前月繰越の在庫を使い切って仕入分に食い込む場面。
 * 移動平均法は、仕入のあとの平均単価（割り切れる組み合わせ）を求める場面。
 */

type Params = {
	method: 'fifo' | 'moving_average';
	item: string;
	opening: { quantity: number; unitPrice: number };
	purchase: { quantity: number; unitPrice: number };
	/** 売上の数量 */
	sold: number;
};

const ITEMS = ['コーヒーカップ', 'ティーポット', '花びん', 'マグカップ'];

const layer = (quantity: number, unitPrice: number): StockLayer => ({ quantity, unitPrice, amount: quantity * unitPrice });

function sample(seed: number): Params {
	const rng = rngFor(seed);
	const method = pick(rng, ['fifo', 'moving_average'] as const);
	const item = pick(rng, ITEMS);
	if (method === 'fifo') {
		const q0 = intBetween(rng, 5, 15) * 2;
		const u0 = intBetween(rng, 10, 30);
		const q1 = intBetween(rng, 10, 20) * 2;
		return {
			method,
			item,
			opening: { quantity: q0, unitPrice: u0 },
			purchase: { quantity: q1, unitPrice: u0 + intBetween(rng, 1, 8) },
			sold: q0 + intBetween(rng, 1, q1 - 1)
		};
	}
	for (let tries = 0; tries < 500; tries++) {
		const q0 = intBetween(rng, 5, 15) * 2;
		const u0 = intBetween(rng, 10, 30);
		const q1 = intBetween(rng, 5, 20) * 2;
		const u1 = u0 + intBetween(rng, 1, 12);
		if ((q0 * u0 + q1 * u1) % (q0 + q1) === 0) {
			return {
				method,
				item,
				opening: { quantity: q0, unitPrice: u0 },
				purchase: { quantity: q1, unitPrice: u1 },
				sold: intBetween(rng, 1, q0 + q1 - 1)
			};
		}
	}
	return { method, item, opening: { quantity: 10, unitPrice: 10 }, purchase: { quantity: 10, unitPrice: 20 }, sold: 8 };
}

function fullLedger(p: Params): { doc: Document; refs: string[] } {
	const { opening: o, purchase: b, sold } = p;
	const row = (key: string, date: string, summary: string, cells: { received?: StockLayer[]; shipped?: StockLayer[]; balance?: StockLayer[] }, role?: 'opening' | 'carryforward') => ({
		key,
		...(role ? { role } : {}),
		cells: { date, summary, received: cells.received ?? [], shipped: cells.shipped ?? [], balance: cells.balance ?? [] }
	});

	let rows;
	let refs: string[];
	if (p.method === 'fifo') {
		const fromPurchase = sold - o.quantity;
		const remain = b.quantity - fromPurchase;
		rows = [
			row('r-1101', '11/1', '前月繰越', { balance: [layer(o.quantity, o.unitPrice)] }, 'opening'),
			row('r-1105', '11/5', '仕　入', {
				received: [layer(b.quantity, b.unitPrice)],
				balance: [layer(o.quantity, o.unitPrice), layer(b.quantity, b.unitPrice)]
			}),
			row('r-1112', '11/12', '売　上', {
				shipped: [layer(o.quantity, o.unitPrice), layer(fromPurchase, b.unitPrice)],
				balance: [layer(remain, b.unitPrice)]
			}),
			row('r-1130', '11/30', '次月繰越', { shipped: [layer(remain, b.unitPrice)] }, 'carryforward')
		];
		refs = ['r-1112.shipped.0.amount', 'r-1112.shipped.1.amount', 'r-1112.balance.0.amount'];
	} else {
		const avg = (o.quantity * o.unitPrice + b.quantity * b.unitPrice) / (o.quantity + b.quantity);
		const remain = o.quantity + b.quantity - sold;
		rows = [
			row('r-1101', '11/1', '前月繰越', { balance: [layer(o.quantity, o.unitPrice)] }, 'opening'),
			row('r-1105', '11/5', '仕　入', {
				received: [layer(b.quantity, b.unitPrice)],
				balance: [layer(o.quantity + b.quantity, avg)]
			}),
			row('r-1112', '11/12', '売　上', { shipped: [layer(sold, avg)], balance: [layer(remain, avg)] }),
			row('r-1130', '11/30', '次月繰越', { shipped: [layer(remain, avg)] }, 'carryforward')
		];
		refs = ['r-1105.balance.0.unitPrice', 'r-1112.shipped.0.amount', 'r-1112.balance.0.amount'];
	}
	const doc: Document = {
		type: 'inventory_ledger',
		data: { method: p.method, header: { title: '商品有高帳', subject: p.item }, rows }
	};
	return { doc, refs };
}

function solve(p: Params): Record<string, number> {
	const { doc, refs } = fullLedger(p);
	return answersOf(doc, refs);
}

function render(p: Params): GeneratedBody {
	const { doc, refs } = fullLedger(p);
	const name = p.method === 'fifo' ? '先入先出法' : '移動平均法';
	const { opening: o, purchase: b, sold } = p;
	const text = `${p.item}について、${name}で商品有高帳をつける。11/1の前月繰越は${o.quantity}個（@${o.unitPrice}円）、11/5に${b.quantity}個を@${b.unitPrice}円で仕入れ、11/12に${sold}個を売り上げた。空欄を埋めよう。`;
	const explanation =
		p.method === 'fifo'
			? `先入先出法は古い在庫から払い出すよ。11/12は前月繰越${o.quantity}個（@${o.unitPrice}）を使い切って、あとの${sold - o.quantity}個を11/5の仕入分（@${b.unitPrice}）から出すので、${sold - o.quantity}×${b.unitPrice}＝${(sold - o.quantity) * b.unitPrice}円。残りは${b.quantity - (sold - o.quantity)}個×@${b.unitPrice}だよ。`
			: `移動平均法は、仕入のたびに平均単価を出し直すよ。(${o.quantity}×${o.unitPrice}＋${b.quantity}×${b.unitPrice})÷${o.quantity + b.quantity}個＝@${(o.quantity * o.unitPrice + b.quantity * b.unitPrice) / (o.quantity + b.quantity)}円。売上はこの平均単価で払い出すよ。`;
	return formFillBody({ text, full: doc, refs, explanation });
}

export const shohinGenerator = defineGenerator<Params, Record<string, number>>({
	id: 'b3-u07-n1-yuudaka',
	nodeId: 'b3-u07-n1',
	topic: '先入先出法と移動平均法',
	seeds: [901, 902, 903],
	sample,
	solve,
	render,
	verify: verifyBlanks
});
