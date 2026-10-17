<script lang="ts">
	import { fly } from 'svelte/transition';
	import type { WrongBlank } from './formFill';

	let {
		result,
		explanation,
		wrongBlanks,
		oncontinue
	}: {
		result: 'correct' | 'incorrect';
		explanation?: string;
		/** form_fill不正解時、誤っていた欄を欄名・正答つきで表示 */
		wrongBlanks?: WrongBlank[];
		oncontinue: () => void;
	} = $props();
</script>

<div class="sheet" class:correct={result === 'correct'} class:incorrect={result === 'incorrect'} transition:fly={{ y: 120, duration: 220 }}>
	<div class="body">
		<p class="headline">
			{result === 'correct' ? 'せいかい！' : 'ざんねん…'}
		</p>
		{#if result === 'incorrect' && wrongBlanks && wrongBlanks.length > 0}
			<ul class="wrong-blanks">
				{#each wrongBlanks as blank (blank.ref)}
					<li><span class="blank-label">{blank.label}</span>の正解は <strong>{blank.correctAnswer}</strong></li>
				{/each}
			</ul>
		{/if}
		{#if result === 'incorrect' && explanation}
			<p class="explanation">{explanation}</p>
		{/if}
	</div>
	<button type="button" class="continue" onclick={() => oncontinue()}>つづける</button>
</div>

<style>
	.sheet {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 20;
		padding: 20px 16px calc(20px + env(safe-area-inset-bottom));
		box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.08);
	}

	.sheet.correct {
		background: #d3f8b4;
	}

	.sheet.incorrect {
		background: #fcdcdd;
	}

	.body {
		max-width: 480px;
		margin: 0 auto 14px;
	}

	.headline {
		margin: 0 0 6px;
		font-size: 1.25rem;
		font-weight: 800;
	}

	.correct .headline {
		color: #4caa00;
	}

	.incorrect .headline {
		color: #e22f2f;
	}

	.wrong-blanks {
		margin: 0 0 8px;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.wrong-blanks li {
		font-size: 0.9rem;
		color: #58181c;
	}

	.blank-label {
		font-weight: 800;
	}

	.explanation {
		margin: 0;
		font-size: 0.95rem;
		color: #58181c;
		line-height: 1.5;
	}

	.continue {
		display: block;
		width: 100%;
		max-width: 480px;
		margin: 0 auto;
		appearance: none;
		border: none;
		border-radius: 1rem;
		padding: 1rem;
		font-size: 1.05rem;
		font-weight: 800;
		color: #ffffff;
		cursor: pointer;
		touch-action: manipulation;
	}

	.correct .continue {
		background: #55c50d;
		box-shadow: 0 4px 0 #3f9a0a;
	}

	.incorrect .continue {
		background: #f24a4a;
		box-shadow: 0 4px 0 #d63838;
	}

	.continue:active {
		transform: translateY(3px);
		box-shadow: 0 0 0 transparent;
	}
</style>
