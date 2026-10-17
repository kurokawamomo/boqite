import { isRecord } from '$lib/util/isRecord';
import { validateAccount } from '$lib/server/content/validate';

/**
 * content/accounts.json（勘定科目のマスタ）に、新しい科目を足す。
 * すでにある科目は書き換えない。1 科目 1 行の見た目を保つ。
 */

export type MergeResult = { text: string; added: string[]; skipped: string[] };

/** accounts.json と同じ 1 行の書き方にする（`{ "name": "現金", "category": "資産", … }`） */
function formatAccount(account: Record<string, unknown>): string {
	const body = Object.entries(account)
		.map(([key, value]) => `"${key}": ${JSON.stringify(value).replace(/","/g, '", "')}`)
		.join(', ');
	return `  { ${body} }`;
}

export function mergeAccounts(text: string, extra: unknown): MergeResult {
	const existing: unknown = JSON.parse(text);
	if (!Array.isArray(existing)) throw new Error('accounts.json: トップレベルは配列である必要があります');
	if (!Array.isArray(extra)) throw new Error('追加する科目は配列である必要があります');

	const known = new Set(existing.flatMap((a) => (isRecord(a) && typeof a.name === 'string' ? [a.name] : [])));
	const added: string[] = [];
	const skipped: string[] = [];
	const lines: string[] = [];
	extra.forEach((raw, i) => {
		const account = validateAccount(raw, `追加する科目[${i}]`);
		if (known.has(account.name)) {
			skipped.push(account.name);
			return;
		}
		known.add(account.name);
		added.push(account.name);
		lines.push(formatAccount(raw as Record<string, unknown>));
	});
	if (lines.length === 0) return { text, added, skipped };

	const body = text.trimEnd();
	if (!body.endsWith(']')) throw new Error('accounts.json: 末尾が ] ではありません');
	const merged = `${body.slice(0, -1).trimEnd()},\n${lines.join(',\n')}\n]\n`;
	return { text: merged, added, skipped };
}

/**
 * 科目の chapter を、最初に使われたユニットの章番号に付け直す。
 * 問題で使われていない科目（chapters にない科目）は、いまの値のままにする。
 * 1 科目 1 行（評価勘定は数行）の見た目を保つため、chapter の数字だけを書き換える。
 */
export function setAccountChapters(text: string, chapters: ReadonlyMap<string, number>): string {
	let current: string | null = null;
	return text
		.split('\n')
		.map((line) => {
			const name = /"name":\s*"([^"]+)"/.exec(line);
			if (name) current = name[1];
			const chapter = current === null ? undefined : chapters.get(current);
			return chapter !== undefined && /"chapter":\s*\d+/.test(line)
				? line.replace(/"chapter":\s*\d+/, `"chapter": ${chapter}`)
				: line;
		})
		.join('\n');
}
