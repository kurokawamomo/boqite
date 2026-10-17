<script lang="ts">
	import { onMount } from 'svelte';
	import { playLessonClearFanfare } from '$lib/audio';
	import { formatDuration } from './session';

	let {
		total,
		mistakes,
		accuracy = null,
		elapsedSeconds = null,
		progressFailed = false,
		submitting = false,
		oncontinue
	}: {
		total: number;
		mistakes: number;
		accuracy?: number | null;
		elapsedSeconds?: number | null;
		/** 進捗の保存にリトライしても失敗した（node_progress/attemptsが更新されていない可能性がある） */
		progressFailed?: boolean;
		/** 進捗/ストリークPOSTが実行中か。完了前に離脱できてしまうと保存前にページを離れうる */
		submitting?: boolean;
		oncontinue?: () => void;
	} = $props();

	onMount(() => {
		playLessonClearFanfare();
	});
</script>

<div class="clear">
	<div class="stamp-seal">
		<span class="kanji">済</span>
	</div>

	<p class="message">
		{mistakes === 0 ? 'ノーミス！' : `${total}問クリア　まちがい ${mistakes}回`}
	</p>

	{#if progressFailed}
		<p class="progress-warning">
			⚠️ 記録が保存されていない可能性があります
		</p>
	{/if}

	<div class="stats">
		{#if accuracy !== null}
			<div class="stat">
				<span class="stat-value">{accuracy}%</span>
				<span class="stat-label">正答率</span>
			</div>
		{/if}
		{#if elapsedSeconds !== null}
			<div class="stat">
				<span class="stat-value">{formatDuration(elapsedSeconds)}</span>
				<span class="stat-label">所要時間</span>
			</div>
		{/if}
	</div>

	<button type="button" class="back" disabled={submitting} onclick={() => oncontinue?.()}>
		{submitting ? '保存中…' : 'つづける'}
	</button>
</div>

<style>
	.clear {
		min-height: 100dvh;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 18px;
		padding: 24px;
		text-align: center;
	}

	.stamp-seal {
		width: 132px;
		height: 132px;
		border-radius: 50%;
		border: 5px solid #55c50d;
		outline: 2px solid #55c50d;
		outline-offset: -10px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: #55c50d;
		animation: stamp-slam 0.55s cubic-bezier(0.2, 1.6, 0.4, 1) both;
	}

	.kanji {
		font-size: 2.6rem;
		font-weight: 900;
		line-height: 1;
	}

	@keyframes stamp-slam {
		0% {
			transform: rotate(10deg) scale(2.6);
			opacity: 0;
		}
		55% {
			transform: rotate(-11deg) scale(0.92);
			opacity: 1;
		}
		75% {
			transform: rotate(-5deg) scale(1.07);
		}
		100% {
			transform: rotate(-8deg) scale(1);
		}
	}

	.progress-warning {
		margin: 0 0 8px;
		padding: 10px 14px;
		border-radius: 10px;
		background: #fff4e5;
		color: #9a5b00;
		font-size: 0.85rem;
		font-weight: 600;
		text-align: center;
		max-width: 320px;
	}

	.message {
		font-size: 1rem;
		font-weight: 700;
		color: #3b3b3a;
		margin: 0;
	}

	.stats {
		display: flex;
		gap: 24px;
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
	}

	.stat-value {
		font-size: 1.3rem;
		font-weight: 900;
		color: #3b3b3a;
	}

	.stat-label {
		font-size: 0.7rem;
		font-weight: 700;
		color: #adadab;
	}

	.back {
		appearance: none;
		border: none;
		border-radius: 1rem;
		padding: 0.9rem 2rem;
		font-size: 1rem;
		font-weight: 800;
		color: #ffffff;
		background: #55c50d;
		box-shadow: 0 4px 0 #3f9a0a;
		touch-action: manipulation;
	}

	.back:disabled {
		opacity: 0.6;
	}

	.back:active {
		transform: translateY(3px);
		box-shadow: 0 0 0 transparent;
	}
</style>
