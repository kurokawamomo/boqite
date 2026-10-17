<script lang="ts">
	import { page } from '$app/state';
	import StreakFlameScreen from '$lib/components/flair/StreakFlameScreen.svelte';
	import FreezeRefillScreen from '$lib/components/flair/FreezeRefillScreen.svelte';
	import JudgmentSheet from '$lib/components/lesson/JudgmentSheet.svelte';
	import ClearScreen from '$lib/components/lesson/ClearScreen.svelte';

	const screen = $derived(page.url.searchParams.get('screen'));
	const count = $derived(Number(page.url.searchParams.get('count') ?? 7));
</script>

<svelte:head>
	<title>演出プレビュー</title>
</svelte:head>

{#if screen === 'flame'}
	<StreakFlameScreen {count} />
{:else if screen === 'freeze'}
	<FreezeRefillScreen count={2} cap={2} />
{:else if screen === 'judge-ok'}
	<JudgmentSheet result="correct" oncontinue={() => {}} />
{:else if screen === 'judge-ng'}
	<JudgmentSheet result="incorrect" explanation="借方は資産の増加、貸方は収益の発生。" oncontinue={() => {}} />
{:else if screen === 'clear'}
	<ClearScreen total={8} mistakes={1} accuracy={88} elapsedSeconds={95} oncontinue={() => {}} />
{:else}
	<ul>
		<li><a href="?screen=flame&count=7">炎</a></li>
		<li><a href="?screen=freeze">フリーズ補充</a></li>
		<li><a href="?screen=judge-ok">判定（正解）</a></li>
		<li><a href="?screen=judge-ng">判定（不正解）</a></li>
		<li><a href="?screen=clear">クリア</a></li>
	</ul>
{/if}
