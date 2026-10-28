/**
 * MatchTask の正誤判定（純粋ロジック）。
 *
 * pairIndex の一致ではなく表示内容の一致で判定する。
 * 同一カテゴリ名など、複数ペアで右側/左側の表示内容が重複するケースがあるため、
 * 「たまたま同じ index に生成された組」ではなく「pairs のいずれかの組として成立するか」で見る。
 */
export function isMatchingPair(
	pairs: ReadonlyArray<readonly [string, string]>,
	leftLabel: string,
	rightLabel: string
): boolean {
	return pairs.some(([left, right]) => left === leftLabel && right === rightLabel);
}
