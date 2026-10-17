import type { Amount, Document, RowRole } from './documents';
import type { Question } from './types';
import { formFillBody } from '$lib/generators/formFillBody';

/**
 * 「様式に載せられなかった」問題の下書き（pending-forms.json）を、新しい様式の穴埋め問題に変換する。
 *
 * 下書きは、表の行（ラベルと数値）と、ラベルで指した空欄の答えで書かれている。
 * 変換では、行ごとのキー（r1, r2, …）と様式の列に ref を対応づけ、空欄でない欄の null は
 * 合計の行なら列の合計で埋める。埋められない null が残る下書きは、読み違いを避けるため変換しない。
 */

export type PendingForm = {
	nodeId: string;
	/** 様式の名前。「cost_report（製造原価報告書）」のように、先頭が識別子 */
	form: string;
	columns: string[];
	stimulus: string;
	rows: Array<Array<string | number | null>>;
	blanks: Array<{ ref: string; answer: number }>;
	explanation: string;
};

export type Conversion = { ok: true; nodeId: string; question: Question } | { ok: false; nodeId: string; reason: string };

type Cell = string | number | null;

const keyOf = (i: number) => `r${i + 1}`;
const identifierOf = (form: string) => form.split(/[（(]/)[0].trim();

function isRoleTotal(label: string): boolean {
	return label.includes('合計');
}

/** ラベルの前方一致で、行を探す */
function findRow(rows: Cell[][], label: string): number {
	return rows.findIndex((r) => typeof r[0] === 'string' && (r[0] === label || (r[0] as string).startsWith(label)));
}

function sum(values: Array<number | null>): number | null {
	return values.some((v) => v === null) ? null : values.reduce<number>((s, v) => s + (v ?? 0), 0);
}

/** 1 つの欄の答え（ref → 数値）。ref の解決は様式ごとの resolve が行う */
type Resolve = (ref: string) => { row: number; col: number } | null;

function fillNulls(rows: Cell[][], blanks: PendingForm['blanks'], resolve: Resolve, firstValueCol: number): Cell[][] {
	const filled = rows.map((r) => [...r]);
	for (const b of blanks) {
		const at = resolve(b.ref);
		if (!at) throw new Error(`空欄 "${b.ref}" の位置が分かりません`);
		if (filled[at.row][at.col] !== null) throw new Error(`空欄 "${b.ref}" の欄に、すでに値があります`);
		filled[at.row][at.col] = b.answer;
	}
	// 合計の行の null は、上の行の列の合計で埋める
	filled.forEach((row, ri) => {
		if (typeof row[0] !== 'string' || !isRoleTotal(row[0])) return;
		for (let c = firstValueCol; c < row.length; c++) {
			if (row[c] !== null) continue;
			const total = sum(filled.slice(0, ri).filter((r) => !(typeof r[0] === 'string' && isRoleTotal(r[0]))).map((r) => (typeof r[c] === 'number' ? (r[c] as number) : null)));
			if (total !== null) row[c] = total;
		}
	});
	const left = filled.flatMap((r, ri) => r.flatMap((v, ci) => (ci >= firstValueCol && v === null ? [`${ri + 1}行目の${ci + 1}列目`] : [])));
	if (left.length > 0) throw new Error(`空欄に指定されていない空の欄が残ります（${left.join('、')}）`);
	return filled;
}

const amount = (v: Cell): Amount => (typeof v === 'number' ? v : null);

/** ラベルから行の役割と罫線を決める（合計行は太字、最後の集計は二重線） */
function roleOf(label: string, last: boolean): { role?: RowRole; ruledAfter?: 'single' | 'double' } {
	if (last) return { role: 'total', ruledAfter: 'double' };
	if (isRoleTotal(label) || label.includes('マージン') || label.includes('貢献利益') || label.startsWith('当期総')) {
		return { role: 'subtotal', ruledAfter: 'single' };
	}
	return {};
}

function convertLabelAmount(p: PendingForm, type: 'cost_report' | 'profit_table'): { full: Document; refs: string[] } {
	const resolve: Resolve = (ref) => {
		const row = findRow(p.rows, ref);
		return row === -1 ? null : { row, col: 1 };
	};
	const filled = fillNulls(p.rows, p.blanks, resolve, 1);
	const rows = filled.map((r, i) => {
		const label = String(r[0]);
		const style = roleOf(label, i === filled.length - 1);
		return { key: keyOf(i), ...style, cells: type === 'cost_report' ? { label, detail: null, amount: amount(r[1]) } : { label, amount: amount(r[1]), ratio: null } };
	});
	const header = { title: type === 'cost_report' ? '製造原価報告書' : '損益計算書（直接原価計算）' };
	const full = (
		type === 'cost_report'
			? { type, data: { header, rows } }
			: { type, data: { header, variant: 'amount_only', rows } }
	) as unknown as Document;
	const refs = p.blanks.map((b) => `${keyOf(resolve(b.ref)!.row)}.amount`);
	return { full, refs };
}

function convertDepartmentTable(p: PendingForm): { full: Document; refs: string[] } {
	const departments = p.columns.slice(3);
	const resolve: Resolve = (ref) => {
		const [head, tail] = ref.split('・');
		const row = findRow(p.rows, head);
		if (row === -1) return null;
		if (tail === undefined) return { row, col: 2 };
		const dept = departments.findIndex((d) => d.startsWith(tail));
		return dept === -1 ? null : { row, col: 3 + dept };
	};
	const filled = fillNulls(p.rows, p.blanks, resolve, 2);
	const rows = filled.map((r, i) => {
		const basis = typeof r[1] === 'string' ? `（${r[1]}）` : '';
		const label = `${String(r[0])}${basis}`;
		const style = roleOf(String(r[0]), i === filled.length - 1);
		const byDepartment = Object.fromEntries(departments.map((d, di) => [d, amount(r[3 + di])]));
		return { key: keyOf(i), ...style, cells: { label, total: amount(r[2]), byDepartment } };
	});
	const full = { type: 'department_table', data: { header: { title: '部門費配分表' }, departments, rows } } as unknown as Document;
	const refs = p.blanks.map((b) => {
		const at = resolve(b.ref)!;
		return at.col === 2 ? `${keyOf(at.row)}.total` : `${keyOf(at.row)}.byDepartment.${departments[at.col - 3]}`;
	});
	return { full, refs };
}

/** 指図書の行（#301 …）を、様式の列（指図書）に置き換える。行は原価の項目になる */
function convertJobCostSheet(p: PendingForm): { full: Document; refs: string[] } {
	const items = p.columns.slice(1);
	const resolve: Resolve = (ref) => {
		const [order, item] = ref.split('.');
		const row = p.rows.findIndex((r) => r[0] === order);
		const col = items.indexOf(item);
		return row === -1 || col === -1 ? null : { row, col: col + 1 };
	};
	const filled = fillNulls(p.rows, p.blanks, resolve, 1);
	const orders = filled.map((r) => String(r[0]));
	const rows = items.map((item, ii) => {
		const byOrder = Object.fromEntries(filled.map((r) => [String(r[0]), amount(r[ii + 1])]));
		const last = ii === items.length - 1;
		return {
			key: keyOf(ii),
			...(last ? { role: 'total' as const, ruledAfter: 'double' as const } : {}),
			cells: { label: item, byOrder, total: sum(filled.map((r) => amount(r[ii + 1]))) }
		};
	});
	const full = { type: 'cost_sheet', data: { header: { title: '原価計算表' }, orders, rows } } as unknown as Document;
	const refs = p.blanks.map((b) => {
		const at = resolve(b.ref)!;
		return `${keyOf(at.col - 1)}.byOrder.${filled[at.row][0]}`;
	});
	return { full, refs };
}

/**
 * 合併損益計算書（列が 本店・支店・合併）。新しい様式は作らず、既存の損益計算書（pl）で受ける。
 * 損益計算書は金額の列が 1 つなので、問われる「合併」の欄だけを表にし、本店・支店の金額は問題文に書く。
 * 収益は貸方、費用と段階の利益は借方に置く。
 */
function convertMergedPl(p: PendingForm): { full: Document; refs: string[]; text: string } {
	const mergedCol = p.columns.indexOf('合併');
	if (mergedCol === -1) throw new Error('列に「合併」がありません');
	const resolve: Resolve = (ref) => {
		const row = findRow(p.rows, ref.split('.')[0]);
		return row === -1 ? null : { row, col: mergedCol };
	};
	const filled = fillNulls(p.rows, p.blanks, resolve, mergedCol);
	const isRevenue = (label: string) => /売上高|収益|受取/.test(label);
	const side = (revenue: boolean) =>
		filled.flatMap((r, i) =>
			isRevenue(String(r[0])) === revenue
				? [
						{
							key: `${revenue ? 'c' : 'd'}${i + 1}`,
							...(String(r[0]).endsWith('利益') ? { role: 'net_income' as const } : {}),
							cells: { label: String(r[0]), amount: amount(r[mergedCol]) }
						}
					]
				: []
		);
	const debit = side(false);
	const credit = side(true);
	const full = { type: 'pl', data: { header: { title: '合併損益計算書' }, debit, credit } } as unknown as Document;
	const keyOfRow = (row: number) => `${isRevenue(String(filled[row][0])) ? 'c' : 'd'}${row + 1}`;
	const refs = p.blanks.map((b) => `${keyOfRow(resolve(b.ref)!.row)}.amount`);
	const yen = (n: number) => `${n.toLocaleString('en-US')}円`;
	const describe = (col: number) =>
		p.rows
			.filter((r) => typeof r[col] === 'number')
			.map((r) => `${String(r[0])}${yen(r[col] as number)}`)
			.join('、');
	const text = `${p.stimulus}【${p.columns[1]}】${describe(1)}。【${p.columns[2]}】${describe(2)}。`;
	return { full, refs, text };
}

const CONVERTERS: Record<string, (p: PendingForm) => { full: Document; refs: string[]; text?: string }> = {
	merged_pl: convertMergedPl,
	cost_report: (p) => convertLabelAmount(p, 'cost_report'),
	direct_costing_pl: (p) => convertLabelAmount(p, 'profit_table'),
	dept_allocation_table: convertDepartmentTable,
	job_cost_sheet: convertJobCostSheet
};

export const SUPPORTED_PENDING_FORMS = Object.keys(CONVERTERS);

export function convertPendingForm(p: PendingForm, id: string): Conversion {
	const convert = CONVERTERS[identifierOf(p.form)];
	if (!convert) {
		return { ok: false, nodeId: p.nodeId, reason: `様式 "${p.form}" は変換できません（対応: ${SUPPORTED_PENDING_FORMS.join(', ')}）` };
	}
	try {
		const { full, refs, text } = convert(p);
		const body = formFillBody({ text: text ?? p.stimulus, full, refs, explanation: p.explanation });
		const question: Question = { id, source: 'generated', sanitized: true, ...body };
		return { ok: true, nodeId: p.nodeId, question };
	} catch (e) {
		return { ok: false, nodeId: p.nodeId, reason: (e as Error).message };
	}
}

/** pending-forms.json を、ノード ID → 問題の配列（下書きと同じ形）にする。ID は `<ノード ID>-f<連番>` */
export function convertPendingForms(items: PendingForm[]): { drafts: Record<string, Question[]>; failed: Array<{ nodeId: string; reason: string }> } {
	const drafts: Record<string, Question[]> = {};
	const failed: Array<{ nodeId: string; reason: string }> = [];
	const counter = new Map<string, number>();
	for (const item of items) {
		const n = (counter.get(item.nodeId) ?? 0) + 1;
		counter.set(item.nodeId, n);
		const r = convertPendingForm(item, `${item.nodeId}-f${n}`);
		if (r.ok) (drafts[r.nodeId] ??= []).push(r.question);
		else failed.push({ nodeId: r.nodeId, reason: r.reason });
	}
	return { drafts, failed };
}

