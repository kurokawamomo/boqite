import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * content/boki3/*.json を走査し、sanitized: false のまま残っている question を
 * source 付きで一覧出力する。元の教材の表現が残ったままの問題を検知するための検査スクリプト。
 *
 * 実行: pnpm run check:sanitize
 */

type Unsanitized = {
	file: string;
	nodeId: string;
	questionId: string;
	source: string;
};

const BOKI3_DIR = path.resolve(process.cwd(), 'content', 'boki3');

async function main() {
	const files = (await readdir(BOKI3_DIR)).filter((f) => f.endsWith('.json')).sort();
	const found: Unsanitized[] = [];

	for (const file of files) {
		const raw = await readFile(path.join(BOKI3_DIR, file), 'utf-8');
		const parsed = JSON.parse(raw);
		const nodes = Array.isArray(parsed?.nodes) ? parsed.nodes : [];

		for (const node of nodes) {
			const questions = Array.isArray(node?.questions) ? node.questions : [];
			for (const q of questions) {
				if (q?.sanitized === false) {
					found.push({
						file,
						nodeId: node.id ?? '(unknown node)',
						questionId: q.id ?? '(unknown question)',
						source: q.source ?? '(unknown source)'
					});
				}
			}
		}
	}

	if (found.length === 0) {
		console.log('OK: sanitized: false の問題はありません');
		return;
	}

	console.log(`未サニタイズ ${found.length} 件:`);
	for (const item of found) {
		console.log(`  - [${item.file}] ${item.nodeId}/${item.questionId}  source=${item.source}`);
	}
	process.exitCode = 1;
}

await main();
