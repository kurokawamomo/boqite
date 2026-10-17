import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import postgres from 'postgres';
import { withDynamicNodes } from '$lib/content/dynamicNodes';
import { type OldProgress, parseNodeMap, planMigration } from '$lib/migration/progress';
import { validateUnitFile } from '$lib/server/content/validate';

/**
 * 旧コースの進捗を新コースのノードへ引き継ぐ。
 *
 * 書き込むのは node_progress への INSERT だけ（既にある行は変えない）。
 * streak_logs・user_state・attempts には触れない。何度流しても結果は同じ。
 *
 * 使い方（DATABASE_URL の DB に対して実行する）:
 *   node scripts/run-ts.mjs scripts/migrate-progress.ts <対応表.json>                      予定を表示するだけ（書かない）
 *   node scripts/run-ts.mjs scripts/migrate-progress.ts <対応表.json> --apply              書き込む。DB 名が _test で終わるときだけ
 *   node scripts/run-ts.mjs scripts/migrate-progress.ts <対応表.json> --apply --allow-production   _test 以外の DB に書く
 *
 * 対応表は旧ノードの ID を含むので、リポジトリの外（.spec/migration/）に置く。
 */

// argv[2] は run-ts.mjs に渡したスクリプト自身
const args = process.argv.slice(3);
const mapPath = args.find((a) => !a.startsWith('--'));
const APPLY = args.includes('--apply');
const ALLOW_PRODUCTION = args.includes('--allow-production');

async function loadNewCourse() {
	const dir = path.resolve(process.cwd(), 'content', 'boki3');
	const files = (await readdir(dir)).filter((f) => f.endsWith('.json')).sort();
	const units = [];
	for (const file of files) {
		units.push(validateUnitFile(JSON.parse(await readFile(path.join(dir, file), 'utf-8')), file));
	}
	return withDynamicNodes(units.sort((a, b) => a.chapter - b.chapter));
}

async function main() {
	if (!mapPath) {
		console.error('使い方: migrate-progress.ts <対応表.json> [--apply] [--allow-production]');
		process.exit(2);
	}
	const url = process.env.DATABASE_URL;
	if (!url) {
		console.error('DATABASE_URL が未設定です');
		process.exit(2);
	}
	const dbName = new URL(url).pathname.replace(/^\//, '');
	if (APPLY && !dbName.endsWith('_test') && !ALLOW_PRODUCTION) {
		console.error(`DB "${dbName}" は _test で終わらないため書き込みません。本番に書くなら --allow-production を付けてください`);
		process.exit(2);
	}

	const map = parseNodeMap(JSON.parse(await readFile(path.resolve(mapPath), 'utf-8')));
	const units = await loadNewCourse();

	const sql = postgres(url, { max: 1 });
	try {
		const rows = await sql<
			Array<{ node_id: string; cleared_at: Date | null; best_result: number | null }>
		>`select node_id, cleared_at, best_result from node_progress where cleared_at is not null`;
		const oldProgress = new Map<string, OldProgress>(
			rows.map((r) => [r.node_id, { clearedAt: r.cleared_at, bestResult: r.best_result }])
		);
		const existing = new Set(rows.map((r) => r.node_id));

		const plan = planMigration(map, units, oldProgress, existing);
		const fresh = plan.rows.filter((r) => !existing.has(r.nodeId));

		console.log(`DB: ${dbName}${APPLY ? '（書き込む）' : '（予定の表示のみ）'}`);
		console.log(`クリア済みの旧ノード行: ${rows.length}`);
		console.log(`新ノードでクリア済みにする行: ${plan.rows.length}（うち新規 ${fresh.length}、既存 ${plan.rows.length - fresh.length}）`);
		console.log(`引き継いだあとの現在地: ${plan.current ?? '（全ノードクリア済み）'}`);
		if (plan.unmapped.length > 0) console.log(`警告: 対応表に無い新ノード: ${plan.unmapped.join(', ')}`);
		if (plan.unknown.length > 0) console.log(`警告: 新コースに無い対応表のノード: ${plan.unknown.join(', ')}`);
		if (plan.unmapped.length > 0 || plan.unknown.length > 0) {
			process.exitCode = 1;
			return;
		}

		if (!APPLY) return;

		const now = new Date();
		await sql.begin(async (tx) => {
			for (const r of fresh) {
				await tx`
					insert into node_progress (node_id, cleared_at, best_result)
					values (${r.nodeId}, ${r.clearedAt ?? now}, ${r.bestResult})
					on conflict (node_id) do nothing`;
			}
		});
		console.log(`書き込み完了: ${fresh.length} 行`);
	} finally {
		await sql.end();
	}
}

await main();
