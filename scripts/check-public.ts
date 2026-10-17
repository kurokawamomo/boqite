import { execFileSync } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { findBlockedWords, parseBlocklist, toEre } from '$lib/publicCheck';

/**
 * 公開前チェック。リポジトリ内のファイル（追跡中と未追跡で無視されないもの）に、
 * 語リストの語が入っていないかを調べる。見つかったら exit 1。
 *
 * 語リストはリポジトリの外のファイル（.spec/public-blocklist.txt）を引数で渡す。
 * リポジトリ内に語を書かないための作りで、リポジトリ内にあるリストは拒否する。
 *
 * 実行: pnpm run check:public -- <語リスト.txt> [--history]
 *   --history  過去のコミット（全ブランチの差分とメッセージ）にも語がないか調べる。語を含むコミットの ID だけを出す
 */

const args = process.argv.slice(3);
const listPath = args.find((a) => !a.startsWith('--'));
const WITH_HISTORY = args.includes('--history');

function git(...gitArgs: string[]): string {
	return execFileSync('git', gitArgs, { encoding: 'utf-8', maxBuffer: 1024 * 1024 * 512 });
}

function isInsideRepoAndNotIgnored(file: string, root: string): boolean {
	if (!file.startsWith(root + path.sep)) return false;
	try {
		git('check-ignore', '-q', file);
		return false;
	} catch {
		return true;
	}
}

async function main() {
	if (!listPath) {
		console.error('使い方: check-public.ts <語リスト.txt> [--history]');
		process.exit(2);
	}
	const root = git('rev-parse', '--show-toplevel').trim();
	const absList = path.resolve(listPath);
	if (isInsideRepoAndNotIgnored(absList, root)) {
		console.error('語リストがリポジトリ内にあり、追跡対象になりえます。リポジトリの外（.spec/ など）に置いてください');
		process.exit(2);
	}
	const words = parseBlocklist(await readFile(absList, 'utf-8'));
	if (words.length === 0) {
		console.error('語リストが空です');
		process.exit(2);
	}

	const listed = git('ls-files', '--cached', '--others', '--exclude-standard', '-z')
		.split('\0')
		.filter((p) => p.length > 0);
	const files: Array<{ path: string; content: string }> = [];
	for (const p of listed) {
		const abs = path.join(root, p);
		let info;
		try {
			info = await stat(abs);
		} catch {
			continue; // 削除済みで未ステージのもの
		}
		if (!info.isFile() || info.size > 5 * 1024 * 1024) continue;
		const buf = await readFile(abs);
		if (buf.includes(0)) continue; // バイナリ
		files.push({ path: p, content: buf.toString('utf-8') });
	}

	const hits = findBlockedWords(files, words);
	for (const h of hits) {
		console.log(`  - ${h.path}${h.line > 0 ? `:${h.line}` : '（パス名）'}  「${h.word}」`);
	}

	let historyCommits = 0;
	if (WITH_HISTORY) {
		const found = new Set<string>();
		for (const word of words) {
			const ere = toEre(word);
			const byDiff = git('log', '--all', '--format=%h', '-i', '-E', `-G${ere}`).split('\n');
			const byMessage = git('log', '--all', '--format=%h', '-i', '-E', `--grep=${ere}`).split('\n');
			for (const id of [...byDiff, ...byMessage]) if (id) found.add(id);
		}
		historyCommits = found.size;
		if (found.size > 0) console.log(`  - 履歴に語を含むコミット ${found.size} 件: ${[...found].join(' ')}`);

		// 過去のコミットに残るファイル名
		const pastPaths = [...new Set(git('log', '--all', '--name-only', '--format=').split('\n').filter((p) => p.length > 0))];
		const pathHits = findBlockedWords(pastPaths.map((p) => ({ path: p, content: '' })), words);
		historyCommits += pathHits.length;
		for (const h of pathHits) console.log(`  - 履歴のファイル名: ${h.path}  「${h.word}」`);
	}

	if (hits.length === 0 && historyCommits === 0) {
		console.log(`OK: ${files.length} ファイルに語リストの語はありません${WITH_HISTORY ? '（履歴も確認）' : ''}`);
		return;
	}
	console.log(`公開前に直すもの: ファイル内 ${hits.length} 件${WITH_HISTORY ? `、履歴 ${historyCommits} コミット` : ''}`);
	process.exitCode = 1;
}


await main();
