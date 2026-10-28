<script lang="ts">
	import { onMount } from 'svelte';
	import favicon from '$lib/assets/favicon.png';
	import { installAudioUnlock } from '$lib/audio';

	let { children } = $props();

	// 最初のタップで音を解禁する（iOS Safari は操作の中でしか鳴らせない）
	onMount(() => installAudioUnlock());
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@500;700;800;900&display=swap"
	/>
</svelte:head>

{@render children()}

<style>
	:global(body) {
		font-family:
			'M PLUS Rounded 1c', 'Hiragino Maru Gothic ProN', 'Hiragino Sans', 'Yu Gothic', system-ui,
			sans-serif;
	}
</style>
