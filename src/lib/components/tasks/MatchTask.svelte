<script lang="ts">
	/**
	 * Match Madness 風のペア合わせ UI（MatchTask, 仕様書 3章）。
	 * 正解ペアは消灯（フェードアウト）、誤ペアは振動風シェイクでフィードバックする。
	 *
	 * 正誤判定は表示内容の一致（isMatchingPair）で行う。左右カードの生成 index（pairIndex）が
	 * 一致するかではなく「選んだ組が pairs のいずれかとして成立するか」を見るため、
	 * カテゴリ名など表示内容が複数ペアで重複していても誤判定しない。
	 */
	import { isMatchingPair } from './matchTask';

	type Card = { key: number; label: string };

	let {
		pairs,
		onComplete
	}: {
		pairs: Array<[string, string]>;
		onComplete?: () => void;
	} = $props();

	function shuffle<T>(items: T[]): T[] {
		const copy = [...items];
		for (let i = copy.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[copy[i], copy[j]] = [copy[j], copy[i]];
		}
		return copy;
	}

	let leftCards = $state<Card[]>(
		shuffle(pairs.map((pair, key): Card => ({ key, label: pair[0] })))
	);
	let rightCards = $state<Card[]>(
		shuffle(pairs.map((pair, key): Card => ({ key, label: pair[1] })))
	);

	let selectedLeft = $state<number | null>(null);
	let selectedRight = $state<number | null>(null);
	let matchedLeft = $state(new Set<number>());
	let matchedRight = $state(new Set<number>());
	let shakingLeft = $state<number | null>(null);
	let shakingRight = $state<number | null>(null);

	function select(side: 'left' | 'right', key: number) {
		if (side === 'left') {
			if (matchedLeft.has(key) || shakingLeft !== null) return;
			selectedLeft = selectedLeft === key ? null : key;
		} else {
			if (matchedRight.has(key) || shakingRight !== null) return;
			selectedRight = selectedRight === key ? null : key;
		}

		if (selectedLeft === null || selectedRight === null) return;

		const leftLabel = leftCards.find((card) => card.key === selectedLeft)?.label ?? '';
		const rightLabel = rightCards.find((card) => card.key === selectedRight)?.label ?? '';

		if (isMatchingPair(pairs, leftLabel, rightLabel)) {
			matchedLeft = new Set(matchedLeft).add(selectedLeft);
			matchedRight = new Set(matchedRight).add(selectedRight);
			selectedLeft = null;
			selectedRight = null;
			if (matchedLeft.size === pairs.length) onComplete?.();
		} else {
			shakingLeft = selectedLeft;
			shakingRight = selectedRight;
			setTimeout(() => {
				shakingLeft = null;
				shakingRight = null;
				selectedLeft = null;
				selectedRight = null;
			}, 400);
		}
	}
</script>

<div class="match-task">
	<div class="column">
		{#each leftCards as card (card.key)}
			<button
				type="button"
				class="card"
				class:selected={selectedLeft === card.key}
				class:matched={matchedLeft.has(card.key)}
				class:shake={shakingLeft === card.key}
				disabled={matchedLeft.has(card.key)}
				onclick={() => select('left', card.key)}
			>
				{card.label}
			</button>
		{/each}
	</div>
	<div class="column">
		{#each rightCards as card (card.key)}
			<button
				type="button"
				class="card"
				class:selected={selectedRight === card.key}
				class:matched={matchedRight.has(card.key)}
				class:shake={shakingRight === card.key}
				disabled={matchedRight.has(card.key)}
				onclick={() => select('right', card.key)}
			>
				{card.label}
			</button>
		{/each}
	</div>
</div>

<style>
	.match-task {
		display: flex;
		gap: 0.75rem;
		width: 100%;
		max-width: 24rem;
		margin: 0 auto;
	}

	.column {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.card {
		appearance: none;
		box-sizing: border-box;
		width: 100%;
		padding: 0.85rem 0.5rem;
		border-radius: 0.9rem;
		border: 2px solid #e5e7eb;
		background: #ffffff;
		font-size: 0.95rem;
		font-weight: 700;
		color: #374151;
		touch-action: manipulation;
		transition:
			opacity 0.3s ease,
			border-color 0.15s ease,
			background 0.15s ease;
	}

	.card:disabled {
		cursor: default;
	}

	.card.selected {
		border-color: #1fa9ee;
		background: #dbf1fc;
		color: #1b93cf;
	}

	.card.matched {
		opacity: 0;
		pointer-events: none;
	}

	.card.shake {
		border-color: #f24a4a;
		background: #fcdcdd;
		color: #b02a2a;
		animation: shake 0.4s ease;
	}

	@keyframes shake {
		0%,
		100% {
			transform: translateX(0);
		}
		20% {
			transform: translateX(-6px);
		}
		40% {
			transform: translateX(6px);
		}
		60% {
			transform: translateX(-4px);
		}
		80% {
			transform: translateX(4px);
		}
	}
</style>
