import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import type { Document } from '$lib/content/documents';
import StaticDocumentPreview from './StaticDocumentPreview.svelte';

function html(document: Document): string {
	return render(StaticDocumentPreview, { props: { document } }).body;
}

describe('証ひょう類の描画', () => {
	it('旅費交通費支払報告書は明細・合計・添付の領収書を描く', () => {
		const out = html({
			type: 'expense_report',
			data: {
				header: {},
				submitter: '総務部 従業員',
				rows: [{ key: 'r1', cells: { date: '9/2', item: 'タクシー', amount: 2700, receipt: 'あり' } }],
				receipts: [{ key: 'c1', cells: { issuer: '空港タクシー(株)', amount: 2700 } }],
				total: 2700
			}
		});
		for (const text of ['旅費交通費支払報告書', 'タクシー', '合計支出金額', '添付の領収書', '空港タクシー(株)']) {
			expect(out).toContain(text);
		}
	});

	it('領収書と振込依頼書は宛名・内訳・合計を描く', () => {
		const rows = [{ key: 'r1', cells: { description: '敷金', amount: 160000 } }];
		const receipt = html({
			type: 'receipt',
			data: { header: {}, issuer: 'フジ事務機', addressee: 'ミナト商事 様', rows, total: 160000 }
		});
		const request = html({
			type: 'transfer_request',
			data: { header: {}, requester: 'サクラ不動産', addressee: 'ミナト商事 様', rows, total: 160000, account: '緑山銀行 当座 7654321' }
		});
		for (const text of ['領収書', 'ミナト商事 様', '敷金', 'フジ事務機']) expect(receipt).toContain(text);
		for (const text of ['振込依頼書', 'サクラ不動産', '敷金', '緑山銀行 当座 7654321']) expect(request).toContain(text);
	});

	it('照合表は発行日・宛名・続き行、納付書は納付年月日・事業年度を描く', () => {
		const statement = html({
			type: 'bank_statement',
			data: {
				header: {},
				bankName: '青葉銀行本町支店',
				addressee: 'ミナト商事 様',
				issuedOn: '×7年6月12日',
				rows: [{ key: 'r1', role: 'continued', cells: { date: null, description: '⋮', payment: null, deposit: null, balance: null } }]
			}
		});
		const notice = html({
			type: 'tax_notice',
			data: {
				header: {},
				taxType: '法人税',
				filingType: '確定申告',
				fiscalPeriod: '×7年4月1日から×8年3月31日まで',
				paidOn: '×8年5月30日',
				rows: [{ key: 'r1', cells: { label: '本税', amount: 480000 } }],
				total: 480000
			}
		});
		for (const text of ['×7年6月12日', 'ミナト商事 様', '⋮']) expect(statement).toContain(text);
		for (const text of ['×7年4月1日から×8年3月31日まで', '×8年5月30日']) expect(notice).toContain(text);
	});
});
