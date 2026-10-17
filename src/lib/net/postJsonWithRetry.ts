/**
 * 失敗をサイレントに握りつぶさない POST ヘルパー。
 *
 * この機能が要る理由: `void fetch(...)` の fire-and-forget で書き込み系APIを叩くと、
 * ネットワーク不調やページ遷移によるリクエスト中断が起きても呼び出し側の誰も気づけず、
 * DB側は更新されないままUIだけ成功したように見える（node_progress/attempts が
 * 全く記録されなかった実障害の原因）。書き込みは常にこのヘルパー経由にし、
 * リトライしても失敗した場合だけ呼び出し側が判定できるようにする。
 */
export async function postJsonWithRetry<T>(
	url: string,
	body: unknown,
	options: { retries?: number; retryDelayMs?: number } = {}
): Promise<T | null> {
	const retries = options.retries ?? 2;
	const retryDelayMs = options.retryDelayMs ?? 300;

	for (let attempt = 0; attempt <= retries; attempt++) {
		const result = await postOnce<T>(url, body);
		if (result.ok) return result.value;
		if (attempt < retries) await sleep(retryDelayMs * (attempt + 1));
	}
	return null;
}

async function postOnce<T>(url: string, body: unknown): Promise<{ ok: true; value: T } | { ok: false }> {
	try {
		const res = await fetch(url, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});
		if (!res.ok) return { ok: false };
		return { ok: true, value: (await res.json()) as T };
	} catch {
		return { ok: false };
	}
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
