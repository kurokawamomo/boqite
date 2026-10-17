import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { checkNewAccounts, checkQuestion } from '$lib/content/checks';
import { INTERNAL_COURSES, INTERNAL_COURSE_ORDER } from '$lib/content/courses';
import { setAccountChapters } from '$lib/content/accountsFile';
import { assignNewAccounts } from '$lib/content/newAccounts';
import { isRecord } from '$lib/util/isRecord';

/**
 * content/boki3、content/boki2 の *.json のコンテンツ整合性検査（コースをまたいで ID と科目の初出を見る）。
 *
 * 検査項目:
 *   1. journal: 借方合計 === 貸方合計
 *   2. journal: 借方・貸方の正解科目がすべて accountOptions に含まれる
 *   3. journal: accountOptions / 正解科目が accounts.json に実在する
 *   4. journal: 同一科目の借方内・貸方内それぞれでの重複なし
 *   5. newAccounts: 科目が accounts.json に実在し、コース全体で初出が一意（重複紹介の検出）
 *   6. choice: answerIndex が options の範囲内
 *   7. match: pairs が空でない
 *   8. id（unit / node / question）の重複なし
 *   9. form_fill: blanks[].ref が document の実在セルを指す
 *  10. form_fill: ref 先セルの値が null（穴埋め対象として空である）
 *  11. form_fill: choice/chips/account_picker の選択肢が answer を含む
 *  12. form_fill: document.type が実在様式（DOCUMENT_TYPES）
 *  13. form_fill: blank.ref が画面に描画されるセル（formColumns.ts の列定義）を指す
 *  14. form_fill: blanks[].ref の重複なし
 *  15. form_fill: numpad の answer が電卓で入力できる整数（MAX_DIGITS 桁以内）
 *  21. 勘定科目の名前が重複していない（accounts.json）
 *  20. 科目マスタの chapter が、コースの並び順で最初に使われたユニットの章番号と一致する（使われていない科目は対象外）
 *  19. newAccounts が、コースの並び順で最初に使った問題への自動付与と一致する
 *  17. 問題文が「上記」「先ほど」など前問・上の資料に頼らず単独で読める
 *  18. 新コースのノード: id が b3-uNN-nN（2級は b2-uNN-nN）形式で、meta（到達目標・論点・問題数の下限）がある
 *  --strict-minimum: 問題数が meta.minQuestions に満たないノードを失敗扱いにする（既定は件数の表示のみ）
 *  16. form_fill: stimulus.document に blank の正解が書き込まれていない（画面に出る問題文の図が答えを漏らさない）
 *
 * 13 は描画部品（ColumnTable）と同じ列定義 src/lib/components/forms/formColumns.ts の
 * renderedCellRefs を読む。ref が実在しても列が画面に出なければ、入力欄が出ず判定に進めない。
 * 9-10 は src/lib/components/forms/refs.ts の getCell（ref 解決の実装そのもの）を、
 * 11 は src/lib/content/types.ts の blankOptions を、12 は src/lib/content/documents.ts の
 * DOCUMENT_TYPES を import して再利用する（重複実装しない）。11 の答え含有チェック自体は
 * src/lib/server/content/loader.ts の validateFormBlank（Lead実装）でも行われているが、
 * loader.ts は import.meta.glob（Vite 専用 API）を最上位で使うため esbuild 単体実行の
 * このスクリプトからは import できない。よって 11 のみ意図的に重複する（コメント参照）。
 *
 * エラーは source 付きで具体的に列挙し、0件なら exit 0（そうでなければ exit 1）。
 * 実行: pnpm run check:content
 * 追加コースも同じ検査にかける: pnpm run check:content -- --course-dir <フォルダ>
 *   （フォルダ構成は src/lib/server/content/externalCourse.ts を参照。units/*.json と任意の accounts.json を読む）
 */

const CONTENT_ROOT = path.resolve(process.cwd(), 'content');

/** `--course-dir <path>` または `--course-dir=<path>` */
function readCourseDirArg(argv: string[]): string | null {
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === '--course-dir') return argv[i + 1] ?? null;
		if (argv[i].startsWith('--course-dir=')) return argv[i].slice('--course-dir='.length);
	}
	return null;
}

const STRICT_MINIMUM = process.argv.includes('--strict-minimum');
const COURSE_DIR_ARG = readCourseDirArg(process.argv.slice(2));
const EXTERNAL_UNITS_DIR = COURSE_DIR_ARG ? path.join(path.resolve(COURSE_DIR_ARG), 'units') : null;

/** 検査する場所。追加コースを指定したときはそのフォルダだけ。そうでなければリポジトリ内のコースすべて */
const SOURCES: Array<{ label: string; dir: string; idPrefix: string | null }> = EXTERNAL_UNITS_DIR
	? [{ label: '追加コース', dir: EXTERNAL_UNITS_DIR, idPrefix: null }]
	: INTERNAL_COURSES.map((c) => ({ label: c.id, dir: path.resolve(process.cwd(), c.dir), idPrefix: c.idPrefix }));
const COURSE_ACCOUNTS_FILE = COURSE_DIR_ARG ? path.join(path.resolve(COURSE_DIR_ARG), 'accounts.json') : null;
const MAIN_ACCOUNTS_FILE = path.join(CONTENT_ROOT, 'accounts.json');

type UnitJson = { unit: Record<string, unknown>; nodes: Array<Record<string, unknown>> };

type ContentError = {
	file: string;
	nodeId: string;
	questionId: string;
	source: string;
	rule: string;
	message: string;
};

async function main() {
	const errors: ContentError[] = [];

	// 追加コースの科目は本体のマスタに足される（アプリの読み込みと同じ）ので、両方を有効な科目として扱う
	const accountNames = new Set<string>();
	for (const file of [MAIN_ACCOUNTS_FILE, COURSE_ACCOUNTS_FILE]) {
		if (!file) continue;
		let raw: unknown;
		try {
			raw = JSON.parse(await readFile(file, 'utf-8'));
		} catch (e) {
			if (file === COURSE_ACCOUNTS_FILE && (e as NodeJS.ErrnoException).code === 'ENOENT') continue;
			throw e;
		}
		for (const a of Array.isArray(raw) ? raw : []) {
			if (!isRecord(a) || typeof a.name !== 'string') continue;
			// 科目名の重複（同じ科目が 2 行ある）
			if (accountNames.has(a.name)) {
				errors.push({ file: path.basename(file), nodeId: '', questionId: '', source: '', rule: 'account-duplicate-name', message: `科目名 "${a.name}" が重複しています` });
			}
			accountNames.add(a.name);
		}
	}

	const loaded: Array<{ label: string; raw: string; data: UnitJson }> = [];
	const shortfalls: Array<{ file: string; nodeId: string; have: number; need: number }> = [];
	const unitIds = new Map<string, string>(); // id -> file
	const nodeIds = new Map<string, string>(); // id -> file
	const questionIds = new Map<string, string>(); // id -> file
	// 科目名 -> newAccounts で最初に紹介した [file, nodeId, questionId]（コースをまたいで 1 回だけ）
	const firstIntroducedBy = new Map<string, { file: string; nodeId: string; questionId: string }>();

	for (const source of SOURCES) {
		const names = (await readdir(source.dir)).filter((f) => f.endsWith('.json')).sort();
		for (const name of names) {
			const file = source.idPrefix ? `${source.label}/${name}` : name;
			const raw = await readFile(path.join(source.dir, name), 'utf-8');
			const parsed = JSON.parse(raw);
			loaded.push({ label: file, raw, data: parsed });

			const unitId: string = parsed?.unit?.id ?? '(unknown unit)';
			checkDuplicateId(unitIds, unitId, file, errors, {
				file,
				nodeId: '(unit)',
				questionId: '',
				source: '',
				rule: 'duplicate-id'
			});

			const nodes = Array.isArray(parsed?.nodes) ? parsed.nodes : [];
			for (const node of nodes) {
				const nodeId: string = node?.id ?? '(unknown node)';
				checkDuplicateId(nodeIds, nodeId, file, errors, {
					file,
					nodeId,
					questionId: '',
					source: '',
					rule: 'duplicate-id'
				});

				const questions = Array.isArray(node?.questions) ? node.questions : [];
				if (source.idPrefix) {
					const nodeIssue = (rule: string, message: string) =>
						errors.push({ file, nodeId, questionId: '', source: '', rule, message });
					if (!new RegExp(`^${source.idPrefix}-u\\d{2}-n\\d+$`).test(nodeId)) {
						nodeIssue('node-id-format', `node id "${nodeId}" は ${source.idPrefix}-uNN-nN 形式ではありません`);
					}
					if (!isRecord(node.meta)) {
						nodeIssue('node-meta-missing', '"meta"（到達目標・論点・問題数の下限）がありません');
					} else if (typeof node.meta.minQuestions === 'number' && questions.length < node.meta.minQuestions) {
						shortfalls.push({ file, nodeId, have: questions.length, need: node.meta.minQuestions });
					}
				}
				for (const q of questions) {
					const questionId: string = q?.id ?? '(unknown question)';
					const questionSource: string = q?.source ?? '(unknown source)';
					const push = (rule: string, message: string) =>
						errors.push({ file, nodeId, questionId, source: questionSource, rule, message });

					checkDuplicateId(questionIds, questionId, file, errors, {
						file,
						nodeId,
						questionId,
						source: questionSource,
						rule: 'duplicate-id'
					});

					for (const issue of checkQuestion(q, accountNames)) push(issue.rule, issue.message);
					checkNewAccounts(q, file, nodeId, questionId, accountNames, firstIntroducedBy, push);
				}
			}
		}
	}

	// newAccounts は手で持たず、コースの並び順で最初に使った問題に自動で付く（import:drafts / gen:content）
	if (!COURSE_DIR_ARG) {
		const expected: UnitJson[] = loaded.map((u) => JSON.parse(u.raw));
		const firstUse = assignNewAccounts(expected, accountNames, INTERNAL_COURSE_ORDER);
		// 科目マスタの chapter も、最初に使われたユニットの章番号と一致していること
		const accountsText = await readFile(MAIN_ACCOUNTS_FILE, 'utf-8');
		if (setAccountChapters(accountsText, firstUse) !== accountsText) {
			errors.push({
				file: 'accounts.json',
				nodeId: '',
				questionId: '',
				source: '',
				rule: 'account-chapter-out-of-sync',
				message: '科目の chapter が、最初に使われたユニットの章番号と違います。pnpm run gen:content で付け直せます'
			});
		}
		loaded.forEach((unit, i) => {
			unit.data.nodes.forEach((node, ni) => {
				const qs = Array.isArray(node.questions) ? (node.questions as Array<Record<string, unknown>>) : [];
				qs.forEach((q, qi) => {
					const want = (expected[i].nodes[ni].questions as Array<Record<string, unknown>>)[qi].newAccounts;
					if (JSON.stringify(q.newAccounts) !== JSON.stringify(want)) {
						errors.push({
							file: unit.label,
							nodeId: String(node.id),
							questionId: String(q.id),
							source: String(q.source ?? ''),
							rule: 'new-accounts-out-of-sync',
							message: `newAccounts が自動付与の結果と違います（期待 ${JSON.stringify(want ?? [])}）。pnpm run gen:content で付け直せます`
						});
					}
				});
			});
		});
	}

	if (STRICT_MINIMUM) {
		for (const f of shortfalls) {
			errors.push({
				file: f.file,
				nodeId: f.nodeId,
				questionId: '',
				source: '',
				rule: 'node-below-minimum',
				message: `問題が ${f.have} 問で、下限 ${f.need} 問に足りません`
			});
		}
	} else if (shortfalls.length > 0) {
		const missing = shortfalls.reduce((sum, f) => sum + (f.need - f.have), 0);
		console.log(`情報: 下限に足りないノード ${shortfalls.length} 件（あと ${missing} 問）。--strict-minimum で失敗扱いにします`);
	}

	if (errors.length === 0) {
		console.log(COURSE_DIR_ARG ? 'OK: 追加コースの検証エラーはありません' : 'OK: content/boki3・content/boki2 の検証エラーはありません');
		return;
	}

	console.log(`検証エラー ${errors.length} 件:`);
	for (const e of errors) {
		const loc = e.questionId ? `${e.nodeId}/${e.questionId}` : e.nodeId;
		const src = e.source ? `  source=${e.source}` : '';
		console.log(`  - [${e.file}] ${loc} [${e.rule}] ${e.message}${src}`);
	}
	process.exitCode = 1;
}

function checkDuplicateId(
	registry: Map<string, string>,
	id: string,
	file: string,
	errors: ContentError[],
	base: ContentError
) {
	const existingFile = registry.get(id);
	if (existingFile) {
		errors.push({ ...base, message: `id "${id}" は [${existingFile}] と重複しています` });
	} else {
		registry.set(id, file);
	}
}

await main();
