<script lang="ts">
	import { playTap } from '$lib/audio';
	import {
		type CalcKey,
		type CalcState,
		calcDisplayValue,
		calcResult,
		createInitialCalcState,
		formatDisplay,
		reduceCalc
	} from './calculator';

	let {
		calc = $bindable(createInitialCalcState()),
		value = $bindable(0),
		current = $bindable(0),
		onequals
	}: {
		/**
		 * 電卓の状態。親が持てば、電卓を閉じて開き直しても表示が残る（「=」で確定したあとも残す）。
		 * 省略すると、この電卓だけが持つ。
		 */
		calc?: CalcState;
		/** 「=」で確定した値 */
		value?: number;
		/** 「=」を押す前でも、いま押せば確定する値（式なら計算結果。エラー時は null） */
		current?: number | null;
		/** 入力のあとで「=」を押したとき。欄に入れる。前の欄から引き継いだ表示のままでも入る */
		onequals?: () => void;
	} = $props();

	let pressedKey = $state<CalcKey | null>(null);

	// 親が持つ状態から開いたときも、いま押せば確定する値を出す
	$effect(() => {
		current = calcResult(calc);
	});

	const keys: CalcKey[] = ['C', '⌫', '÷', '×', '7', '8', '9', '-', '4', '5', '6', '+', '1', '2', '3', '='];

	function press(key: CalcKey) {
		playTap();
		calc = reduceCalc(calc, key);
		if (key === '=') {
			value = calcDisplayValue(calc);
			onequals?.();
		}
		pressedKey = key;
		setTimeout(() => {
			if (pressedKey === key) pressedKey = null;
		}, 120);
	}
</script>

<div class="numpad">
	<div class="display" class:error={calc.error}>
		{calc.error ? 'エラー' : formatDisplay(calc.display)}
	</div>
	<div class="keys">
		{#each keys as key (key)}
			<button
				type="button"
				class="key"
				class:op={key === '+' || key === '-' || key === '×' || key === '÷'}
				class:equals={key === '='}
				class:clear={key === 'C' || key === '⌫'}
				class:pressed={pressedKey === key}
				onclick={() => press(key)}
			>
				{key}
			</button>
		{/each}
		<button type="button" class="key" class:pressed={pressedKey === '0'} onclick={() => press('0')}>
			0
		</button>
		<button
			type="button"
			class="key"
			class:pressed={pressedKey === '00'}
			onclick={() => press('00')}
		>
			00
		</button>
		<button type="button" class="key" class:pressed={pressedKey === '.'} onclick={() => press('.')}>
			.
		</button>
	</div>
</div>

<style>
	.numpad {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		width: 100%;
		max-width: 24rem;
		margin: 0 auto;
	}

	.display {
		box-sizing: border-box;
		width: 100%;
		padding: 1rem 1.25rem;
		border-radius: 1rem;
		background: #f7f8fa;
		border: 2px solid #e5e7eb;
		font-size: 2.25rem;
		font-weight: 700;
		text-align: right;
		font-variant-numeric: tabular-nums;
		color: #1f2937;
	}

	.display.error {
		color: #dc2626;
		border-color: #fca5a5;
	}

	.keys {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.5rem;
	}

	.key {
		appearance: none;
		border: none;
		border-radius: 1rem;
		padding: 1.1rem 0;
		font-size: 1.5rem;
		font-weight: 700;
		background: #ffffff;
		box-shadow: 0 3px 0 #d1d5db;
		color: #374151;
		touch-action: manipulation;
		user-select: none;
		transition:
			transform 0.06s ease,
			box-shadow 0.06s ease;
	}

	.key.op {
		background: #eef2ff;
		color: #4338ca;
		box-shadow: 0 3px 0 #c7d2fe;
	}

	.key.clear {
		background: #fef2f2;
		color: #b91c1c;
		box-shadow: 0 3px 0 #fecaca;
	}

	.key.equals {
		grid-row: span 2;
		background: #55c50d;
		color: #ffffff;
		box-shadow: 0 4px 0 #3f9a0a;
	}

	.key.pressed,
	.key:active {
		transform: translateY(3px);
		box-shadow: 0 0 0 transparent;
	}
</style>
