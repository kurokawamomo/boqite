<script lang="ts">
	import StreakHeader from '$lib/components/map/StreakHeader.svelte';
	import CourseSwitcher from '$lib/components/map/CourseSwitcher.svelte';
	import SnakeMap from '$lib/components/map/SnakeMap.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Boqite - 簿記3級レッスン</title>
</svelte:head>

<div class="page">
	<StreakHeader streak={data.streak} />
	<CourseSwitcher courses={data.courses} activeId={data.courseId} />
	<main>
		<SnakeMap units={data.units} />
	</main>
</div>

<style>
	:global(body) {
		margin: 0;
		background: #f6f6f5;
		/* マップのノード演出(pulse-ring/box-shadow)がコンテナ幅を僅かに超えても
		   ページ全体が横スクロールしないよう保険を掛ける(GitHub #5) */
		overflow-x: hidden;
	}

	.page {
		min-height: 100vh;
	}

	main {
		padding-bottom: 48px;
	}
</style>
