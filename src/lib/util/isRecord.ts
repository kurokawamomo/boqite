/** 値が配列でないオブジェクトかどうかを判定する（手書きバリデーション・セル参照解決の両方で使う） */
export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
