<script lang="ts">
	/**
	 * 択一問題 UI（ChoiceTask, 仕様書 3章）。
	 * 用途: 勘定科目の5要素分類判定、借方/貸方判定など。
	 */
	let {
		options,
		answerIndex,
		onAnswer
	}: {
		options: string[];
		answerIndex: number;
		onAnswer?: (correct: boolean, selectedIndex: number) => void;
	} = $props();

	let selectedIndex = $state<number | null>(null);

	function select(index: number) {
		if (selectedIndex !== null) return;
		selectedIndex = index;
		onAnswer?.(index === answerIndex, index);
	}
</script>

<div class="choice-task">
	{#each options as option, index (option)}
		<button
			type="button"
			class="option"
			class:selected={selectedIndex === index}
			class:correct={selectedIndex !== null && index === answerIndex}
			class:incorrect={selectedIndex === index && index !== answerIndex}
			disabled={selectedIndex !== null}
			onclick={() => select(index)}
		>
			{option}
		</button>
	{/each}
</div>

<style>
	.choice-task {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		width: 100%;
		max-width: 24rem;
		margin: 0 auto;
	}

	.option {
		appearance: none;
		box-sizing: border-box;
		width: 100%;
		padding: 1rem 1.25rem;
		border-radius: 1rem;
		border: 2px solid #e5e7eb;
		background: #ffffff;
		font-size: 1.1rem;
		font-weight: 700;
		color: #374151;
		text-align: left;
		touch-action: manipulation;
		transition:
			transform 0.06s ease,
			border-color 0.15s ease,
			background 0.15s ease;
	}

	.option:active:not(:disabled) {
		transform: translateY(2px);
	}

	.option:disabled {
		cursor: default;
	}

	.option.correct {
		border-color: #55c50d;
		background: #d3f8b4;
		color: #2b6b00;
	}

	.option.incorrect {
		border-color: #f24a4a;
		background: #fcdcdd;
		color: #b02a2a;
	}
</style>
