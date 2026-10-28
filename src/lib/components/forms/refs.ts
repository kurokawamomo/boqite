import type { CellRef, Document } from '$lib/content/documents';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

/**
 * 様式データから「行の並び」を集める。RowBook は rows、BilateralBook は debit/credit。
 * 両方持つ形はないが、あり得る箇所を素朴に総なめすることで型分岐を避ける。
 */
function collectRows(data: unknown): unknown[] {
	if (!isRecord(data)) return [];
	const rows: unknown[] = [];
	if (Array.isArray(data.rows)) rows.push(...data.rows);
	if (Array.isArray(data.debit)) rows.push(...data.debit);
	if (Array.isArray(data.credit)) rows.push(...data.credit);
	return rows;
}

function findRowCells(data: unknown, rowKey: string): unknown {
	const row = collectRows(data).find((r) => isRecord(r) && r.key === rowKey);
	return isRecord(row) ? row.cells : undefined;
}

export type CellValue = string | number | null | undefined;

/**
 * ref (`docs/form-schema.md` §3-2 の文法) を Document から解決する。
 *
 * `<rowKey>[.<column>[.<index>].<field>]` を先頭から辿る。行が見つからない・
 * パスが途中で外れた場合は undefined（「セルが存在しない」）を返す。存在検証
 * （ref が実在しセルが null か）は呼び出し側（loader / コンテンツ検査）の責務。
 */
export function getCell(doc: Document, ref: CellRef): CellValue {
	const [rowKey, ...path] = ref.split('.');
	let value: unknown = findRowCells(doc.data, rowKey);

	for (const segment of path) {
		if (value === undefined) return undefined;
		if (Array.isArray(value)) {
			const index = Number(segment);
			if (Number.isNaN(index)) return undefined;
			value = value[index];
			continue;
		}
		if (isRecord(value)) {
			value = value[segment];
			continue;
		}
		return undefined;
	}

	if (value === null || typeof value === 'string' || typeof value === 'number') return value;
	return undefined;
}

/** レンダラ側で ref を組み立てる際の糊。`refFor('r-0503', 'expense')` = `"r-0503.expense"` */
export function refFor(...segments: Array<string | number>): CellRef {
	return segments.join('.');
}
