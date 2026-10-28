<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * 帳簿・様式の表を、画面の幅に収まる大きさに縮めて見せる。実帳簿の欄の並びは崩さず、縮め方は minScale まで。
	 * それでも収まらない表は横スクロールで見せ、続きがある側の端に影を出す。
	 */
	let { children, minScale = 0.75 }: { children: Snippet; minScale?: number } = $props();

	let box = $state<HTMLDivElement>();
	let inner = $state<HTMLDivElement>();

	$effect(() => {
		if (!box || !inner) return;
		const fit = () => {
			if (!box || !inner) return;
			inner.style.zoom = '';
			const natural = inner.scrollWidth;
			const available = box.clientWidth;
			if (natural > available && available > 0) inner.style.zoom = String(Math.max(minScale, available / natural));
		};
		fit();
		const observer = new ResizeObserver(fit);
		observer.observe(box);
		return () => observer.disconnect();
	});
</script>

<div class="fit-scroll" bind:this={box}>
	<div class="inner" bind:this={inner}>{@render children()}</div>
</div>

<style>
	.fit-scroll {
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		padding: 4px;
		/* 横にスクロールできるとき、続きがある側の端に影を出す */
		background:
			linear-gradient(to right, #ffffff 30%, rgba(255, 255, 255, 0)) left center / 24px 100% no-repeat local,
			linear-gradient(to left, #ffffff 30%, rgba(255, 255, 255, 0)) right center / 24px 100% no-repeat local,
			radial-gradient(farthest-side at 0 50%, rgba(0, 0, 0, 0.18), rgba(0, 0, 0, 0)) left center / 10px 100% no-repeat scroll,
			radial-gradient(farthest-side at 100% 50%, rgba(0, 0, 0, 0.18), rgba(0, 0, 0, 0)) right center / 10px 100% no-repeat scroll;
	}

	.inner {
		width: max-content;
		min-width: 100%;
	}
</style>
