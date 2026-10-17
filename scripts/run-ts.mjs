// vite が依存する esbuild の CLI バイナリを使い、追加パッケージなしで単発の .ts スクリプトを実行するランナー。
// 使い方: node scripts/run-ts.mjs scripts/check-sanitize.ts
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const target = process.argv[2];
if (!target) {
	console.error('usage: node scripts/run-ts.mjs <file.ts>');
	process.exit(1);
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const esbuildBin = path.join(repoRoot, 'node_modules', '.bin', 'esbuild');

// 出力先は node_modules の中。--packages=external の import（postgres など）を出力ファイルの位置から解決できるようにする
const cacheDir = path.join(repoRoot, 'node_modules', '.cache');
await mkdir(cacheDir, { recursive: true });
const dir = await mkdtemp(path.join(cacheDir, 'boqite-run-ts-'));
const outfile = path.join(dir, 'entry.mjs');

let buildStatus = 0;
try {
	const result = spawnSync(
		esbuildBin,
		[
			path.resolve(target),
			`--outfile=${outfile}`,
			'--bundle',
			'--platform=node',
			'--format=esm',
			'--target=node20',
			'--packages=external',
			// SvelteKit の $lib エイリアスを Vite 外（esbuild 単体実行）でも解決する
			`--alias:$lib=${path.join(repoRoot, 'src', 'lib')}`
		],
		{ stdio: 'inherit' }
	);
	buildStatus = result.status ?? 1;
	if (buildStatus === 0) {
		await import(`${outfile}?t=${Date.now()}`);
	}
} finally {
	await rm(dir, { recursive: true, force: true });
}
process.exit(buildStatus !== 0 ? buildStatus : (process.exitCode ?? 0));
