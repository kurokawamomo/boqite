import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { ContentUnit } from '$lib/content/course';
import { assertNoIdCollision, loadExternalCourse, loadExternalCourses, parseCourseDirs } from './externalCourse';
import { ContentValidationError, validateUnitFile } from './validate';

const dirs: string[] = [];

afterEach(() => {
	while (dirs.length > 0) rmSync(dirs.pop()!, { recursive: true, force: true });
});

function unitFile(courseId: string, unitId: string, chapter: number) {
	return {
		unit: { id: unitId, course: courseId, chapter, title: `架空の章${chapter}` },
		nodes: [
			{
				id: `${unitId}-n1`,
				title: '架空のレッスン',
				questions: [
					{
						id: `${unitId}-n1-q1`,
						source: 'fixture',
						sanitized: true,
						stimulus: { text: '1 + 1 は？' },
						task: { kind: 'choice', options: ['1', '2', '3'], answerIndex: 1 },
						explanation: '1 に 1 を足すと 2。'
					}
				]
			}
		]
	};
}

function makeCourseDir(options: {
	manifest?: Record<string, unknown> | null;
	units?: Array<[string, unknown]>;
	accounts?: unknown;
}): string {
	const dir = mkdtempSync(path.join(tmpdir(), 'fx-course-'));
	dirs.push(dir);
	if (options.manifest !== null) {
		writeFileSync(
			path.join(dir, 'course.json'),
			JSON.stringify(options.manifest ?? { id: 'fx-demo', title: '架空コース' })
		);
	}
	mkdirSync(path.join(dir, 'units'));
	for (const [name, body] of options.units ?? [[ 'a.json', unitFile('fx-demo', 'fx-u1', 1)]]) {
		writeFileSync(path.join(dir, 'units', name), JSON.stringify(body));
	}
	if (options.accounts !== undefined) writeFileSync(path.join(dir, 'accounts.json'), JSON.stringify(options.accounts));
	return dir;
}

describe('loadExternalCourse', () => {
	it('空文字・空白だけなら何も読まず null', () => {
		expect(loadExternalCourse('')).toBeNull();
		expect(loadExternalCourse('   ')).toBeNull();
	});

	it('course.json と units を読み、persistProgress の既定は true', () => {
		const course = loadExternalCourse(makeCourseDir({}));
		expect(course?.info).toEqual({ id: 'fx-demo', title: '架空コース', persistProgress: true });
		expect(course?.units.map((u) => u.id)).toEqual(['fx-u1']);
		expect(course?.accounts).toEqual([]);
	});

	it('persistProgress=false を読める', () => {
		const dir = makeCourseDir({ manifest: { id: 'fx-demo', title: '架空コース', persistProgress: false } });
		expect(loadExternalCourse(dir)?.info.persistProgress).toBe(false);
	});

	it('Unit は chapter 順に並ぶ', () => {
		const dir = makeCourseDir({
			units: [
				['a.json', unitFile('fx-demo', 'fx-u2', 2)],
				['b.json', unitFile('fx-demo', 'fx-u1', 1)]
			]
		});
		expect(loadExternalCourse(dir)?.units.map((u) => u.id)).toEqual(['fx-u1', 'fx-u2']);
	});

	it('accounts.json があれば読む', () => {
		const dir = makeCourseDir({
			accounts: [{ name: '架空科目', category: '資産', normalSide: 'debit', chapter: 1 }]
		});
		expect(loadExternalCourse(dir)?.accounts.map((a) => a.name)).toEqual(['架空科目']);
	});

	it('指定したフォルダが無ければ例外（設定ミスを黙って無視しない）', () => {
		expect(() => loadExternalCourse(path.join(tmpdir(), 'fx-not-exist-dir'))).toThrow(ContentValidationError);
	});

	it('course.json が無い・id が無い・persistProgress が真偽値でない場合は例外', () => {
		expect(() => loadExternalCourse(makeCourseDir({ manifest: null }))).toThrow(/course\.json/);
		expect(() => loadExternalCourse(makeCourseDir({ manifest: { title: 'x' } }))).toThrow(/"id"/);
		expect(() =>
			loadExternalCourse(makeCourseDir({ manifest: { id: 'a', title: 'x', persistProgress: 'no' } }))
		).toThrow(/persistProgress/);
	});

	it('DB に入る id が長い・日本語・記号入りなら例外（教材名を id に入れさせない）', () => {
		expect(() => loadExternalCourse(makeCourseDir({ manifest: { id: '教材名', title: 'x' } }))).toThrow(/id/);
		expect(() =>
			loadExternalCourse(makeCourseDir({ units: [['a.json', unitFile('fx-demo', 'x'.repeat(25), 1)]] }))
		).toThrow(/24文字/);
		expect(() =>
			loadExternalCourse(makeCourseDir({ units: [['a.json', unitFile('fx-demo', 'fx u1', 1)]] }))
		).toThrow(/fx u1/);
	});

	it('Unit の course が course.json の id と違えば例外', () => {
		const dir = makeCourseDir({ units: [['a.json', unitFile('fx-other', 'fx-u1', 1)]] });
		expect(() => loadExternalCourse(dir)).toThrow(/fx-other/);
	});

	it('本体と同じ検証が掛かる（answerIndex が範囲外なら例外）', () => {
		const broken = unitFile('fx-demo', 'fx-u1', 1);
		broken.nodes[0].questions[0].task = { kind: 'choice', options: ['1', '2'], answerIndex: 5 };
		expect(() => loadExternalCourse(makeCourseDir({ units: [['a.json', broken]] }))).toThrow(/answerIndex/);
	});
});

describe('assertNoIdCollision', () => {
	const asUnit = (courseId: string, unitId: string): ContentUnit =>
		validateUnitFile(unitFile(courseId, unitId, 1), `${unitId}.json`);
	const mainUnits = [asUnit('fx-main', 'fx-m1')];
	const base = (id: string) => ({ id, title: 't', persistProgress: true });

	it('重ならなければ通る', () => {
		const ext = [asUnit('fx-demo', 'fx-u1')];
		expect(() =>
			assertNoIdCollision({ info: base('fx-main'), units: mainUnits }, { info: base('fx-demo'), units: ext })
		).not.toThrow();
	});

	it('course id が同じなら例外', () => {
		expect(() =>
			assertNoIdCollision({ info: base('fx-main'), units: mainUnits }, { info: base('fx-main'), units: [] })
		).toThrow(/course id/);
	});

	it('ノード id が本体と重なれば例外', () => {
		const ext = [asUnit('fx-demo', 'fx-m1')];
		expect(() =>
			assertNoIdCollision({ info: base('fx-main'), units: mainUnits }, { info: base('fx-demo'), units: ext })
		).toThrow(/fx-m1/);
	});
});

describe('parseCourseDirs', () => {
	it('コロン区切りで複数のフォルダを取り出す', () => {
		expect(parseCourseDirs('/a/c1:/a/c2')).toEqual(['/a/c1', '/a/c2']);
	});

	it('1 つだけ・空・空白だけにも対応する', () => {
		expect(parseCourseDirs('/a/c1')).toEqual(['/a/c1']);
		expect(parseCourseDirs('')).toEqual([]);
		expect(parseCourseDirs('  ')).toEqual([]);
	});

	it('空の要素（末尾や連続のコロン）は無視し、前後の空白を落とす', () => {
		expect(parseCourseDirs('/a/c1: /a/c2 :')).toEqual(['/a/c1', '/a/c2']);
		expect(parseCourseDirs('::/a/c1::/a/c2')).toEqual(['/a/c1', '/a/c2']);
	});

	it('同じフォルダの重複は 1 つにする（順序は保つ）', () => {
		expect(parseCourseDirs('/a/c2:/a/c1:/a/c2')).toEqual(['/a/c2', '/a/c1']);
	});
});

describe('loadExternalCourses', () => {
	const base = [
		{
			info: { id: 'fx-main', title: 't', persistProgress: true },
			units: [validateUnitFile(unitFile('fx-main', 'fx-m1', 1), 'm.json')]
		}
	];
	const courseDir = (id: string, unitId: string, extra: { accounts?: unknown; persistProgress?: boolean } = {}) =>
		makeCourseDir({
			manifest: { id, title: `架空の${id}`, ...(extra.persistProgress === undefined ? {} : { persistProgress: extra.persistProgress }) },
			units: [['a.json', unitFile(id, unitId, 1)]],
			accounts: extra.accounts
		});

	it('複数のフォルダを、指定した順に読む', () => {
		const loaded = loadExternalCourses([courseDir('fx-one', 'fx-1u'), courseDir('fx-two', 'fx-2u')], base);
		expect(loaded.map((c) => c.info.id)).toEqual(['fx-one', 'fx-two']);
		expect(loaded.map((c) => c.units[0].id)).toEqual(['fx-1u', 'fx-2u']);
	});

	it('フォルダが 1 つでも、0 個でも動く', () => {
		expect(loadExternalCourses([courseDir('fx-one', 'fx-1u')], base)).toHaveLength(1);
		expect(loadExternalCourses([], base)).toEqual([]);
	});

	it('コースごとに進捗を保存するかを決められる', () => {
		const loaded = loadExternalCourses(
			[courseDir('fx-one', 'fx-1u'), courseDir('fx-two', 'fx-2u', { persistProgress: false })],
			base
		);
		expect(loaded.map((c) => c.info.persistProgress)).toEqual([true, false]);
	});

	it('コースごとの勘定科目マスタをそれぞれ読む', () => {
		const acc = (name: string) => [{ name, category: '資産', normalSide: 'debit', chapter: 1 }];
		const loaded = loadExternalCourses(
			[courseDir('fx-one', 'fx-1u', { accounts: acc('架空科目A') }), courseDir('fx-two', 'fx-2u', { accounts: acc('架空科目B') })],
			base
		);
		expect(loaded.map((c) => c.accounts[0].name)).toEqual(['架空科目A', '架空科目B']);
	});

	it('追加コース同士で course id が同じなら例外', () => {
		expect(() =>
			loadExternalCourses([courseDir('fx-one', 'fx-1u'), courseDir('fx-one', 'fx-2u')], base)
		).toThrow(/2 番目.*course id/);
	});

	it('追加コース同士でノード id が重なれば例外', () => {
		expect(() =>
			loadExternalCourses([courseDir('fx-one', 'fx-1u'), courseDir('fx-two', 'fx-1u')], base)
		).toThrow(/2 番目.*fx-1u/);
	});

	it('本体のコースと id が重なれば、何番目かを付けて例外', () => {
		expect(() => loadExternalCourses([courseDir('fx-one', 'fx-m1')], base)).toThrow(/1 番目.*fx-m1/);
	});

	it('途中のフォルダが読めなければ、何番目かを付けて例外（黙って飛ばさない）', () => {
		expect(() =>
			loadExternalCourses([courseDir('fx-one', 'fx-1u'), path.join(tmpdir(), 'fx-not-exist-dir')], base)
		).toThrow(/2 番目/);
	});
});
