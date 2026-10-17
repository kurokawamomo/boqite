/**
 * リポジトリ内のコース（content/ の下）。並び順が、科目の初出（newAccounts）を付ける順になる。
 * 日商2級は、日商3級で出た科目を紹介し直さない。
 */
export const INTERNAL_COURSES = [
	{ id: 'boki3', dir: 'content/boki3', idPrefix: 'b3' },
	{ id: 'boki2', dir: 'content/boki2', idPrefix: 'b2' }
] as const;

export type InternalCourse = (typeof INTERNAL_COURSES)[number];

export const INTERNAL_COURSE_ORDER: string[] = INTERNAL_COURSES.map((c) => c.id);
