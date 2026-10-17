import type { RowRole } from '$lib/content/documents';

export type RowStyle = { bold: boolean; indent: boolean; italic: boolean };

const BOLD_ROLES: RowRole[] = ['subtotal', 'total', 'summary', 'net_income'];
const INDENT_ROLES: RowRole[] = ['sub_entry', 'narration'];

/** RowRole から見た目を導く。docs/form-schema.md §2 の表に対応（レンダラは推測しない）。 */
export function rowStyle(role: RowRole | undefined): RowStyle {
	const resolved = role ?? 'entry';
	return {
		bold: BOLD_ROLES.includes(resolved),
		indent: INDENT_ROLES.includes(resolved),
		italic: resolved === 'narration'
	};
}
