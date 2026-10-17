import { describe, expect, it } from 'vitest';
import {
	type CalcKey,
	calcDisplayValue,
	calcResult,
	createInitialCalcState,
	formatAmount,
	formatDisplay,
	reduceCalc,
	roundValue,
	settleCalc
} from './calculator';

function run(keys: CalcKey[]) {
	return keys.reduce(reduceCalc, createInitialCalcState());
}

describe('calculator', () => {
	it('digit input builds a number', () => {
		const state = run(['1', '2', '3']);
		expect(state.display).toBe('123');
	});

	it('00 key appends double zero', () => {
		const state = run(['1', '00']);
		expect(state.display).toBe('100');
	});

	it('leading 00 stays 0', () => {
		const state = run(['00']);
		expect(state.display).toBe('0');
	});

	it('adds two numbers', () => {
		const state = run(['1', '0', '0', '0', '+', '5', '0', '0', '=']);
		expect(calcDisplayValue(state)).toBe(1500);
	});

	it('subtracts two numbers', () => {
		const state = run(['9', '0', '0', '-', '4', '0', '0', '=']);
		expect(calcDisplayValue(state)).toBe(500);
	});

	it('multiplies two numbers', () => {
		const state = run(['1', '2', '×', '3', '=']);
		expect(calcDisplayValue(state)).toBe(36);
	});

	it('divides two numbers', () => {
		const state = run(['9', '0', '÷', '3', '=']);
		expect(calcDisplayValue(state)).toBe(30);
	});

	it('割り切れない割り算は小数のまま持ち、整数に丸めない', () => {
		expect(calcDisplayValue(run(['7', '÷', '2', '=']))).toBe(3.5);
		expect(run(['1', '÷', '3', '=']).display).toBe('0.3333333333');
	});

	it('supports chained (continuous) operations', () => {
		const state = run(['1', '0', '0', '+', '5', '0', '+', '2', '5', '=']);
		expect(calcDisplayValue(state)).toBe(175);
	});

	it('replaces the pending operator when pressed again without a digit', () => {
		const state = run(['1', '0', '+', '-', '3', '=']);
		expect(calcDisplayValue(state)).toBe(7);
	});

	it('guards against division by zero', () => {
		const state = run(['1', '0', '÷', '0', '=']);
		expect(state.error).toBe(true);
		expect(state.display).toBe('0');
	});

	it('recovers from error state on next input', () => {
		const state = run(['1', '0', '÷', '0', '=', '5']);
		expect(state.error).toBe(false);
		expect(state.display).toBe('5');
	});

	it('backspace removes the last digit', () => {
		const state = run(['1', '2', '3', '⌫']);
		expect(state.display).toBe('12');
	});

	it('backspace on empty display falls back to 0', () => {
		const state = run(['1', '⌫', '⌫']);
		expect(state.display).toBe('0');
	});

	it('C resets everything', () => {
		const state = run(['1', '2', '+', '3', 'C']);
		expect(state).toEqual(createInitialCalcState());
	});

	it('equals with no pending operator just confirms current display', () => {
		const state = run(['4', '2', '=']);
		expect(calcDisplayValue(state)).toBe(42);
	});
});

describe('calcResult', () => {
	it('「=」なしでも入力中の数値を返す', () => {
		expect(calcResult(run(['5', '0', '0', '0']))).toBe(5000);
	});

	it('式の途中なら計算結果を返す', () => {
		expect(calcResult(run(['1', '0', '0', '+', '5', '0']))).toBe(150);
	});

	it('「=」後はその値を返す', () => {
		expect(calcResult(run(['2', '×', '3', '=']))).toBe(6);
	});

	it('演算子だけ押した状態は左辺をそのまま返す', () => {
		expect(calcResult(run(['5', '+']))).toBe(5);
	});

	it('エラー状態は null', () => {
		expect(calcResult(run(['5', '÷', '0', '=']))).toBeNull();
	});
});

describe('calcResult と「=」の値', () => {
	it.each<{ keys: CalcKey[] }>([
		{ keys: ['1', '2', '+', '3', '×', '2'] },
		{ keys: ['9', '0', '0', '-', '1', '0', '0'] },
		{ keys: ['7', '÷', '2'] },
		{ keys: ['0', '-', '5'] }
	])('「=」を押す前の calcResult と、押した後の値が一致する ($keys)', ({ keys }) => {
		const before = run(keys);
		expect(calcResult(before)).toBe(calcDisplayValue(reduceCalc(before, '=')));
	});
});

describe('小数点', () => {
	it('「.」で小数を入力できる', () => {
		const state = run(['1', '.', '2', '5']);
		expect(state.display).toBe('1.25');
		expect(calcDisplayValue(state)).toBe(1.25);
	});

	it('「.」で始めると「0.」として扱う', () => {
		expect(run(['.']).display).toBe('0.');
		expect(run(['.', '5']).display).toBe('0.5');
		expect(calcDisplayValue(run(['.', '5']))).toBe(0.5);
	});

	it('演算子や「=」のあとの「.」も「0.」から始める', () => {
		expect(run(['5', '+', '.', '5', '=']).display).toBe('5.5');
		expect(run(['2', '×', '3', '=', '.', '5']).display).toBe('0.5');
	});

	it('「.」を連打しても小数点は 1 つ', () => {
		expect(run(['1', '.', '.', '.', '5']).display).toBe('1.5');
		expect(run(['.', '.', '2']).display).toBe('0.2');
	});

	it('「0」「00」と組み合わせられる', () => {
		expect(run(['1', '.', '0', '5']).display).toBe('1.05');
		expect(run(['1', '.', '00', '5']).display).toBe('1.005');
		expect(run(['0', '.', '0', '0', '1']).display).toBe('0.001');
	});

	it('入力途中の「3.」は 3 として計算できる', () => {
		expect(calcResult(run(['3', '.']))).toBe(3);
		expect(calcResult(run(['3', '.', '+', '2']))).toBe(5);
	});

	it('桁数の上限は小数部を含めて 12 桁、小数点は数えない', () => {
		const state = run(['1', '2', '3', '4', '5', '6', '.', '7', '8', '9', '0', '1', '2', '3']);
		expect(state.display).toBe('123456.789012');
		expect(run(['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '1', '2', '.']).display).toBe('123456789012');
	});

	it('バックスペースは小数点も 1 文字として消す', () => {
		expect(run(['1', '.', '5', '⌫']).display).toBe('1.');
		expect(run(['1', '.', '5', '⌫', '⌫']).display).toBe('1');
		expect(run(['.', '⌫']).display).toBe('0');
	});
});

describe('小数の四則演算と誤差', () => {
	it('0.1 + 0.2 は 0.3 になる', () => {
		const state = run(['.', '1', '+', '.', '2', '=']);
		expect(state.display).toBe('0.3');
		expect(calcDisplayValue(state)).toBe(0.3);
		expect(calcResult(run(['.', '1', '+', '.', '2']))).toBe(0.3);
	});

	it('0.3 - 0.1 は 0.2、1.1 × 1.1 は 1.21', () => {
		expect(calcDisplayValue(run(['.', '3', '-', '.', '1', '=']))).toBe(0.2);
		expect(calcDisplayValue(run(['1', '.', '1', '×', '1', '.', '1', '=']))).toBe(1.21);
	});

	it('連続した演算でも誤差が出ない', () => {
		expect(calcResult(run(['.', '1', '+', '.', '2', '+', '.', '3']))).toBe(0.6);
		expect(calcResult(run(['1', '÷', '3', '×', '3']))).toBe(1);
	});

	it('小数の割り算', () => {
		expect(calcDisplayValue(run(['1', '÷', '4', '=']))).toBe(0.25);
		expect(calcDisplayValue(run(['2', '.', '5', '÷', '.', '5', '=']))).toBe(5);
	});

	it('整数が答えの問題では、小数の答えは一致しない', () => {
		expect(calcResult(run(['3', '.', '5']))).not.toBe(4);
		expect(calcResult(run(['.', '1', '+', '.', '2']))).not.toBe(0);
	});

	it('0 で割るとエラー（小数の 0.0 でも）', () => {
		expect(run(['5', '÷', '0', '.', '0', '=']).error).toBe(true);
	});

	it('結果が大きくても表示が崩れない', () => {
		expect(run(['9', '9', '9', '9', '9', '9', '×', '9', '9', '9', '9', '9', '9', '=']).display).toBe('999998000001');
	});
});

describe('表示の桁区切り', () => {
	it('整数部を 3 桁ごとに区切る', () => {
		expect(formatDisplay('0')).toBe('0');
		expect(formatDisplay('1234')).toBe('1,234');
		expect(formatDisplay('1234567')).toBe('1,234,567');
		expect(formatDisplay('-1234567')).toBe('-1,234,567');
	});

	it('入力途中の小数はそのまま見せる', () => {
		expect(formatDisplay('0.')).toBe('0.');
		expect(formatDisplay('1234.50')).toBe('1,234.50');
		expect(formatDisplay('1234567.0')).toBe('1,234,567.0');
	});

	it('金額は小数も切り捨てずに区切る', () => {
		expect(formatAmount(1234.5678)).toBe('1,234.5678');
		expect(formatAmount(100000)).toBe('100,000');
		expect(formatAmount(0.1 + 0.2)).toBe('0.3');
	});
});

describe('roundValue', () => {
	it('浮動小数点の誤差を消す', () => {
		expect(roundValue(0.1 + 0.2)).toBe(0.3);
		expect(roundValue(1.005 * 1000)).toBe(1005);
		expect(roundValue(123)).toBe(123);
	});
});

describe('OK で確定したあと（settleCalc）', () => {
	const settled = (keys: CalcKey[]) => settleCalc(run(keys));

	it('表示は残り、確定値はその値', () => {
		const state = settled(['5', '0', '0', '0', '0']);
		expect(state.display).toBe('50000');
		expect(calcDisplayValue(state)).toBe(50000);
		expect(calcResult(state)).toBe(50000);
	});

	it('次の数字は表示中の値に追記せず、新しい入力として始まる', () => {
		const state = reduceCalc(settled(['5', '0', '0', '0', '0']), '3');
		expect(state.display).toBe('3');
	});

	it('次の「.」も「0.」から新しく始まる', () => {
		expect(reduceCalc(settled(['5', '0', '0', '0', '0']), '.').display).toBe('0.');
	});

	it('演算子は表示中の値に続けて計算する', () => {
		const state = [...(['×', '2', '='] as CalcKey[])].reduce(reduceCalc, settled(['5', '0', '0', '0', '0']));
		expect(calcDisplayValue(state)).toBe(100000);
		const minus = ['-', '1', '0', '0', '0', '0', '='] as CalcKey[];
		expect(calcDisplayValue(minus.reduce(reduceCalc, settled(['5', '0', '0', '0', '0'])))).toBe(40000);
	});

	it('式の途中なら「=」と同じ結果になり、その結果が残る', () => {
		const state = settled(['1', '0', '0', '+', '5', '0']);
		expect(state.display).toBe('150');
		expect(calcDisplayValue(state)).toBe(150);
		expect(state.operator).toBeNull();
	});

	it('演算子で止まっている式は、左辺をそのまま確定する', () => {
		const state = settled(['5', '+']);
		expect(calcDisplayValue(state)).toBe(5);
		expect(state.display).toBe('5');
	});

	it('何度 OK を押しても、同じ値のまま', () => {
		const once = settled(['1', '2', '+', '3']);
		expect(settleCalc(once)).toEqual(once);
		expect(settleCalc(settleCalc(once))).toEqual(once);
	});

	it('小数の計算結果も、誤差を丸めて残る', () => {
		const state = settled(['.', '1', '+', '.', '2']);
		expect(state.display).toBe('0.3');
		expect(calcDisplayValue(state)).toBe(0.3);
	});

	it('C で消せる', () => {
		expect(reduceCalc(settled(['5', '0', '0', '0', '0']), 'C')).toEqual(createInitialCalcState());
	});

	it('エラー状態はそのまま', () => {
		const error = run(['5', '÷', '0', '=']);
		expect(settleCalc(error)).toBe(error);
	});
});
