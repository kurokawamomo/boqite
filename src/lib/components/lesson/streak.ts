import type { StreakSummary } from '$lib/server/streak/service';

/**
 * クリア画面のストリーク/フリーズ表示用フェッチヘルパー（DBは/api/streak系が所有）。
 *
 * レスポンス型はサーバの StreakSummary を型のみ re-export する（レビュー🟡-4）。
 * 別名で手書きした独立コピーを持つと、サーバ側のフィールドが変わったときに
 * クライアント側だけ気づかず乖離する。名前は既存呼び出し側に合わせ StreakClearResult のまま。
 */
export type StreakClearResult = StreakSummary;

/** 失敗しても null を返すだけで例外は投げない（クリア演出をネットワーク障害でブロックしないため） */
export async function fetchStreakSummary(): Promise<StreakClearResult | null> {
	try {
		const res = await fetch('/api/streak');
		if (!res.ok) return null;
		return (await res.json()) as StreakClearResult;
	} catch {
		return null;
	}
}

export async function postStreakClear(clearedAt: string): Promise<StreakClearResult | null> {
	try {
		const res = await fetch('/api/streak/clear', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ clearedAt })
		});
		if (!res.ok) return null;
		return (await res.json()) as StreakClearResult;
	} catch {
		return null;
	}
}
