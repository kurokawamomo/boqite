export const DAY_MS = 24 * 60 * 60 * 1000;

/** 'YYYY-MM-DD' を UTC 起点の日数（エポック日数）に変換する */
export function toEpochDays(date: string): number {
	const [y, m, d] = date.split('-').map(Number);
	return Date.UTC(y, m - 1, d) / DAY_MS;
}

/** UTC 起点の日数を 'YYYY-MM-DD' に変換する */
export function fromEpochDays(days: number): string {
	const t = new Date(days * DAY_MS);
	const y = t.getUTCFullYear();
	const m = String(t.getUTCMonth() + 1).padStart(2, '0');
	const d = String(t.getUTCDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * サーバ側の既定値算出用: 現在時刻を JST(UTC+9) 基準の 'YYYY-MM-DD' にする。
 * ストリークは「クリア時点のローカル日付」で判定する仕様のため、日本ユーザー向けの
 * 既定値（クライアントが date を送らなかった場合のフォールバック等）はこれを使う。
 */
export function todayInJst(now: number = Date.now()): string {
	return new Date(now + JST_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * クライアント側で使う想定: 与えた Date の「実行環境のローカルタイムゾーン」での
 * 'YYYY-MM-DD' を返す。ブラウザで呼べば端末のタイムゾーン（iPhone Safari なら JST）
 * がそのまま反映される。`toISOString()` は UTC 変換されるため使わないこと。
 */
export function localDateString(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}
