<script lang="ts">
	import { goto } from '$app/navigation';
	import LessonSession from '$lib/components/lesson/LessonSession.svelte';
	import { unlockAudio } from '$lib/audio';
	import { localDateString } from '$lib/streak/date';
	import { postStreakClear, type StreakClearResult } from '$lib/components/lesson/streak';
	import { submitLessonProgress } from '$lib/components/lesson/progress';
	import type { LessonSummary } from '$lib/components/lesson/session';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const nodeId = $derived(data.node.id);

	let started = $state(false);
	let streakResult = $state<StreakClearResult | null>(null);
	let progressFailed = $state(false);
	/**
	 * handleComplete の完了待ち。
	 *
	 * ClearScreen の「地図にもどる」は、進捗POSTがまだ実行中でも即タップできてしまい、
	 * 特に素早い連続操作だと画面遷移がリトライ中のfetchより先に起きる余地があった
	 * （通信状況次第では取りこぼしうる）。このフラグで待たせて、
	 * 書き込みが確定してから遷移できるようにする。
	 */
	let submitting = $state(false);

	async function start() {
		await unlockAudio();
		started = true;
	}

	async function handleComplete(summary: LessonSummary) {
		submitting = true;
		// 進捗POSTは元 void fetch(...) の fire-and-forget で、失敗しても誰も気づけなかった
		// （ネットワーク不調・ページ遷移によるリクエスト中断等で node_progress/attempts が
		// 書き込まれないままクリア画面だけ表示される「進捗が記録されなくなることがある」の原因）。
		// リトライ付きで待ち受け、それでも失敗した場合だけユーザーに知らせる。
		progressFailed = !(await submitLessonProgress(nodeId, summary));
		// ストリークAPIはここ1箇所からのみ叩く（レビュー🔴-2: LessonSession側の重複POSTは削除済み）。
		// クライアントのローカル日付で判定する仕様のため toISOString() は使わない（レビュー🔴-1）。
		streakResult = await postStreakClear(localDateString(new Date()));
		submitting = false;
	}

	/** 進捗を保存しないコースはクリア済みの印が付かないので、クリア演出（cleared）は付けない */
	function handleFinish() {
		const query = new URLSearchParams({ course: data.course.id });
		if (data.course.persistProgress) query.set('cleared', nodeId);
		goto(`/?${query}`);
	}

	function handleClose() {
		goto(`/?course=${encodeURIComponent(data.course.id)}`);
	}
</script>

<svelte:head>
	<title>Boqite - {data.node.title}</title>
</svelte:head>

<div class="lesson-page">
	{#if started}
		<LessonSession
			questions={data.node.questions}
			accounts={data.accounts}
			{streakResult}
			{progressFailed}
			{submitting}
			onComplete={handleComplete}
			onFinish={handleFinish}
			onClose={handleClose}
		/>
	{:else}
		<div class="start-gate">
			<p class="title">{data.node.title}</p>
			{#if data.node.questions.length === 0}
				<p class="empty">準備中</p>
				<button type="button" class="start" onclick={handleClose}>地図にもどる</button>
			{:else}
				<button type="button" class="start" onclick={start}>レッスンをはじめる</button>
			{/if}
		</div>
	{/if}
</div>

<style>
	:global(body) {
		margin: 0;
	}

	.lesson-page {
		min-height: 100dvh;
		max-width: 480px;
		margin: 0 auto;
		background: #ffffff;
	}

	.start-gate {
		min-height: 100dvh;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 24px;
		padding: 24px;
		text-align: center;
	}

	.title {
		font-size: 1.2rem;
		font-weight: 800;
		color: #3b3b3a;
		margin: 0;
	}

	.empty {
		margin: 0;
		font-weight: 700;
		color: #afafaf;
	}

	.start {
		appearance: none;
		border: none;
		border-radius: 1rem;
		padding: 1rem 2.5rem;
		font-size: 1.05rem;
		font-weight: 800;
		color: #ffffff;
		background: #55c50d;
		box-shadow: 0 4px 0 #3f9a0a;
		touch-action: manipulation;
	}

	.start:active {
		transform: translateY(3px);
		box-shadow: 0 0 0 transparent;
	}
</style>
