import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { INTERNAL_COURSES, INTERNAL_COURSE_ORDER } from '$lib/content/courses';
import { setAccountChapters } from '$lib/content/accountsFile';
import { assignNewAccounts } from '$lib/content/newAccounts';
import { GENERATORS, questionsOf } from '$lib/generators';
import { isRecord } from '$lib/util/isRecord';

/**
 * 生成器（src/lib/generators）が決めたシードから問題を作り、content/boki3・content/boki2 の *.json に書き出す。
 * 実行時に乱数は使わない。同じシードなら同じ JSON になる。
 *
 * 書き出し先は、ノードの questions のうち `generated.generator` が生成器の ID と一致するもの。
 * 手書きの問題には触れない。生成器から外した問題は、次の実行で消える。
 *
 * 実行: pnpm run gen:content           書き出す
 *       pnpm run gen:content -- --check  書き出さず、JSON が最新か確かめる（古ければ exit 1）
 */

const CHECK_ONLY = process.argv.includes('--check');

type UnitFile = { unit: Record<string, unknown>; nodes: Array<Record<string, unknown>> };

async function main() {
	const units = new Map<string, { dir: string; name: string; data: UnitFile; before: string }>();
	for (const course of INTERNAL_COURSES) {
		const dir = path.resolve(process.cwd(), course.dir);
		for (const name of (await readdir(dir)).filter((f) => f.endsWith('.json')).sort()) {
			const before = await readFile(path.join(dir, name), 'utf-8');
			units.set(`${course.id}/${name}`, { dir, name, data: JSON.parse(before) as UnitFile, before });
		}
	}

	const problems: string[] = [];
	for (const gen of GENERATORS) {
		const hit = [...units.values()].find((u) => u.data.nodes.some((n) => n.id === gen.nodeId));
		const node = hit?.data.nodes.find((n) => n.id === gen.nodeId);
		if (!hit || !node) {
			problems.push(`生成器 ${gen.id}: ノード ${gen.nodeId} が content にありません`);
			continue;
		}
		const meta = isRecord(node.meta) ? node.meta : undefined;
		if (meta && meta.topic !== gen.topic) {
			problems.push(`生成器 ${gen.id}: 論点 "${gen.topic}" がノードの meta.topic "${String(meta.topic)}" と違います`);
		}
		const existing = Array.isArray(node.questions) ? (node.questions as Array<Record<string, unknown>>) : [];
		const kept = existing.filter((q) => !(isRecord(q.generated) && q.generated.generator === gen.id));
		node.questions = [...kept, ...questionsOf(gen)];
	}
	if (problems.length > 0) {
		for (const p of problems) console.log(`  - ${p}`);
		process.exitCode = 1;
		return;
	}

	// 生成した問題にも、科目の初出（newAccounts）をコースの並び順で付け直す。
	// 科目マスタの chapter も、最初に使われたユニットの章番号に合わせる
	const accountsPath = path.resolve(process.cwd(), 'content', 'accounts.json');
	const accountsBefore = await readFile(accountsPath, 'utf-8');
	const accountsRaw = JSON.parse(accountsBefore);
	const accountNames = new Set<string>(
		(Array.isArray(accountsRaw) ? accountsRaw : []).flatMap((a: unknown) =>
			isRecord(a) && typeof a.name === 'string' ? [a.name] : []
		)
	);
	const firstUse = assignNewAccounts([...units.values()].map((u) => u.data), accountNames, INTERNAL_COURSE_ORDER);
	const accountsAfter = setAccountChapters(accountsBefore, firstUse);

	let changed = 0;
	for (const [label, u] of units) {
		const after = JSON.stringify(u.data, null, 2) + '\n';
		if (after === u.before) continue;
		changed += 1;
		if (CHECK_ONLY) console.log(`  - ${label} が最新ではありません`);
		else await writeFile(path.join(u.dir, u.name), after);
	}

	if (accountsAfter !== accountsBefore) {
		changed += 1;
		if (CHECK_ONLY) console.log('  - content/accounts.json の chapter が最新ではありません');
		else await writeFile(accountsPath, accountsAfter);
	}

	if (CHECK_ONLY) {
		console.log(changed === 0 ? 'OK: 生成した問題は最新です' : `古いファイル ${changed} 件。pnpm run gen:content で更新してください`);
		if (changed > 0) process.exitCode = 1;
		return;
	}
	console.log(`生成器 ${GENERATORS.length} 本、更新したファイル ${changed} 件`);
}

await main();
