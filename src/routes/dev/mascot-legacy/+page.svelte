<script lang="ts">
	import Mascot from '$lib/components/mascot/Mascot.svelte';

	let mascotState = $state<'idle' | 'happy' | 'cheer'>('idle');
	let facing = $state<'left' | 'right'>('right');
	let size = $state(140);
</script>

<div class="page">
	<h1>Boquito マスコット デモ</h1>

	<div class="stage">
		<Mascot state={mascotState} {size} {facing} />
	</div>

	<div class="controls">
		<div class="group">
			<span class="label">状態</span>
			<button
				type="button"
				class:active={mascotState === 'idle'}
				onclick={() => (mascotState = 'idle')}
			>
				idle
			</button>
			<button
				type="button"
				class:active={mascotState === 'happy'}
				onclick={() => (mascotState = 'happy')}
			>
				happy
			</button>
			<button
				type="button"
				class:active={mascotState === 'cheer'}
				onclick={() => (mascotState = 'cheer')}
			>
				cheer
			</button>
		</div>

		<div class="group">
			<span class="label">向き</span>
			<button type="button" class:active={facing === 'right'} onclick={() => (facing = 'right')}>
				右向き
			</button>
			<button type="button" class:active={facing === 'left'} onclick={() => (facing = 'left')}>
				左向き
			</button>
		</div>

		<div class="group">
			<span class="label">サイズ</span>
			<input type="range" min="60" max="240" bind:value={size} />
			<span class="value">{size}px</span>
		</div>
	</div>
</div>

<style>
	.page {
		box-sizing: border-box;
		min-height: 100dvh;
		padding: 1.5rem 1rem 3rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
		background: #ffffff;
		max-width: 26rem;
		margin: 0 auto;
	}

	h1 {
		font-size: 1.1rem;
		margin: 0;
	}

	.stage {
		width: 100%;
		height: 16rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 1rem;
		background: #f7f8fa;
	}

	.controls {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.group {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.label {
		font-size: 0.85rem;
		font-weight: 700;
		color: #4b5563;
		min-width: 3.5rem;
	}

	button {
		appearance: none;
		border: none;
		border-radius: 0.75rem;
		padding: 0.5rem 1rem;
		font-size: 0.85rem;
		font-weight: 700;
		background: #eef2ff;
		color: #4338ca;
	}

	button.active {
		background: #55c50d;
		color: #ffffff;
	}

	.value {
		font-size: 0.8rem;
		color: #6b7280;
		font-variant-numeric: tabular-nums;
	}
</style>
