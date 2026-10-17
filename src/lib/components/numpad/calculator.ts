export type CalcOperator = '+' | '-' | '×' | '÷';

export type CalcKey = `${number}` | '00' | '.' | CalcOperator | '=' | 'C' | '⌫';

export type CalcState = {
	display: string;
	accumulator: number | null;
	operator: CalcOperator | null;
	/** true = 次の数字入力で display を新規開始する（演算子/=直後、または初期状態） */
	freshEntry: boolean;
	error: boolean;
};

/** 入力できる数字の桁数（整数部と小数部の合計。小数点と符号は数えない） */
export const MAX_DIGITS = 12;

/** 小数の計算で出る誤差（0.1+0.2 など）を消す桁数。表示・判定・確定の値はこの桁で丸める */
const DECIMAL_PLACES = 10;

/** 計算の誤差を丸めた値。0.1+0.2 は 0.3 になる */
export function roundValue(n: number): number {
	return Number(n.toFixed(DECIMAL_PLACES));
}

function trimTrailingZeros(s: string): string {
	return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
}

const digitCount = (s: string) => s.replace(/[-.]/g, '').length;

/** 計算結果を表示用の文字列にする。誤差を丸め、桁数の上限に収まるよう小数を切る */
function toDisplay(n: number): string {
	const r = roundValue(n);
	const intDigits = String(Math.trunc(Math.abs(r))).length;
	const places = Math.max(0, Math.min(DECIMAL_PLACES, MAX_DIGITS - intDigits));
	const s = trimTrailingZeros(r.toFixed(places));
	return s === '-0' ? '0' : s;
}

/** 表示用に整数部を 3 桁ごとに区切る。入力途中の「0.」「1.50」はそのまま見せる */
export function formatDisplay(display: string): string {
	const negative = display.startsWith('-');
	const [int, fraction] = (negative ? display.slice(1) : display).split('.');
	const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
	return `${negative ? '-' : ''}${grouped}${fraction === undefined ? '' : `.${fraction}`}`;
}

/** 金額などの数値を、小数も切り捨てずに 3 桁区切りで文字にする */
export function formatAmount(n: number): string {
	return formatDisplay(toDisplay(n));
}

export function createInitialCalcState(): CalcState {
	return { display: '0', accumulator: null, operator: null, freshEntry: true, error: false };
}

function apply(a: number, op: CalcOperator, b: number): number {
	switch (op) {
		case '+':
			return a + b;
		case '-':
			return a - b;
		case '×':
			return a * b;
		case '÷':
			return a / b;
	}
}

function isDigitKey(key: string): key is `${number}` {
	return /^[0-9]$/.test(key);
}

function inputDigit(state: CalcState, digit: string): CalcState {
	if (state.freshEntry) {
		return { ...state, display: digit === '00' ? '0' : digit, freshEntry: false };
	}
	if (digitCount(state.display) >= MAX_DIGITS) return state;
	const next = state.display === '0' && digit !== '00' ? digit : state.display + digit;
	// 「00」で上限を超える場合は入力しない
	return { ...state, display: digitCount(next) > MAX_DIGITS ? state.display : next };
}

/** 「.」。数字の入力前なら「0.」から始め、すでに小数点があれば何もしない */
function inputDecimalPoint(state: CalcState): CalcState {
	if (state.freshEntry) return { ...state, display: '0.', freshEntry: false };
	if (state.display.includes('.') || digitCount(state.display) >= MAX_DIGITS) return state;
	return { ...state, display: `${state.display}.` };
}

function inputOperator(state: CalcState, op: CalcOperator): CalcState {
	const current = Number(state.display);
	if (state.accumulator === null) {
		return { ...state, accumulator: current, operator: op, freshEntry: true };
	}
	if (!state.freshEntry) {
		if (state.operator === '÷' && current === 0) {
			return { ...createInitialCalcState(), error: true };
		}
		const result = apply(state.accumulator, state.operator!, current);
		return { ...state, accumulator: result, display: toDisplay(result), operator: op, freshEntry: true };
	}
	// 演算子置換: 数字未入力のまま演算子を押し直した
	return { ...state, operator: op };
}

function inputEquals(state: CalcState): CalcState {
	if (state.operator === null || state.accumulator === null) {
		return { ...state, freshEntry: true };
	}
	const current = Number(state.display);
	if (state.operator === '÷' && current === 0) {
		return { ...createInitialCalcState(), error: true };
	}
	const result = apply(state.accumulator, state.operator, current);
	return { display: toDisplay(result), accumulator: null, operator: null, freshEntry: true, error: false };
}

function inputBackspace(state: CalcState): CalcState {
	if (state.freshEntry) return state;
	const next = state.display.slice(0, -1);
	return { ...state, display: next.length > 0 && next !== '-' ? next : '0' };
}

export function reduceCalc(state: CalcState, key: CalcKey): CalcState {
	if (state.error && key !== 'C') {
		return reduceCalc(createInitialCalcState(), key);
	}
	if (key === 'C') return createInitialCalcState();
	if (key === '⌫') return inputBackspace(state);
	if (key === '=') return inputEquals(state);
	if (key === '.') return inputDecimalPoint(state);
	if (key === '00' || isDigitKey(key)) return inputDigit(state, key);
	return inputOperator(state, key);
}

/** 表示中の値。計算の誤差は丸める */
export function calcDisplayValue(state: CalcState): number {
	return roundValue(Number(state.display));
}

/** 「=」を押した場合の値。式の途中なら計算結果、エラー状態なら null */
export function calcResult(state: CalcState): number | null {
	if (state.error) return null;
	if (state.operator !== null && state.freshEntry) {
		return state.accumulator === null ? null : roundValue(state.accumulator);
	}
	const settled = reduceCalc(state, '=');
	return settled.error ? null : calcDisplayValue(settled);
}

/**
 * OK で値を確定したあとの状態。表示は残し（本物の電卓と同じ）、
 * 次の数字は新しい入力として始まり、演算子は表示中の値に続けて計算する。
 * 式の途中なら「=」を押したのと同じ結果にする。エラー状態はそのまま。
 */
export function settleCalc(state: CalcState): CalcState {
	if (state.error) return state;
	if (state.operator !== null && state.freshEntry) {
		// 「5 +」のように演算子で止まっている場合は、左辺をそのまま確定する
		const left = state.accumulator === null ? Number(state.display) : state.accumulator;
		return { display: toDisplay(left), accumulator: null, operator: null, freshEntry: true, error: false };
	}
	const settled = reduceCalc(state, '=');
	return { ...settled, freshEntry: true };
}
