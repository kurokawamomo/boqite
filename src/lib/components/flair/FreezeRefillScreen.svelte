<script lang="ts">
	import { onMount } from 'svelte';
	import { playFreezeRefill } from '$lib/audio';
	import ScreenCta from './ScreenCta.svelte';

	let {
		count,
		cap,
		oncontinue
	}: { count: number; cap: number; oncontinue?: () => void } = $props();

	const FLAKES = 22;
	const ARMS = [0, 60, 120];

	onMount(playFreezeRefill);
</script>

<div class="screen" role="dialog" aria-label="フリーズ +1">
	<div class="burst"></div>

	{#each { length: FLAKES } as _, i (i)}
		<span
			class="flake"
			style:--x="{(i * 53) % 100}vw"
			style:--delay="{(i % 9) * 0.28}s"
			style:--dur="{3 + (i % 5) * 0.6}s"
			style:--size="{5 + (i % 4) * 3}px"
		></span>
	{/each}

	<svg class="crystal" viewBox="-12 -12 24 24" aria-hidden="true">
		<g
			stroke="#ffffff"
			stroke-width="1.5"
			stroke-linecap="round"
			stroke-linejoin="round"
			fill="none"
		>
			{#each ARMS as angle (angle)}
				<g transform="rotate({angle})">
					<path d="M0 -10.5V10.5" />
					<path d="M-2.6 -8 0 -5.6 2.6 -8" />
					<path d="M-2.6 8 0 5.6 2.6 8" />
				</g>
			{/each}
		</g>
		<circle r="1.7" fill="#ffffff" />
	</svg>

	<p class="label">フリーズ</p>
	<p class="plus">+1</p>
	<p class="stock">
		<span class="stock-count">{count}</span><span class="stock-cap">/{cap}</span>
	</p>

	<div class="action">
		<ScreenCta label="つづける" color="#0b78c4" edge="#0a5c98" onclick={oncontinue} />
	</div>
</div>

<style>
	.screen {
		position: fixed;
		inset: 0;
		z-index: 210;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 24px 24px calc(24px + env(safe-area-inset-bottom, 0px));
		overflow: hidden;
		color: #ffffff;
		background: radial-gradient(ellipse at 50% 40%, #7fdcff 0%, #1fa9ee 45%, #0a6fc2 100%);
		animation: bg-in 0.25s ease-out both;
	}

	.burst {
		position: absolute;
		left: 50%;
		top: 36%;
		width: 130vmax;
		height: 130vmax;
		transform: translate(-50%, -50%);
		background: repeating-conic-gradient(
			from 0deg,
			rgba(255, 255, 255, 0.2) 0deg 6deg,
			rgba(255, 255, 255, 0) 6deg 30deg
		);
		mask-image: radial-gradient(circle, #000 0%, transparent 50%);
		animation:
			burst-in 0.7s ease-out both,
			spin 24s linear 0.7s infinite;
	}

	.crystal {
		position: relative;
		width: min(56vw, 250px);
		height: auto;
		filter: drop-shadow(0 8px 0 rgba(6, 70, 130, 0.5));
		animation:
			crystal-in 0.9s cubic-bezier(0.2, 1.5, 0.4, 1) 0.1s both,
			turn 14s linear 1s infinite;
	}

	.label {
		margin: 1rem 0 0;
		font-size: 1.6rem;
		font-weight: 900;
		text-shadow: 0 3px 0 #0a5c98;
		animation: pop 0.4s ease-out 0.7s both;
	}

	.plus {
		margin: 0;
		font-size: 7rem;
		font-weight: 900;
		line-height: 1;
		text-shadow: 0 7px 0 #0a5c98;
		animation: slam 0.55s cubic-bezier(0.2, 1.6, 0.4, 1) 0.9s both;
	}

	.stock {
		margin: 0.6rem 0 0;
		padding: 0.35rem 1.1rem;
		border-radius: 999px;
		background: rgba(8, 80, 140, 0.35);
		font-weight: 900;
		animation: pop 0.4s ease-out 1.4s both;
	}

	.stock-count {
		font-size: 1.5rem;
	}

	.stock-cap {
		font-size: 1rem;
		opacity: 0.8;
	}

	.action {
		margin-top: 2rem;
		animation: pop 0.4s ease-out 1.7s both;
	}

	.flake {
		position: absolute;
		left: var(--x);
		top: -20px;
		width: var(--size);
		height: var(--size);
		border-radius: 50%;
		background: #ffffff;
		opacity: 0;
		animation: fall var(--dur) linear var(--delay) infinite;
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

	@keyframes turn {
		to {
			transform: rotate(360deg);
		}
	}

	@keyframes burst-in {
		from {
			opacity: 0;
			scale: 0.3;
		}
	}

	@keyframes crystal-in {
		0% {
			transform: scale(0.1) rotate(-120deg);
			opacity: 0;
		}
		100% {
			transform: scale(1) rotate(0deg);
			opacity: 1;
		}
	}

	@keyframes slam {
		0% {
			transform: scale(2.6);
			opacity: 0;
		}
		60% {
			transform: scale(0.92);
			opacity: 1;
		}
		100% {
			transform: scale(1);
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

	@keyframes fall {
		0% {
			transform: translateY(0) translateX(0);
			opacity: 0;
		}
		10% {
			opacity: 0.9;
		}
		100% {
			transform: translateY(108vh) translateX(24px);
			opacity: 0.2;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.screen *,
		.screen {
			animation: none !important;
		}

		.flake {
			display: none;
		}
	}
</style>
