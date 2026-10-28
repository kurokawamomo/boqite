<script lang="ts">
	/**
	 * Boquito（リュック蜂マスコット）。Flash風の軽量CSSアニメで idle/happy/cheer を切り替える。
	 * 組込み先(マップ・レッスン)は本コンポーネントの責務外。表示だけを提供する。
	 */
	let {
		state = 'idle',
		size = 120,
		facing = 'right'
	}: {
		state?: 'idle' | 'happy' | 'cheer';
		size?: number;
		facing?: 'left' | 'right';
	} = $props();
</script>

<div
	class="mascot"
	class:idle={state === 'idle'}
	class:happy={state === 'happy'}
	class:cheer={state === 'cheer'}
	class:flip={facing === 'left'}
	style:width="{size}px"
	style:height="{size}px"
>
	<img src="/boquito.png" alt="Boquito" draggable="false" />
</div>

<style>
	.mascot {
		display: inline-block;
		will-change: transform;
		transform-origin: 50% 90%;
	}

	.mascot img {
		width: 100%;
		height: 100%;
		object-fit: contain;
		pointer-events: none;
		user-select: none;
	}

	.flip {
		transform: scaleX(-1);
	}

	.idle {
		animation: float 2.4s ease-in-out infinite;
	}

	.idle.flip {
		animation: float-flip 2.4s ease-in-out infinite;
	}

	.happy {
		animation: jump 0.6s ease-in-out infinite;
	}

	.happy.flip {
		animation: jump-flip 0.6s ease-in-out infinite;
	}

	.cheer {
		animation: cheer 0.35s ease-in-out infinite;
	}

	.cheer.flip {
		animation: cheer-flip 0.35s ease-in-out infinite;
	}

	@keyframes float {
		0%,
		100% {
			transform: translateY(0) rotate(-3deg);
		}
		50% {
			transform: translateY(-10px) rotate(3deg);
		}
	}

	@keyframes float-flip {
		0%,
		100% {
			transform: scaleX(-1) translateY(0) rotate(-3deg);
		}
		50% {
			transform: scaleX(-1) translateY(-10px) rotate(3deg);
		}
	}

	@keyframes jump {
		0%,
		100% {
			transform: translateY(0) scale(1, 1);
		}
		30% {
			transform: translateY(-22px) scale(0.95, 1.05);
		}
		55% {
			transform: translateY(0) scale(1.08, 0.92);
		}
		75% {
			transform: translateY(-6px) scale(1);
		}
	}

	@keyframes jump-flip {
		0%,
		100% {
			transform: scaleX(-1) translateY(0) scale(1, 1);
		}
		30% {
			transform: scaleX(-1) translateY(-22px) scale(0.95, 1.05);
		}
		55% {
			transform: scaleX(-1) translateY(0) scale(1.08, 0.92);
		}
		75% {
			transform: scaleX(-1) translateY(-6px) scale(1);
		}
	}

	@keyframes cheer {
		0%,
		100% {
			transform: translateY(0) rotate(-8deg);
		}
		50% {
			transform: translateY(-14px) rotate(8deg);
		}
	}

	@keyframes cheer-flip {
		0%,
		100% {
			transform: scaleX(-1) translateY(0) rotate(-8deg);
		}
		50% {
			transform: scaleX(-1) translateY(-14px) rotate(8deg);
		}
	}
</style>
