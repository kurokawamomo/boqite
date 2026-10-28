import { describe, expect, it } from 'vitest';
import { checkQuestion } from './checks';
import { convertPendingForm, convertPendingForms, type PendingForm } from './pendingForms';
import { renderedCellRefs } from '$lib/components/forms/formColumns';
import type { FormFillTask } from './types';
import { validateUnitFile } from '$lib/server/content/validate';

const accounts = new Set<string>();

const costReport: PendingForm = {
	nodeId: 'b2-u08-n4',
	form: 'cost_report（製造原価報告書）',
	columns: ['区分', '金額'],
	stimulus: '製造原価報告書の空欄を埋める。',
	rows: [
		['材料費', 820000],
		['労務費', 470000],
		['経費', 190000],
		['当期総製造費用', null],
		['期首仕掛品棚卸高', 160000],
		['合計', null],
		['期末仕掛品棚卸高', 130000],
		['当期製品製造原価', null]
	],
	blanks: [
		{ ref: '当期総製造費用', answer: 1480000 },
		{ ref: '合計', answer: 1640000 },
		{ ref: '当期製品製造原価', answer: 1510000 }
	],
	explanation: '材料費、労務費、経費を足して当期総製造費用を出す。'
};

const dept: PendingForm = {
	nodeId: 'b2-u11-n2',
	form: 'dept_allocation_table（部門費配分表）',
	columns: ['費目', '配賦基準', '合計', '切削部門', '組立部門', '修繕部門', '動力部門'],
	stimulus: '部門費配分表を完成させる。',
	rows: [
		['部門個別費', null, 1160000, 520000, 430000, 120000, 90000],
		['共通費（建物減価償却費）', '床面積 5:3:1:1', 240000, null, null, null, null],
		['部門費合計', null, null, null, null, null, null]
	],
	blanks: [
		{ ref: '共通費・切削', answer: 120000 },
		{ ref: '共通費・組立', answer: 72000 },
		{ ref: '共通費・修繕', answer: 24000 },
		{ ref: '共通費・動力', answer: 24000 },
		{ ref: '部門費合計・切削', answer: 640000 }
	],
	explanation: '共通費は床面積の比で分ける。'
};

const jobCost: PendingForm = {
	nodeId: 'b2-u15-n1',
	form: 'job_cost_sheet（原価計算表）',
	columns: ['指図書番号', '直接材料費', '直接労務費', '製造間接費', '製造原価'],
	stimulus: '原価計算表を完成させる。',
	rows: [
		['#301', 240000, 180000, null, null],
		['#302', 310000, 150000, null, null]
	],
	blanks: [
		{ ref: '#301.製造間接費', answer: 90000 },
		{ ref: '#301.製造原価', answer: 510000 },
		{ ref: '#302.製造間接費', answer: 75000 },
		{ ref: '#302.製造原価', answer: 535000 }
	],
	explanation: '3つの原価を足して製造原価にする。'
};

const directCosting: PendingForm = {
	nodeId: 'b2-u22-n4',
	form: 'direct_costing_pl（直接原価計算の損益計算書）',
	columns: ['項目', '金額'],
	stimulus: '直接原価計算の損益計算書を完成させる。',
	rows: [
		['売上高', 1600000],
		['変動売上原価', 640000],
		['変動製造マージン', null],
		['変動販売費', 160000],
		['貢献利益', null],
		['製造固定費', 420000],
		['固定販売費及び一般管理費', 180000],
		['営業利益', null]
	],
	blanks: [
		{ ref: '変動製造マージン', answer: 960000 },
		{ ref: '貢献利益', answer: 800000 },
		{ ref: '営業利益', answer: 200000 }
	],
	explanation: '売上高から変動費を引いて貢献利益を出す。'
};

const mergedPl: PendingForm = {
	nodeId: 'b2-u19-n4',
	form: 'merged_pl（合併損益計算書）',
	columns: ['項目', '本店', '支店', '合併'],
	stimulus: '本店と支店の損益計算書を合算して、合併損益計算書を作る。',
	rows: [
		['売上高', 4200000, 1800000, null],
		['売上原価', 2400000, 1000000, null],
		['売上総利益', null, null, null]
	],
	blanks: [
		{ ref: '売上高.合併', answer: 6000000 },
		{ ref: '売上原価.合併', answer: 3400000 },
		{ ref: '売上総利益.合併', answer: 2600000 }
	],
	explanation: '項目ごとに本店と支店を足す。'
};

const task = (p: PendingForm): FormFillTask => {
	const r = convertPendingForm(p, 'x-f1');
	if (!r.ok) throw new Error(r.reason);
	return r.question.task as FormFillTask;
};

describe('合併損益計算書（既存の損益計算書で受ける）', () => {
	it('pl の様式で、見出しは「合併損益計算書」。収益は貸方、費用と利益は借方', () => {
		const t = task(mergedPl);
		expect(t.document.type).toBe('pl');
		const data = t.document.data as {
			header: { title: string };
			debit: Array<{ key: string; cells: { label: string } }>;
			credit: Array<{ key: string; cells: { label: string } }>;
		};
		expect(data.header.title).toBe('合併損益計算書');
		expect(data.debit.map((r) => r.cells.label)).toEqual(['売上原価', '売上総利益']);
		expect(data.credit.map((r) => r.cells.label)).toEqual(['売上高']);
		expect(t.blanks.map((b) => b.ref)).toEqual(['c1.amount', 'd2.amount', 'd3.amount']);
		expect(t.blanks.map((b) => b.answer)).toEqual([6000000, 3400000, 2600000]);
	});

	it('本店・支店の金額は問題文に書く（表には合併の欄だけ）', () => {
		const r = convertPendingForm(mergedPl, 'x-f1');
		if (!r.ok) throw new Error(r.reason);
		expect(r.question.stimulus.text).toContain('【本店】売上高4,200,000円、売上原価2,400,000円');
		expect(r.question.stimulus.text).toContain('【支店】売上高1,800,000円、売上原価1,000,000円');
		expect(checkQuestion(r.question as unknown as Record<string, unknown>, accounts)).toEqual([]);
	});
});

describe('convertPendingForm', () => {
	it.each([costReport, dept, jobCost, directCosting])('$form: 空欄が画面に描かれ、検査に通る', (p) => {
		const r = convertPendingForm(p, 'x-f1');
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		const t = r.question.task as FormFillTask;
		const rendered = renderedCellRefs(t.document);
		for (const b of t.blanks) expect(rendered.has(b.ref), b.ref).toBe(true);
		expect(t.blanks.map((b) => b.answer)).toEqual(p.blanks.map((b) => b.answer));
		expect(checkQuestion(r.question as unknown as Record<string, unknown>, accounts)).toEqual([]);
	});

	it('読み込み時の検証にも通る', () => {
		const r = convertPendingForm(costReport, 'b2-u08-n4-f1');
		if (!r.ok) throw new Error(r.reason);
		const unit = { unit: { id: 'u', course: 'boki2', chapter: 1, title: 't' }, nodes: [{ id: 'n', title: 'n', questions: [r.question] }] };
		expect(() => validateUnitFile(unit, 'x.json')).not.toThrow();
	});

	it('製造原価報告書: 空欄にした欄は null、そのほかの欄は値のまま', () => {
		const doc = task(costReport).document;
		expect(doc.type).toBe('cost_report');
		const rows = (doc.data as { rows: Array<{ cells: { label: string; amount: number | null } }> }).rows;
		expect(rows.find((x) => x.cells.label === '当期総製造費用')?.cells.amount).toBeNull();
		expect(rows.find((x) => x.cells.label === '材料費')?.cells.amount).toBe(820000);
	});

	it('部門費配分表: 配賦基準はラベルに入り、部門の列は宣言した部門だけ。合計の行の空欄でない欄は列の合計で埋める', () => {
		const t = task(dept);
		expect(t.document.type).toBe('department_table');
		const data = t.document.data as { departments: string[]; rows: Array<{ cells: { label: string; total: number | null; byDepartment: Record<string, number | null> } }> };
		expect(data.departments).toEqual(['切削部門', '組立部門', '修繕部門', '動力部門']);
		expect(data.rows[1].cells.label).toBe('共通費（建物減価償却費）（床面積 5:3:1:1）');
		// 組立部門の合計 = 430000 + 72000 = 502000（空欄ではないので値で入る）
		expect(data.rows[2].cells.byDepartment['組立部門']).toBe(502000);
		expect(data.rows[2].cells.total).toBe(1400000);
		// 空欄の欄
		expect(data.rows[2].cells.byDepartment['切削部門']).toBeNull();
		expect(t.blanks.map((b) => b.ref)).toContain('r3.byDepartment.切削部門');
	});

	it('原価計算表: 指図書の行が列になり、項目が行になる', () => {
		const t = task(jobCost);
		expect(t.document.type).toBe('cost_sheet');
		const data = t.document.data as { orders: string[]; rows: Array<{ cells: { label: string; byOrder: Record<string, number | null> } }> };
		expect(data.orders).toEqual(['#301', '#302']);
		expect(data.rows.map((r) => r.cells.label)).toEqual(['直接材料費', '直接労務費', '製造間接費', '製造原価']);
		expect(data.rows[0].cells.byOrder['#301']).toBe(240000);
		expect(data.rows[2].cells.byOrder['#301']).toBeNull();
		expect(t.blanks.map((b) => b.ref)).toContain('r3.byOrder.#301');
	});

	it('直接原価計算の損益計算書: 率の列を持たない損益の表になる', () => {
		const t = task(directCosting);
		expect(t.document.type).toBe('profit_table');
		expect((t.document.data as { variant: string }).variant).toBe('amount_only');
		expect(renderedCellRefs(t.document).has('r3.ratio')).toBe(false);
	});

	it('未対応の様式、位置の分からない空欄、空の欄が残る下書きは変換しない', () => {
		expect(convertPendingForm({ ...costReport, form: 'unknown_form（謎）' }, 'x').ok).toBe(false);
		expect(convertPendingForm({ ...costReport, blanks: [{ ref: '存在しない', answer: 1 }] }, 'x').ok).toBe(false);
		const leftover = { ...costReport, blanks: costReport.blanks.slice(0, 2) };
		const r = convertPendingForm(leftover, 'x');
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.reason).toContain('空の欄が残ります');
	});
});

describe('convertPendingForms', () => {
	it('ノードごとの下書きにまとめ、ID は <ノード ID>-f<連番>、変換できないものは理由つきで返す', () => {
		const { drafts, failed } = convertPendingForms([costReport, { ...costReport }, { ...jobCost, form: '謎' }]);
		expect(drafts['b2-u08-n4'].map((q) => q.id)).toEqual(['b2-u08-n4-f1', 'b2-u08-n4-f2']);
		expect(failed).toHaveLength(1);
		expect(failed[0].nodeId).toBe('b2-u15-n1');
	});
});
