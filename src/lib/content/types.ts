/**
 * レッスン問題のデータモデル（仕様書 3章）。
 *
 * 全問題は「様式 × 空欄 × 入力方式」に正規化される。
 * コンテンツ本体はリポジトリ内 JSON（差分レビュー可能）、DB は進捗系のみ。
 */

/** 勘定科目の 5 要素分類。属性択一・マッチング問題の出題母集団はこれを持つ科目のみ */
export type AccountCategory = '資産' | '負債' | '純資産' | '収益' | '費用';

/**
 * 5 要素に収まらない勘定。
 * - 仮勘定: 現金過不足・原因判明までの一時的な置き場
 * - 集合勘定: 損益（決算振替でのみ現れる）
 */
export type AccountRole = AccountCategory | '仮勘定' | '集合勘定';

/**
 * ホームポジション（増加を記入する側）。
 *
 * category から導出してはならない。評価勘定（貸倒引当金・減価償却累計額）は
 * 資産でありながら貸方がホームポジションで、仮勘定は借貸どちらにも立つ。
 * 新出科目カードの演出はこの値のみを情報源とする。
 */
export type NormalSide = 'debit' | 'credit' | 'either';

/** 勘定科目マスタ（教科書巻末「勘定科目一覧表」ベース） */
export type Account = {
	name: string;
	category: AccountRole;
	normalSide: NormalSide;
	/**
	 * 評価勘定のとき、控除対象となる科目名。
	 * B/S・精算表の控除表示（Phase 4）と、カードの「◯◯から差し引く箱」説明に使う。
	 */
	valuationOf?: string[];
	/** 初出章。ノード ID 確定後に firstAppearance を併記する */
	chapter: number;
	/** 初出ノード。紫カード演出のトリガー元 */
	firstAppearance?: string;
};

export type { CellRef, Document, DocumentType, DocumentDataOf } from './documents';
import type { CellRef, Document } from './documents';

/** 仕訳 1 行 */
export type JournalEntryLine = {
	account: string;
	amount: number;
};

/** 金額の入力方式 */
export type AmountInput = 'numpad' | 'chips';

/** 空欄 1 個あたりの入力方式 */
export type BlankInput = 'account_picker' | 'numpad' | 'choice' | 'chips';

/**
 * 仕訳問題。複合仕訳は初版から対応（借方・貸方 各最大 4 行）。
 * バリデーション: 借貸合計一致 / 同一科目は借貸それぞれ 1 回まで / 同一側内の行順は不問。
 */
export type JournalTask = {
	kind: 'journal';
	debit: JournalEntryLine[];
	credit: JournalEntryLine[];
	/** チッププール（ダミー科目を含む） */
	accountOptions: string[];
	amountInput: AmountInput;
};

/**
 * 様式内の空欄 1 個。
 *
 * input ごとに必要な選択肢の出どころが違うため判別共用体にしてある。
 * 「choice なのに選択肢がない」状態を型で表現できないので、
 * レンダラは既定値へのフォールバックを持たなくてよい。
 *
 * 不変条件:
 * - ref は document 内の実在するセルを指し、そのセルの値は null である
 * - options / accountOptions は answer を必ず含む（ダミーを混ぜてよい）
 */
export type FormBlank =
	/** 金額・数量。電卓兼テンキーで直接入力するので選択肢は不要 */
	| { ref: CellRef; input: 'numpad'; answer: number }
	/** 勘定科目欄。accountOptions がそのままプルダウン（ダミー科目を含む） */
	| { ref: CellRef; input: 'account_picker'; answer: string; accountOptions: string[] }
	/** 「借/貸」「〃」等の択一。options は 2〜4 個程度 */
	| { ref: CellRef; input: 'choice'; answer: string; options: string[] }
	/** 摘要文・金額をチップから選ぶ Word Bank 形式 */
	| { ref: CellRef; input: 'chips'; answer: string | number; options: Array<string | number> };

/** 空欄の選択肢プール。input が numpad のときは選択肢を持たない */
export function blankOptions(blank: FormBlank): Array<string | number> | null {
	switch (blank.input) {
		case 'numpad':
			return null;
		case 'account_picker':
			return blank.accountOptions;
		default:
			return blank.options;
	}
}

/**
 * 様式穴埋め問題。
 * 通常レッスンは空欄 1〜3 個の小問、章末ボスは全欄記入のロング問題。
 */
export type FormFillTask = {
	kind: 'form_fill';
	document: Document;
	blanks: FormBlank[];
};

/** Match Madness 風のペア合わせ */
export type MatchTask = {
	kind: 'match';
	pairs: Array<[string, string]>;
};

/** 属性択一等の選択問題 */
export type ChoiceTask = {
	kind: 'choice';
	options: string[];
	answerIndex: number;
};

/** 電卓兼テンキーで計算結果を直接入力する問題 */
export type CalcTask = {
	kind: 'calc';
	answer: number;
};

/** 問題が要求する解答タスク */
export type Task =
	| JournalTask
	| FormFillTask
	| MatchTask
	| ChoiceTask
	| CalcTask;

/** 問題文と、読取素材となる添付様式 */
export type Stimulus = {
	text: string;
	document?: Document;
};

/**
 * 問題 1 問。
 *
 * source / sanitized は必須。元の教材の表現が残っているものは sanitized: false で残し、
 * `pnpm run check:sanitize` で残存を一括検査できるようにする。
 */
export type Question = {
	id: string;
	/** 出どころの印。生成器・下書きの問題は "generated" */
	source: string;
	/** false = 言い換え前・要後検査 */
	sanitized: boolean;
	stimulus: Stimulus;
	task: Task;
	/** 不正解時解説（Boquito 口調） */
	explanation: string;
	/** この問題で初出の勘定科目 → 紫カード演出トリガー */
	newAccounts?: string[];
	/** 生成器が作った問題の出どころ。gen:content がこの印で入れ替える */
	generated?: { generator: string; seed: number };
};
