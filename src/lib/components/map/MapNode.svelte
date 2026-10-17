<script lang="ts">
	import type { NodeKind } from '$lib/content/course';
	import type { NodeStatus } from '$lib/course';

	let {
		nodeId,
		label,
		status,
		kind = 'lesson',
		color,
		x,
		y,
		justCleared = false,
		justUnlocked = false
	}: {
		nodeId: string;
		label: string;
		status: NodeStatus;
		kind?: NodeKind;
		color: string;
		x: number;
		y: number;
		justCleared?: boolean;
		justUnlocked?: boolean;
	} = $props();

	const size = $derived(status === 'current' ? 80 : kind === 'practice' ? 54 : 66);

	let flipped = $state(false);
	let unlockPlaying = $state(false);

	$effect(() => {
		if (!justCleared) return;
		const t = setTimeout(() => (flipped = true), 200);
		return () => clearTimeout(t);
	});

	$effect(() => {
		if (!justUnlocked) return;
		unlockPlaying = true;
		// フリップ演出(約0.9秒)の後に出現するよう遅らせる
		const t = setTimeout(() => (unlockPlaying = false), 1400);
		return () => clearTimeout(t);
	});
</script>

<div
	id="map-node-{nodeId}"
	class="node-wrap"
	class:locked={status === 'locked'}
	class:current={status === 'current'}
	class:cleared={status === 'cleared'}
	class:open={status === 'open'}
	class:practice={kind === 'practice'}
	class:review={kind === 'review-unit' || kind === 'review-mix'}
	class:unlock-pop={unlockPlaying}
	style:--node-color={color}
	style:left="{x}px"
	style:top="{y}px"
	style:width="{size}px"
	style:height="{size}px"
>
	{#if status === 'current'}
		<span class="pulse-ring" style:background={color}></span>
	{/if}

	{#if justCleared}
		<a class="flip-scene" href="/lesson/{nodeId}" aria-label={label}>
			<div class="flip-card" class:flipped>
				<div class="flip-face flip-front" style:border-color={color}>
					<svg viewBox="0 0 24 24" width="30" height="30" fill="none">
						<path
							d="M12 3.50L14.70 9.18L20.94 10L16.37 14.32L17.53 20.50L12 17.50L6.47 20.50L7.63 14.32L3.06 10L9.30 9.18Z"
							fill={color}
							stroke={color}
							stroke-width="2.2"
							stroke-linejoin="round"
						/>
					</svg>
				</div>
				<div class="flip-face flip-back" style:background={color}>
					<svg viewBox="0 0 24 24" width="30" height="30" fill="none">
						<path
							d="M5 13l4 4L19 7"
							stroke="#ffffff"
							stroke-width="3.5"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				</div>
			</div>
		</a>
	{:else}
		<svelte:element
			this={status === 'locked' ? 'div' : 'a'}
			href={status === 'locked' ? undefined : `/lesson/${nodeId}`}
			class="circle"
			style:background={status === 'cleared' ? color : status === 'locked' ? '#e3e3e1' : status === 'open' ? '#fffdf6' : '#ffffff'}
			style:border-color={status === 'locked' ? '#c9c9c9' : color}
			aria-label={label}
			aria-disabled={status === 'locked'}
		>
			{#if status === 'locked'}
				<svg viewBox="0 0 24 24" width="26" height="26" fill="none">
					<path
						d="M6 10V8a6 6 0 1 1 12 0v2m-13 0h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z"
						stroke="#9e9e9e"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			{:else if status === 'cleared'}
				<svg viewBox="0 0 24 24" width="30" height="30" fill="none">
					<path
						d="M5 13l4 4L19 7"
						stroke="#ffffff"
						stroke-width="3.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			{:else if kind === 'practice'}
				<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke={color} stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
					<path d="M18.5 9A7 7 0 1 0 19 14" />
					<path d="M19 4v5h-5" />
				</svg>
			{:else if kind === 'review-unit' || kind === 'review-mix'}
				<svg viewBox="0 0 24 24" width="30" height="30" fill="none">
					<path d="M7 4.5h10v15l-5-3.6-5 3.6v-15Z" fill={color} stroke={color} stroke-width="2.2" stroke-linejoin="round" />
				</svg>
			{:else}
				<svg viewBox="0 0 24 24" width="30" height="30" fill="none">
					<path
						d="M12 3.50L14.70 9.18L20.94 10L16.37 14.32L17.53 20.50L12 17.50L6.47 20.50L7.63 14.32L3.06 10L9.30 9.18Z"
						fill={color}
						stroke={color}
						stroke-width="2.2"
						stroke-linejoin="round"
					/>
				</svg>
			{/if}
		</svelte:element>
	{/if}

	<span class="label">{label}</span>
</div>

<style>
	.node-wrap {
		position: absolute;
		display: flex;
		flex-direction: column;
		align-items: center;
		transform: translateX(-50%);
	}

	.pulse-ring {
		position: absolute;
		inset: -8px;
		border-radius: 999px;
		opacity: 0.35;
		animation: pulse 1.8s ease-out infinite;
	}

	@keyframes pulse {
		0% {
			transform: scale(0.85);
			opacity: 0.5;
		}
		100% {
			transform: scale(1.35);
			opacity: 0;
		}
	}

	.circle {
		position: relative;
		width: 100%;
		height: 100%;
		border-radius: 999px;
		border: 4px solid;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 6px 0 rgba(0, 0, 0, 0.15);
		cursor: pointer;
		padding: 0;
		box-sizing: border-box;
		text-decoration: none;
		transition:
			transform 0.1s ease,
			box-shadow 0.1s ease;
	}

	.circle:active {
		transform: translateY(4px);
		box-shadow: 0 2px 0 rgba(0, 0, 0, 0.15);
	}

	.open .circle {
		background: #fffdf6;
		box-shadow:
			inset 0 0 0 3px #ffffff,
			0 5px 0 rgba(0, 0, 0, 0.13);
	}

	.review .circle {
		outline: 3px solid var(--node-color);
		outline-offset: 3px;
	}

	.locked .circle {
		box-shadow: 0 6px 0 #b5b5b5;
		cursor: default;
	}

	.locked .circle:active {
		transform: none;
		box-shadow: 0 6px 0 #b5b5b5;
	}

	.label {
		margin-top: 6px;
		font-size: 11px;
		font-weight: 700;
		color: #5f5f5d;
		/* 道や模様の上でも読めるように、背景色で縁取る */
		text-shadow:
			0 0 3px #fbfaf5,
			0 0 3px #fbfaf5,
			0 0 5px #fbfaf5;
		white-space: nowrap;
		text-align: center;
	}

	.current .label {
		color: #3b3b3a;
	}

	.flip-scene {
		display: block;
		position: relative;
		width: 100%;
		height: 100%;
		perspective: 800px;
	}

	.flip-card {
		position: relative;
		width: 100%;
		height: 100%;
		transform-style: preserve-3d;
		transition: transform 0.7s cubic-bezier(0.4, 0.2, 0.2, 1);
	}

	.flip-card.flipped {
		transform: rotateY(180deg);
	}

	.flip-face {
		position: absolute;
		inset: 0;
		border-radius: 999px;
		display: flex;
		align-items: center;
		justify-content: center;
		backface-visibility: hidden;
		box-shadow: 0 6px 0 rgba(0, 0, 0, 0.15);
		box-sizing: border-box;
	}

	.flip-front {
		background: #ffffff;
		border: 4px solid;
	}

	.flip-back {
		transform: rotateY(180deg);
	}

	@keyframes unlock-pop {
		0% {
			transform: translateX(-50%) scale(0.4);
			opacity: 0;
		}
		60% {
			transform: translateX(-50%) scale(1.15);
			opacity: 1;
		}
		100% {
			transform: translateX(-50%) scale(1);
			opacity: 1;
		}
	}

	.node-wrap.unlock-pop {
		animation: unlock-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
	}
</style>
