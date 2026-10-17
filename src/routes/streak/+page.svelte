<script lang="ts">
	import { StreakCalendar, StreakSummary, computeLongestStreak } from '$lib/components/streak-cal';
	import BackLink from '$lib/components/nav/BackLink.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const longestStreak = $derived(computeLongestStreak(data.logs));
</script>

<div class="page">
	<BackLink />
	<h1>ストリークカレンダー</h1>

	<StreakSummary
		currentStreak={data.currentStreak}
		{longestStreak}
		freezeCount={data.freezeCount}
		freezeCap={data.freezeCap}
	/>

	<StreakCalendar logs={data.logs} today={data.today} />

	<p class="legend">🔥 クリア済み　❄️ フリーズで維持</p>
</div>

<style>
	.page {
		box-sizing: border-box;
		min-height: 100dvh;
		padding: 1.5rem 1rem 3rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.25rem;
		background: #ffffff;
	}

	h1 {
		font-size: 1.1rem;
		margin: 0;
	}

	.legend {
		font-size: 0.75rem;
		color: #888;
		margin: 0;
	}
</style>
