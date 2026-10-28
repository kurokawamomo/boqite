import type { LessonSummary } from './session';

/**
 * ノードクリアの進捗を保存する。
 *
 * `$lib/components/lesson/streak.ts` の fetch ヘルパーは `res.ok` を見て失敗を
 * `null` として呼び出し側に伝えるが、この進捗POSTは元々 `void fetch(...)` の
 * fire-and-forget で呼ばれており、失敗しても誰も気づけなかった
 * （ネットワーク不調・HMRによるページ遷移中断等で `node_progress`/`attempts` が
 * 書き込まれないまま「クリア画面」だけは表示される）。
 *
 * 同じ書き込みが失われるとユーザーの体感は「進捗が記録されなくなることがある」になるため、
 * 数回リトライしてから失敗を呼び出し側に返す形にする。
 */
export async function submitLessonProgress(
	nodeId: string,
	summary: LessonSummary,
	options: { retries?: number; retryDelayMs?: number } = {}
): Promise<boolean> {
	const retries = options.retries ?? 2;
	const retryDelayMs = options.retryDelayMs ?? 300;

	for (let attempt = 0; attempt <= retries; attempt++) {
		const ok = await postOnce(nodeId, summary);
		if (ok) return true;
		if (attempt < retries) await sleep(retryDelayMs * (attempt + 1));
	}
	return false;
}

async function postOnce(nodeId: string, summary: LessonSummary): Promise<boolean> {
	try {
		const res = await fetch('/api/progress/lesson-complete', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ nodeId, result: summary.result, attempts: summary.attempts })
		});
		return res.ok;
	} catch {
		return false;
	}
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
