import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import type { Account } from '$lib/content/types';
import type { ContentUnit, CourseInfo } from '$lib/content/course';
import { isRecord } from '$lib/util/isRecord';
import { ContentValidationError, validateAccount, validateUnitFile } from './validate';

/**
 * 追加コースの読み込み。フォルダ構成:
 *   course.json    { "id": string, "title": string, "persistProgress"?: boolean }
 *   units/*.json   content/boki3 と同じ型の Unit ファイル（unit.course は course.json の id と一致）
 *   accounts.json  任意。content/accounts.json と同じ型で、本体の勘定科目マスタに追加される
 *
 * 進捗（node_progress / attempts）には Unit・ノード・問題の id がそのまま入る。
 * id は教材の名前を持ち込まない短い記号にする（ID_PATTERN）。
 */

/** DB に入る id の形。短い英数字とハイフン・アンダースコアのみ */
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,23}$/;

function assertShortId(id: string, where: string): void {
	if (!ID_PATTERN.test(id)) {
		throw new ContentValidationError(`${where}: id "${id}" は英数字・-・_ の24文字以内にしてください`);
	}
}

export type ExternalCourse = {
	info: CourseInfo;
	units: ContentUnit[];
	accounts: Account[];
};

function readJson(file: string): unknown {
	try {
		return JSON.parse(readFileSync(file, 'utf-8'));
	} catch (e) {
		throw new ContentValidationError(`${path.basename(file)}: JSON を読み込めません (${(e as Error).message})`);
	}
}

function loadManifest(dir: string): CourseInfo {
	const file = path.join(dir, 'course.json');
	if (!existsSync(file)) throw new ContentValidationError('course.json が見つかりません');
	const raw = readJson(file);
	if (!isRecord(raw)) throw new ContentValidationError('course.json: トップレベルはオブジェクトである必要があります');
	if (typeof raw.id !== 'string' || raw.id.length === 0) {
		throw new ContentValidationError('course.json: "id" は必須の文字列です');
	}
	if (typeof raw.title !== 'string' || raw.title.length === 0) {
		throw new ContentValidationError('course.json: "title" は必須の文字列です');
	}
	if (raw.persistProgress !== undefined && typeof raw.persistProgress !== 'boolean') {
		throw new ContentValidationError('course.json: "persistProgress" は真偽値である必要があります');
	}
	assertShortId(raw.id, 'course.json');
	return { id: raw.id, title: raw.title, persistProgress: raw.persistProgress ?? true };
}

/** dir が空なら null（何も読まない）。指定があるのに読めない場合は例外にして設定ミスを隠さない */
export function loadExternalCourse(dir: string): ExternalCourse | null {
	if (dir.trim() === '') return null;
	if (!existsSync(dir) || !statSync(dir).isDirectory()) {
		throw new ContentValidationError('COURSE_DIR がフォルダではありません');
	}

	const info = loadManifest(dir);

	const unitsDir = path.join(dir, 'units');
	if (!existsSync(unitsDir)) throw new ContentValidationError('units フォルダが見つかりません');
	const files = readdirSync(unitsDir)
		.filter((f) => f.endsWith('.json'))
		.sort();
	if (files.length === 0) throw new ContentValidationError('units に *.json が見つかりません');

	const units = files.map((file) => {
		const unit = validateUnitFile(readJson(path.join(unitsDir, file)), file);
		if (unit.course !== info.id) {
			throw new ContentValidationError(`${file}: unit.course("${unit.course}") が course.json の id("${info.id}") と違います`);
		}
		assertShortId(unit.id, file);
		for (const node of unit.nodes) {
			assertShortId(node.id, file);
			for (const q of node.questions) assertShortId(q.id, file);
		}
		return unit;
	});
	units.sort((a, b) => a.chapter - b.chapter);

	const accountsFile = path.join(dir, 'accounts.json');
	let accounts: Account[] = [];
	if (existsSync(accountsFile)) {
		const raw = readJson(accountsFile);
		if (!Array.isArray(raw)) throw new ContentValidationError('accounts.json: トップレベルは配列である必要があります');
		accounts = raw.map((a, i) => validateAccount(a, `accounts.json[${i}]`));
	}

	return { info, units, accounts };
}

/** コース同士で id（コース / Unit / ノード / 問題）が衝突していないことを確かめる */
export function assertNoIdCollision(
	main: { info: CourseInfo; units: ContentUnit[] },
	external: { info: CourseInfo; units: ContentUnit[] }
): void {
	if (main.info.id === external.info.id) {
		throw new ContentValidationError(`course id "${external.info.id}" が、ほかのコースと重なっています`);
	}
	const seen = new Set<string>();
	for (const unit of main.units) {
		seen.add(unit.id);
		for (const node of unit.nodes) {
			seen.add(node.id);
			for (const q of node.questions) seen.add(q.id);
		}
	}
	for (const unit of external.units) {
		const ids = [unit.id, ...unit.nodes.flatMap((n) => [n.id, ...n.questions.map((q) => q.id)])];
		for (const id of ids) {
			if (seen.has(id)) throw new ContentValidationError(`id "${id}" が、ほかのコースと重なっています`);
		}
	}
}

/** COURSE_DIR の値を、フォルダの一覧にする。コロン区切り。空の要素は無視し、同じフォルダの重複は 1 つにする */
export function parseCourseDirs(value: string): string[] {
	const dirs = value
		.split(':')
		.map((d) => d.trim())
		.filter((d) => d.length > 0);
	return [...new Set(dirs)];
}

/**
 * 追加コースを順に読む。どれかが読めなければ、何番目のフォルダかを付けて例外にする。
 * base（本体など、すでにあるコース）と、先に読んだ追加コースの両方と id が重ならないことを確かめる。
 */
export function loadExternalCourses(
	dirs: readonly string[],
	base: ReadonlyArray<{ info: CourseInfo; units: ContentUnit[] }>
): ExternalCourse[] {
	const loaded: ExternalCourse[] = [];
	dirs.forEach((dir, i) => {
		const where = `COURSE_DIR の ${i + 1} 番目`;
		let course: ExternalCourse | null;
		try {
			course = loadExternalCourse(dir);
			if (course) for (const prior of [...base, ...loaded]) assertNoIdCollision(prior, course);
		} catch (e) {
			if (e instanceof ContentValidationError) throw new ContentValidationError(`${where}: ${e.message}`);
			throw e;
		}
		if (course) loaded.push(course);
	});
	return loaded;
}
