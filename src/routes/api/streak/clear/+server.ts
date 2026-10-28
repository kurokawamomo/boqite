import { json } from '@sveltejs/kit';
import { recordClear } from '$lib/server/streak/service';
import type { RequestHandler } from './$types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * クライアント送信のタイムスタンプを信頼する仕様（端末時刻を正とする）。
 * `clearedAt` はクライアントの実行環境の**ローカルタイムゾーン**での日時文字列
 * （例: `$lib/streak/date` の `localDateString(new Date())` が返す 'YYYY-MM-DD'、
 * あるいはその末尾に時刻を付けたもの）を想定する。`new Date().toISOString()`
 * のような UTC 変換済み文字列を送ると、JST 0:00〜8:59 のクリアが前日扱いになる
 * ため送らないこと。サーバ側はタイムゾーン変換をせず先頭 10 文字をそのまま使う。
 */
function extractDate(clearedAt: string): string {
	return clearedAt.slice(0, 10);
}

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	const clearedAt = body?.clearedAt;

	if (typeof clearedAt !== 'string') {
		return json(
			{ error: 'clearedAt (local YYYY-MM-DD, not toISOString()) is required' },
			{ status: 400 }
		);
	}

	const date = extractDate(clearedAt);
	if (!DATE_RE.test(date)) {
		return json({ error: 'clearedAt must start with YYYY-MM-DD' }, { status: 400 });
	}

	const summary = await recordClear(date);
	return json(summary);
};
