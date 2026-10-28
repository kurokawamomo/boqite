import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { INTERNAL_COURSES, INTERNAL_COURSE_ORDER } from '$lib/content/courses';
import { mergeAccounts, setAccountChapters } from '$lib/content/accountsFile';
import { convertPendingForms, type PendingForm } from '$lib/content/pendingForms';
import { importDrafts, type DraftFile, type UnitJson } from '$lib/content/importDrafts';
import { isRecord } from '$lib/util/isRecord';

/**
 * 問題の下書き（ノード ID → 問題の配列の JSON）を content の JSON に取り込む。
 * 検査（check-content と同じ）に通らない問題は取り込まず、理由つきで一覧にする。
 * 同じ ID の既存問題は置き換わる。何度流しても結果は同じ。
 *
 * 実行: pnpm run import:drafts -- <下書きのディレクトリ> [--course boki3|boki2] [--dry-run] [--fail-on-reject]
 *   --course         取り込み先のコース（既定は boki3）。ほかのコースのノードへの下書きは弾く
 *   --accounts <ファイル>  下書きと一緒に出た新しい勘定科目（JSON の配列）を content/accounts.json に足す。すでにある科目は書き換えない。複数回指定できる
 *                    科目の chapter は、いつも最初に使われたユニットの章番号に付け直す
 *   --pending <ファイル>  様式に載せられなかった問題の下書き（pending-forms.json）を、新しい様式の穴埋め問題に変換して一緒に取り込む
 *   --exclude u18,u19  取り込まない下書きファイル（カンマ区切り。書き起こし中のものを外す）
 *   --dry-run        書き込まず、取り込める件数と弾く一覧だけ出す
 *   --fail-on-reject 弾いた問題があれば exit 1
 */

// argv[2] は run-ts.mjs に渡したスクリプト自身
const args = process.argv.slice(3);

/** `--course <id>` または `--course=<id>`。既定は日商3級 */
function readCourseArg(argv: string[]): string {
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === '--course') return argv[i + 1] ?? '';
		if (argv[i].startsWith('--course=')) return argv[i].slice('--course='.length);
	}
	return INTERNAL_COURSES[0].id;
}

const draftsDir = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--course' && args[i - 1] !== '--accounts' && args[i - 1] !== '--pending' && args[i - 1] !== '--exclude');
const DRY_RUN = args.includes('--dry-run');
const excluded = new Set(
	(args.find((a, i) => args[i - 1] === '--exclude') ?? '')
		.split(',')
		.map((n) => n.trim().replace(/\.json$/, ''))
		.filter((n) => n.length > 0)
);
const pendingArg = ((): string | null => {
	const i = args.indexOf('--pending');
	return i === -1 ? null : (args[i + 1] ?? null);
})();
/** `--accounts <ファイル>`（複数回指定できる） */
const accountsArgs = args.flatMap((a, i) => (a === '--accounts' && args[i + 1] ? [args[i + 1]] : []));
const FAIL_ON_REJECT = args.includes('--fail-on-reject');
const TARGET = INTERNAL_COURSES.find((c) => c.id === readCourseArg(args));

async function main() {
	if (!draftsDir || !TARGET) {
		console.error(
			`使い方: import-drafts.ts <下書きのディレクトリ> [--course ${INTERNAL_COURSES.map((c) => c.id).join('|')}] [--dry-run] [--fail-on-reject]`
		);
		process.exit(2);
	}

	// 科目の初出はコースをまたいで付くので、全コースを読んで、全コースを書き戻す
	const files: Array<{ course: string; dir: string; name: string; raw: string; unit: UnitJson }> = [];
	for (const course of INTERNAL_COURSES) {
		const dir = path.resolve(process.cwd(), course.dir);
		for (const name of (await readdir(dir)).filter((f) => f.endsWith('.json')).sort()) {
			const raw = await readFile(path.join(dir, name), 'utf-8');
			files.push({ course: course.id, dir, name, raw, unit: JSON.parse(raw) as UnitJson });
		}
	}

	const accountsPath = path.resolve(process.cwd(), 'content', 'accounts.json');
	let accountsText = await readFile(accountsPath, 'utf-8');
	const accountsBefore = accountsText;
	for (const file of accountsArgs) {
		const merged = mergeAccounts(accountsText, JSON.parse(await readFile(path.resolve(file), 'utf-8')));
		accountsText = merged.text;
		console.log(`勘定科目（${path.basename(file)}）: 追加 ${merged.added.length} 件、すでにあるため追加しない ${merged.skipped.length} 件`);
	}
	const accountsRaw = JSON.parse(accountsText);
	const accountNames = new Set<string>(
		(Array.isArray(accountsRaw) ? accountsRaw : [])
			.map((a: unknown) => (isRecord(a) ? a.name : undefined))
			.filter((n: unknown): n is string => typeof n === 'string')
	);

	// 下書きは uNN.json。配点表など、同じ場所にある別の JSON は取り込まない
	const draftFiles = (await readdir(path.resolve(draftsDir))).filter((f) => /^u\d{2}\.json$/.test(f) && !excluded.has(f.replace(/\.json$/, ''))).sort();
	const drafts: DraftFile[] = [];
	for (const f of draftFiles) {
		drafts.push({ file: f, data: JSON.parse(await readFile(path.join(path.resolve(draftsDir), f), 'utf-8')) });
	}

	const convertFailures: Array<{ nodeId: string; reason: string }> = [];
	if (pendingArg) {
		const converted = convertPendingForms(JSON.parse(await readFile(path.resolve(pendingArg), 'utf-8')) as PendingForm[]);
		drafts.push({ file: path.basename(pendingArg), data: converted.drafts });
		convertFailures.push(...converted.failed);
	}

	const result = importDrafts(
		files.map((f) => f.unit),
		drafts,
		accountNames,
		{ nodeIdPrefix: `${TARGET.idPrefix}-`, courseOrder: INTERNAL_COURSE_ORDER }
	);

	// 科目の chapter は、コースの並び順で最初に使われたユニットの章番号に付け直す
	accountsText = setAccountChapters(accountsText, result.firstUseChapters);
	if (accountsText !== accountsBefore) {
		console.log('勘定科目: 追加・chapter の付け直しがあります');
		if (!DRY_RUN) await writeFile(accountsPath, accountsText);
	}

	let written = 0;
	for (let i = 0; i < result.units.length; i++) {
		const f = files[i];
		const after = JSON.stringify(result.units[i], null, 2) + '\n';
		if (after === f.raw) continue;
		written += 1;
		if (!DRY_RUN) await writeFile(path.join(f.dir, f.name), after);
	}

	console.log(
		`下書き ${draftFiles.length} ファイル（${TARGET.id}）: 取り込み ${result.accepted.length} 問、弾いた ${result.rejected.length} 件${DRY_RUN ? '（書き込まない）' : `、更新 ${written} ファイル`}`
	);
	for (const f of convertFailures) {
		console.log(`  - [${path.basename(pendingArg ?? '')}] ${f.nodeId}（変換できない）`);
		console.log(`      ${f.reason}`);
	}
	for (const r of result.rejected) {
		const where = r.questionId ? `${r.nodeId}/${r.questionId}` : r.nodeId;
		console.log(`  - [${r.file}] ${where}`);
		for (const reason of r.reasons) console.log(`      ${reason}`);
	}
	if (FAIL_ON_REJECT && (result.rejected.length > 0 || convertFailures.length > 0)) process.exitCode = 1;
}

await main();
