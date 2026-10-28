import type { CourseSummary } from '$lib/content/course';

/**
 * コースの解放条件。コース ID → 条件。ここだけを書き換えれば、解放のしかたが切り替わる。
 * 載っていないコース（日商3級など）は、いつでも開く。
 *
 * - open: いつでも開く
 * - units-cleared: 指定したユニットのレッスン（練習・復習は含まない）をすべてクリアしたら開く
 */
export type CourseUnlockRule = { kind: 'open' } | { kind: 'units-cleared'; unitIds: string[] };

export const COURSE_UNLOCK_RULES: Record<string, CourseUnlockRule> = {
	// 日商2級: 日商3級の U18（決算をまとめる）の全レッスンをクリアしたら開く
	boki2: { kind: 'units-cleared', unitIds: ['b3-u18'] }
};

/**
 * @param summaries 全コースの要約（条件に出てくるユニットを探す）
 * @param clearedNodeIds クリア済みのノード ID
 * 条件のユニットが見つからない（設定の誤り）ときは、開かない側に倒す。
 */
export function isCourseUnlocked(
	courseId: string,
	summaries: readonly CourseSummary[],
	clearedNodeIds: ReadonlySet<string>,
	rules: Record<string, CourseUnlockRule> = COURSE_UNLOCK_RULES
): boolean {
	const rule = rules[courseId] ?? { kind: 'open' };
	if (rule.kind === 'open') return true;

	const units = summaries.flatMap((s) => s.units);
	return rule.unitIds.every((unitId) => {
		const unit = units.find((u) => u.id === unitId);
		if (!unit) return false;
		const lessons = unit.nodes.filter((n) => n.kind === 'lesson');
		return lessons.length > 0 && lessons.every((n) => clearedNodeIds.has(n.id));
	});
}
