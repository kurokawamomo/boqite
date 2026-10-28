<script lang="ts">
	import { onMount } from 'svelte';
	import { playStreakFlame } from '$lib/audio';
	import ScreenCta from './ScreenCta.svelte';

	let { count, oncontinue }: { count: number; oncontinue?: () => void } = $props();

	const EMBERS = 16;

	onMount(playStreakFlame);
</script>

<div class="screen" role="dialog" aria-label="{count}日連続">
	<div class="glow"></div>
	<div class="ring r1"></div>
	<div class="ring r2"></div>

	{#each { length: EMBERS } as _, i (i)}
		<span
			class="ember"
			style:--x="{((i * 37) % 100) - 50}vw"
			style:--delay="{0.5 + (i % 8) * 0.22}s"
			style:--dur="{1.9 + (i % 5) * 0.35}s"
			style:--size="{6 + (i % 4) * 4}px"
		></span>
	{/each}

	<svg class="flame" viewBox="0 0 24 26" aria-hidden="true">
		<defs>
			<linearGradient id="flame-outer" x1="0" y1="1" x2="0" y2="0">
				<stop offset="0" stop-color="#ff4b00" />
				<stop offset="1" stop-color="#ffb400" />
			</linearGradient>
		</defs>
		<path
			d="M12 1c1 3-2 4.5-2 7a3 3 0 0 0 6 0c0-1-.5-2-.5-2 2 1 3.5 3.5 3.5 6a7 7 0 1 1-14 0c0-4.5 3-7 4-8 1-1 2-2 3-3Z"
			fill="url(#flame-outer)"
			stroke="#ffffff"
			stroke-width="0.9"
			stroke-linejoin="round"
		/>
		<path
			class="core"
			d="M12 11c.6 1.8-1.4 2.7-1.4 4.4a2.6 2.6 0 0 0 5.2 0c0-1.6-1.1-2.3-1.6-3.6-.7 1-.9 1.3-1.4 1.3-.5-.6-.8-1.3-.8-2.1Z"
			fill="#fff3b0"
		/>
	</svg>

	<div class="count-wrap" style:--digits={String(count).length}>
		<span class="count old" aria-hidden="true">{Math.max(0, count - 1)}</span>
		<span class="count new">{count}</span>
	</div>
	<p class="unit">日連続</p>

	<div class="action">
		<ScreenCta label="つづける" color="#e04a00" edge="#b33a00" onclick={oncontinue} />
	</div>
</div>

<style>
	.screen {
		position: fixed;
		inset: 0;
		z-index: 200;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 24px 24px calc(24px + env(safe-area-inset-bottom, 0px));
		overflow: hidden;
		color: #ffffff;
		background: radial-gradient(ellipse at 50% 62%, #ffb020 0%, #ff7a00 42%, #d93f00 100%);
		animation: bg-in 0.25s ease-out both;
	}

	.glow {
		position: absolute;
		left: 50%;
		top: 38%;
		width: 120vmax;
		height: 120vmax;
		transform: translate(-50%, -50%);
		background: repeating-conic-gradient(
			from 0deg,
			rgba(255, 255, 255, 0.16) 0deg 9deg,
			rgba(255, 255, 255, 0) 9deg 24deg
		);
		mask-image: radial-gradient(circle, #000 0%, transparent 55%);
		animation: spin 18s linear infinite;
	}

	.ring {
		position: absolute;
		left: 50%;
		top: 38%;
		width: 40vmin;
		height: 40vmin;
		border-radius: 50%;
		border: 6px solid rgba(255, 255, 255, 0.7);
		transform: translate(-50%, -50%) scale(0.2);
		opacity: 0;
		animation: ring 1.3s ease-out 0.45s both;
	}

	.r2 {
		animation-delay: 0.7s;
	}

	.flame {
		position: relative;
		width: min(58vw, 260px);
		height: auto;
		margin-top: -4vh;
		filter: drop-shadow(0 10px 0 rgba(150, 40, 0, 0.45));
		transform-origin: 50% 100%;
		animation:
			flame-rise 0.8s cubic-bezier(0.2, 1.5, 0.4, 1) 0.1s both,
			flicker 0.9s ease-in-out 0.9s infinite;
	}

	.core {
		transform-origin: 50% 90%;
		animation: flicker 0.6s ease-in-out 0.9s infinite reverse;
	}

	/* 旧い数字と新しい数字を同じマスに重ねる。幅は長いほうの桁数で決まり、上下に動かす間だけ縦を切る */
	.count-wrap {
		display: grid;
		height: 8.5rem;
		min-width: 6rem;
		margin-top: 0.5rem;
		overflow: hidden;
	}

	.count {
		grid-area: 1 / 1;
		display: flex;
		align-items: center;
		justify-content: center;
		/* 桁が増えても画面の幅に収める。数字 1 桁の幅はおよそ 0.7em */
		font-size: min(7.5rem, calc((100vw - 3rem) / (var(--digits) * 0.7)));
		font-weight: 900;
		line-height: 1;
		text-shadow: 0 7px 0 #b33a00;
	}

	.old {
		animation: out-up 0.45s ease-in 1s both;
	}

	.new {
		animation: in-up 0.55s cubic-bezier(0.2, 1.5, 0.4, 1) 1.05s both;
	}

	.unit {
		margin: 0;
		font-size: 1.7rem;
		font-weight: 900;
		text-shadow: 0 3px 0 #b33a00;
		animation: pop 0.4s ease-out 1.3s both;
	}

	.action {
		margin-top: 2.2rem;
		animation: pop 0.4s ease-out 1.6s both;
	}

	.ember {
		position: absolute;
		left: calc(50% + var(--x));
		bottom: -20px;
		width: var(--size);
		height: var(--size);
		border-radius: 50%;
		background: #ffe27a;
		opacity: 0;
		animation: ember var(--dur) ease-out var(--delay) infinite;
	}

	@keyframes bg-in {
		from {
			opacity: 0;
		}
	}

	@keyframes spin {
		to {
			transform: translate(-50%, -50%) rotate(360deg);
		}
	}

	@keyframes ring {
		0% {
			opacity: 0.9;
			transform: translate(-50%, -50%) scale(0.2);
		}
		100% {
			opacity: 0;
			transform: translate(-50%, -50%) scale(3.2);
		}
	}

	@keyframes flame-rise {
		0% {
			transform: translateY(40vh) scale(0.1);
			opacity: 0;
		}
		100% {
			transform: translateY(0) scale(1);
			opacity: 1;
		}
	}

	@keyframes flicker {
		0%,
		100% {
			transform: scale(1, 1) rotate(0deg);
		}
		35% {
			transform: scale(0.96, 1.05) rotate(-1.5deg);
		}
		70% {
			transform: scale(1.03, 0.97) rotate(1.5deg);
		}
	}

	@keyframes out-up {
		to {
			transform: translateY(-100%);
			opacity: 0;
		}
	}

	@keyframes in-up {
		from {
			transform: translateY(100%) scale(0.6);
			opacity: 0;
		}
		to {
			transform: translateY(0) scale(1);
			opacity: 1;
		}
	}

	@keyframes pop {
		from {
			transform: scale(0.5);
			opacity: 0;
		}
		to {
			transform: scale(1);
			opacity: 1;
		}
	}

	@keyframes ember {
		0% {
			transform: translateY(0) scale(1);
			opacity: 0;
		}
		15% {
			opacity: 0.95;
		}
		100% {
			transform: translateY(-105vh) scale(0.3);
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.screen *,
		.screen {
			animation: none !important;
		}

		.old,
		.ember,
		.ring {
			display: none;
		}
	}
</style>
