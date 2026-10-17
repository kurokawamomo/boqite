/**
 * 公開前チェックの照合（純粋関数）。語リストはリポジトリの外から読み、ここには語を書かない。
 */

export type BlockedHit = { path: string; line: number; word: string };

/** 語リストの本文を語の配列にする。空行と # から始まる行は無視する */
export function parseBlocklist(text: string): string[] {
	return text
		.split(/\r?\n/)
		.map((l) => l.trim())
		.filter((l) => l.length > 0 && !l.startsWith('#'));
}

/** 英字は大文字小文字を区別せず、全角半角の違いも揃えて照合する */
function normalize(s: string): string {
	return s.normalize('NFKC').toLowerCase();
}

const ASCII_WORD = /^[A-Za-z0-9]+$/;

/**
 * 英数字だけの語は、前後が英数字でないところにだけ当てる（短い語が static や extract に当たらないように）。
 * 日本語など、それ以外の語は部分一致。
 */
function matcher(word: string): (text: string) => boolean {
	const key = normalize(word);
	if (!ASCII_WORD.test(key)) return (text) => normalize(text).includes(key);
	const re = new RegExp(`(?<![a-z0-9])${key}(?![a-z0-9])`);
	return (text) => re.test(normalize(text));
}

export function findBlockedWords(
	files: ReadonlyArray<{ path: string; content: string }>,
	words: readonly string[]
): BlockedHit[] {
	const needles = words.map((w) => ({ word: w, test: matcher(w) }));
	const hits: BlockedHit[] = [];
	for (const file of files) {
		// パス名にも語が入りうる
		for (const n of needles) {
			if (n.test(file.path)) hits.push({ path: file.path, line: 0, word: n.word });
		}
		const lines = file.content.split('\n');
		lines.forEach((line, i) => {
			for (const n of needles) {
				if (n.test(line)) hits.push({ path: file.path, line: i + 1, word: n.word });
			}
		});
	}
	return hits;
}

/**
 * git の拡張正規表現にする。英数字だけの語は、前後が英数字でないところにだけ当てる
 * （ファイルの照合と同じ。短い語が static などに当たらないように）。
 */
export function toEre(word: string): string {
	const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	return /^[A-Za-z0-9]+$/.test(word) ? `(^|[^A-Za-z0-9])${escaped}([^A-Za-z0-9]|$)` : escaped;
}
