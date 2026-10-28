import { describe, expect, it } from 'vitest';
import type { CourseSummary, NodeKind } from '$lib/content/course';
import { type CourseUnlockRule, COURSE_UNLOCK_RULES, isCourseUnlocked } from './unlock';
import { validateUnitFile } from '$lib/server/content/validate';

const node = (id: string, kind: NodeKind = 'lesson') => ({ id, title: id, kind, questionCount: 1 });
const summary = (units: Array<{ id: string; nodes: ReturnType<typeof node>[] }>): CourseSummary => ({
	units: units.map((u, i) => ({ ...u, course: 'c', chapter: i + 1, title: u.id }))
});

const course3 = summary([
	{ id: 'b3-u17', nodes: [node('a1'), node('a2')] },
	{ id: 'b3-u18', nodes: [node('x1'), node('p-x1', 'practice'), node('x2'), node('review-b3-u18', 'review-unit')] }
]);
const rule: Record<string, CourseUnlockRule> = { boki2: { kind: 'units-cleared', unitIds: ['b3-u18'] } };

describe('isCourseUnlocked', () => {
	it('条件が無いコースは、いつでも開く', () => {
		expect(isCourseUnlocked('boki3', [course3], new Set(), rule)).toBe(true);
	});

	it('指定ユニットのレッスンがすべてクリア済みなら開く（練習・復習は問わない）', () => {
		expect(isCourseUnlocked('boki2', [course3], new Set(['x1', 'x2']), rule)).toBe(true);
	});

	it('レッスンが 1 つでも残っていれば開かない', () => {
		expect(isCourseUnlocked('boki2', [course3], new Set(['x1']), rule)).toBe(false);
		expect(isCourseUnlocked('boki2', [course3], new Set(), rule)).toBe(false);
	});

	it('他のユニットのクリアでは開かない', () => {
		expect(isCourseUnlocked('boki2', [course3], new Set(['a1', 'a2']), rule)).toBe(false);
	});

	it('条件を open に替えれば、クリアなしで開く（設定 1 か所の切り替え）', () => {
		expect(isCourseUnlocked('boki2', [course3], new Set(), { boki2: { kind: 'open' } })).toBe(true);
	});

	it('条件に出てくるユニットが無い（設定の誤り）ときは、開かない', () => {
		expect(isCourseUnlocked('boki2', [course3], new Set(['x1', 'x2']), { boki2: { kind: 'units-cleared', unitIds: ['nope'] } })).toBe(false);
	});

	it('複数のユニットを条件にできる', () => {
		const both: Record<string, CourseUnlockRule> = { boki2: { kind: 'units-cleared', unitIds: ['b3-u17', 'b3-u18'] } };
		expect(isCourseUnlocked('boki2', [course3], new Set(['x1', 'x2']), both)).toBe(false);
		expect(isCourseUnlocked('boki2', [course3], new Set(['a1', 'a2', 'x1', 'x2']), both)).toBe(true);
	});
});

describe('日商2級の解放条件（現在の設定）', () => {
	const modules = import.meta.glob<{ default: unknown }>('/content/boki3/*.json', { eager: true });
	const units = Object.entries(modules).map(([file, m]) => validateUnitFile(m.default, file));

	it('日商3級の U18（決算をまとめる）の全レッスンをクリアしたら開く', () => {
		expect(COURSE_UNLOCK_RULES.boki2).toEqual({ kind: 'units-cleared', unitIds: ['b3-u18'] });
		const u18 = units.find((u) => u.id === 'b3-u18')!;
		const actual = summary(units.map((u) => ({ id: u.id, nodes: u.nodes.map((n) => node(n.id, n.kind)) })));
		const lessons = u18.nodes.map((n) => n.id);
		expect(isCourseUnlocked('boki2', [actual], new Set(lessons))).toBe(true);
		expect(isCourseUnlocked('boki2', [actual], new Set(lessons.slice(1)))).toBe(false);
		expect(isCourseUnlocked('boki2', [actual], new Set())).toBe(false);
	});
});
