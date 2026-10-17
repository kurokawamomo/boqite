import type {
	Account,
	AccountRole,
	AmountInput,
	BlankInput,
	ChoiceTask,
	FormBlank,
	FormFillTask,
	JournalTask,
	MatchTask,
	CalcTask,
	Document,
	NormalSide,
	Question,
	Task
} from '$lib/content/types';
import { DOCUMENT_TYPES } from '$lib/content/documents';
import { isRecord } from '$lib/util/isRecord';
import type { ContentNode, ContentUnit, NodeMeta, NodeType, UnitKind } from '$lib/content/course';

/**
 * コース JSON の手書きバリデーション。型は src/lib/content/types.ts を信頼できる定義とする。
 * Vite 専用 API を使わないので、loader（import.meta.glob）と外部コース読み込み（node:fs）の両方から使う。
 */

export class ContentValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ContentValidationError';
	}
}

// --- バリデーション ---

const ACCOUNT_ROLES: AccountRole[] = ['資産', '負債', '純資産', '収益', '費用', '仮勘定', '集合勘定'];
const NORMAL_SIDES: NormalSide[] = ['debit', 'credit', 'either'];
const AMOUNT_INPUTS: AmountInput[] = ['numpad', 'chips'];
const BLANK_INPUTS: BlankInput[] = ['account_picker', 'numpad', 'choice', 'chips'];
const TASK_KINDS = ['journal', 'form_fill', 'match', 'choice', 'calc'] as const;

function fail(context: string, message: string): never {
	throw new ContentValidationError(`${context}: ${message}`);
}

function requireString(obj: Record<string, unknown>, key: string, context: string): string {
	const v = obj[key];
	if (typeof v !== 'string' || v.length === 0) fail(context, `"${key}" は必須の文字列です`);
	return v;
}

function requireNumber(obj: Record<string, unknown>, key: string, context: string): number {
	const v = obj[key];
	if (typeof v !== 'number' || Number.isNaN(v)) fail(context, `"${key}" は必須の数値です`);
	return v;
}

function requireBoolean(obj: Record<string, unknown>, key: string, context: string): boolean {
	const v = obj[key];
	if (typeof v !== 'boolean') fail(context, `"${key}" は必須の真偽値です`);
	return v;
}

function requireArray(obj: Record<string, unknown>, key: string, context: string): unknown[] {
	const v = obj[key];
	if (!Array.isArray(v)) fail(context, `"${key}" は必須の配列です`);
	return v;
}

const UNIT_KINDS: UnitKind[] = ['chapter', 'checktest'];

/** 省略時は 'chapter' */
function validateUnitKind(raw: unknown, context: string): UnitKind {
	if (raw === undefined) return 'chapter';
	if (typeof raw !== 'string' || !UNIT_KINDS.includes(raw as UnitKind)) {
		fail(context, `"kind" が不正です（許可値: ${UNIT_KINDS.join(', ')}）`);
	}
	return raw as UnitKind;
}

export function validateUnitFile(raw: unknown, file: string): ContentUnit {
	if (!isRecord(raw)) fail(file, 'トップレベルはオブジェクトである必要があります');
	if (!isRecord(raw.unit)) fail(file, '"unit" は必須のオブジェクトです');

	const unitCtx = `${file}:unit`;
	const id = requireString(raw.unit, 'id', unitCtx);
	const course = requireString(raw.unit, 'course', unitCtx);
	const chapter = requireNumber(raw.unit, 'chapter', unitCtx);
	const title = requireString(raw.unit, 'title', unitCtx);
	const kind = validateUnitKind(raw.unit.kind, unitCtx);

	const rawNodes = requireArray(raw, 'nodes', file);
	const nodes = rawNodes.map((n, i) => validateNode(n, `${file}:nodes[${i}]`));

	return { id, course, chapter, title, kind, nodes };
}

function validateNode(raw: unknown, context: string): ContentNode {
	if (!isRecord(raw)) fail(context, 'ノードはオブジェクトである必要があります');
	const id = requireString(raw, 'id', context);
	const title = requireString(raw, 'title', context);
	const rawQuestions = requireArray(raw, 'questions', context);
	const questions = rawQuestions.map((q, i) => validateQuestion(q, `${context}(${id}):questions[${i}]`));
	const meta = raw.meta === undefined ? undefined : validateNodeMeta(raw.meta, `${context}(${id}):meta`);
	return { id, title, kind: 'lesson', meta, questions };
}

const NODE_TYPES: NodeType[] = ['basic', 'application', 'ledger', 'discriminate', 'calculation'];

function validateNodeMeta(raw: unknown, context: string): NodeMeta {
	if (!isRecord(raw)) fail(context, '"meta" はオブジェクトである必要があります');
	const nodeType = requireString(raw, 'nodeType', context);
	if (!NODE_TYPES.includes(nodeType as NodeType)) {
		fail(context, `"nodeType" が不正です（許可値: ${NODE_TYPES.join(', ')}）`);
	}
	const examPart = raw.examPart;
	if (examPart !== 1 && examPart !== 2 && examPart !== 3 && examPart !== 4 && examPart !== 5 && examPart !== null) {
		fail(context, '"examPart" は 1〜5 または null です');
	}
	const examSub = raw.examSub;
	if (examSub !== undefined && examSub !== 1 && examSub !== 2) fail(context, '"examSub" は 1 または 2 です');
	const introduces = requireArray(raw, 'introduces', context);
	if (!introduces.every((a) => typeof a === 'string')) fail(context, '"introduces" は文字列配列です');
	return {
		goal: requireString(raw, 'goal', context),
		topic: requireString(raw, 'topic', context),
		minQuestions: requireNumber(raw, 'minQuestions', context),
		nodeType: nodeType as NodeType,
		examPart,
		...(examSub === undefined ? {} : { examSub }),
		introduces: introduces as string[],
		isNew: requireBoolean(raw, 'isNew', context)
	};
}

function validateQuestion(raw: unknown, context: string): Question {
	if (!isRecord(raw)) fail(context, '問題はオブジェクトである必要があります');

	const id = requireString(raw, 'id', context);
	const qctx = `${context}(${id})`;
	const source = requireString(raw, 'source', qctx);
	const sanitized = requireBoolean(raw, 'sanitized', qctx);
	const explanation = requireString(raw, 'explanation', qctx);

	if (!isRecord(raw.stimulus)) fail(qctx, '"stimulus" は必須のオブジェクトです');
	const text = requireString(raw.stimulus, 'text', `${qctx}:stimulus`);
	// document は Phase 1 では未使用のため型のみ緩く許容する
	const document = raw.stimulus.document as Question['stimulus']['document'];

	if (!isRecord(raw.task)) fail(qctx, '"task" は必須のオブジェクトです');
	const task = validateTask(raw.task, qctx);

	let newAccounts: string[] | undefined;
	if (raw.newAccounts !== undefined) {
		if (!Array.isArray(raw.newAccounts) || !raw.newAccounts.every((a) => typeof a === 'string')) {
			fail(qctx, '"newAccounts" は文字列配列である必要があります');
		}
		newAccounts = raw.newAccounts as string[];
	}

	let generated: Question['generated'];
	if (raw.generated !== undefined) {
		if (!isRecord(raw.generated)) fail(qctx, '"generated" はオブジェクトである必要があります');
		generated = {
			generator: requireString(raw.generated, 'generator', `${qctx}:generated`),
			seed: requireNumber(raw.generated, 'seed', `${qctx}:generated`)
		};
	}

	return {
		id,
		source,
		sanitized,
		stimulus: { text, document },
		task,
		explanation,
		newAccounts,
		generated
	};
}

function validateTask(raw: Record<string, unknown>, context: string): Task {
	const kind = raw.kind;
	if (typeof kind !== 'string' || !TASK_KINDS.includes(kind as (typeof TASK_KINDS)[number])) {
		fail(`${context}:task`, `"kind" が不正です（許可値: ${TASK_KINDS.join(', ')}） 実際: ${String(kind)}`);
	}

	const tctx = `${context}:task(${kind})`;
	switch (kind as (typeof TASK_KINDS)[number]) {
		case 'journal':
			return validateJournalTask(raw, tctx);
		case 'form_fill':
			return validateFormFillTask(raw, tctx);
		case 'match':
			return validateMatchTask(raw, tctx);
		case 'choice':
			return validateChoiceTask(raw, tctx);
		case 'calc':
			return validateCalcTask(raw, tctx);
	}
}

function validateJournalLines(raw: unknown, context: string): { account: string; amount: number }[] {
	if (!Array.isArray(raw)) fail(context, '仕訳行は配列である必要があります');
	return raw.map((line, i) => {
		const lctx = `${context}[${i}]`;
		if (!isRecord(line)) fail(lctx, '仕訳行はオブジェクトである必要があります');
		return {
			account: requireString(line, 'account', lctx),
			amount: requireNumber(line, 'amount', lctx)
		};
	});
}

function validateJournalTask(raw: Record<string, unknown>, context: string): JournalTask {
	const debit = validateJournalLines(raw.debit, `${context}:debit`);
	const credit = validateJournalLines(raw.credit, `${context}:credit`);
	const accountOptionsRaw = requireArray(raw, 'accountOptions', context);
	if (!accountOptionsRaw.every((a) => typeof a === 'string')) {
		fail(context, '"accountOptions" は文字列配列である必要があります');
	}
	const amountInput = requireString(raw, 'amountInput', context);
	if (!AMOUNT_INPUTS.includes(amountInput as AmountInput)) {
		fail(context, `"amountInput" が不正です（許可値: ${AMOUNT_INPUTS.join(', ')}）`);
	}
	return {
		kind: 'journal',
		debit,
		credit,
		accountOptions: accountOptionsRaw as string[],
		amountInput: amountInput as AmountInput
	};
}

function validateFormFillTask(raw: Record<string, unknown>, context: string): FormFillTask {
	if (!isRecord(raw.document)) fail(context, '"document" は必須のオブジェクトです');
	const type = requireString(raw.document, 'type', `${context}:document`);
	if (!DOCUMENT_TYPES.includes(type as Document['type'])) {
		fail(`${context}:document`, `"type" が不正です（許可値: ${DOCUMENT_TYPES.join(', ')}）`);
	}
	const blanksRaw = requireArray(raw, 'blanks', context);
	const blanks = blanksRaw.map((b, i) => validateFormBlank(b, `${context}:blanks[${i}]`));
	return {
		kind: 'form_fill',
		document: { type, data: raw.document.data } as Document,
		blanks
	};
}

function validateFormBlank(raw: unknown, context: string): FormBlank {
	if (!isRecord(raw)) fail(context, '空欄はオブジェクトである必要があります');
	const ref = requireString(raw, 'ref', context);
	const input = requireString(raw, 'input', context);
	if (!BLANK_INPUTS.includes(input as BlankInput)) {
		fail(context, `"input" が不正です（許可値: ${BLANK_INPUTS.join(', ')}）`);
	}

	if (input === 'numpad') {
		if (typeof raw.answer !== 'number') fail(context, 'numpad の "answer" は number が必須です');
		return { ref, input: 'numpad', answer: raw.answer };
	}

	if (input === 'account_picker') {
		if (typeof raw.answer !== 'string') {
			fail(context, 'account_picker の "answer" は string が必須です');
		}
		const accountOptions = requireStringArray(raw, 'accountOptions', context);
		if (!accountOptions.includes(raw.answer)) {
			fail(context, '"accountOptions" は "answer" を含む必要があります');
		}
		return { ref, input: 'account_picker', answer: raw.answer, accountOptions };
	}

	if (input === 'choice') {
		if (typeof raw.answer !== 'string') fail(context, 'choice の "answer" は string が必須です');
		const options = requireStringArray(raw, 'options', context);
		if (!options.includes(raw.answer)) {
			fail(context, '"options" は "answer" を含む必要があります');
		}
		return { ref, input: 'choice', answer: raw.answer, options };
	}

	if (typeof raw.answer !== 'string' && typeof raw.answer !== 'number') {
		fail(context, 'chips の "answer" は string | number が必須です');
	}
	const optionsRaw = requireArray(raw, 'options', context);
	const options = optionsRaw.map((o, i) => {
		if (typeof o !== 'string' && typeof o !== 'number') {
			fail(`${context}:options[${i}]`, 'チップは string | number である必要があります');
		}
		return o as string | number;
	});
	if (!options.includes(raw.answer as string | number)) {
		fail(context, '"options" は "answer" を含む必要があります');
	}
	return { ref, input: 'chips', answer: raw.answer as string | number, options };
}

function requireStringArray(raw: Record<string, unknown>, key: string, context: string): string[] {
	const arr = requireArray(raw, key, context);
	return arr.map((v, i) => {
		if (typeof v !== 'string') fail(`${context}:${key}[${i}]`, '文字列である必要があります');
		return v as string;
	});
}

function validateMatchTask(raw: Record<string, unknown>, context: string): MatchTask {
	const pairsRaw = requireArray(raw, 'pairs', context);
	const pairs = pairsRaw.map((p, i) => {
		if (!Array.isArray(p) || p.length !== 2 || typeof p[0] !== 'string' || typeof p[1] !== 'string') {
			fail(`${context}:pairs[${i}]`, 'ペアは [string, string] である必要があります');
		}
		return p as [string, string];
	});
	return { kind: 'match', pairs };
}

function validateChoiceTask(raw: Record<string, unknown>, context: string): ChoiceTask {
	const optionsRaw = requireArray(raw, 'options', context);
	if (!optionsRaw.every((o) => typeof o === 'string')) {
		fail(context, '"options" は文字列配列である必要があります');
	}
	const answerIndex = requireNumber(raw, 'answerIndex', context);
	if (answerIndex < 0 || answerIndex >= optionsRaw.length) {
		fail(context, `"answerIndex"(${answerIndex}) が options の範囲外です`);
	}
	return { kind: 'choice', options: optionsRaw as string[], answerIndex };
}

function validateCalcTask(raw: Record<string, unknown>, context: string): CalcTask {
	return { kind: 'calc', answer: requireNumber(raw, 'answer', context) };
}

export function validateAccount(raw: unknown, context: string): Account {
	if (!isRecord(raw)) fail(context, '勘定科目はオブジェクトである必要があります');
	const name = requireString(raw, 'name', context);
	const category = requireString(raw, 'category', context);
	if (!ACCOUNT_ROLES.includes(category as AccountRole)) {
		fail(context, `"category" が不正です（許可値: ${ACCOUNT_ROLES.join(', ')}） 実際: ${category}`);
	}
	const chapter = requireNumber(raw, 'chapter', context);

	// normalSide は category から導出してはならない（評価勘定・仮勘定の例外があるため）。
	// 新出科目カード演出の唯一の情報源であり、欠落・不正値は握り潰さず必ず落とす。
	const normalSide = requireString(raw, 'normalSide', context);
	if (!NORMAL_SIDES.includes(normalSide as NormalSide)) {
		fail(context, `"normalSide" が不正です（許可値: ${NORMAL_SIDES.join(', ')}） 実際: ${normalSide}`);
	}

	const valuationOf =
		Array.isArray(raw.valuationOf) && raw.valuationOf.every((v) => typeof v === 'string')
			? (raw.valuationOf as string[])
			: undefined;
	const firstAppearance = typeof raw.firstAppearance === 'string' ? raw.firstAppearance : undefined;

	return {
		name,
		category: category as AccountRole,
		normalSide: normalSide as NormalSide,
		chapter,
		valuationOf,
		firstAppearance
	};
}
