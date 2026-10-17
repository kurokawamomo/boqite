<script lang="ts">
	import '$lib/audio/shake.css';
	import {
		unlockAudio,
		isAudioUnlocked,
		playCorrectChime,
		playIncorrectBuzz,
		playLessonClearFanfare,
		playChipClick
	} from '$lib/audio';

	let unlocked = $state(false);
	let shaking = $state(false);

	async function handleUnlock() {
		await unlockAudio();
		unlocked = isAudioUnlocked();
	}

	function triggerShake() {
		shaking = false;
		// 同じクラスを連続で付けても再アニメーションしないため、一度外してから付け直す
		requestAnimationFrame(() => {
			shaking = true;
		});
	}
</script>

<div class="page">
	<h1>効果音・演出デモ</h1>

	<button class="unlock" onclick={handleUnlock}>
		{unlocked ? '🔓 解禁済み' : '🔒 タップして音を解禁 (iOS Safari 対策)'}
	</button>

	<div class="grid">
		<button onclick={playCorrectChime}>✅ 正解チャイム</button>
		<button onclick={playIncorrectBuzz}>❌ 不正解ブザー</button>
		<button onclick={playLessonClearFanfare}>🎉 レッスンクリア</button>
		<button onclick={playChipClick}>🔘 チップ配置クリック</button>
	</div>

	<div class="shake-demo">
		<p>navigator.vibrate 非対応環境向けのシェイク演出:</p>
		<div
			class="shake-target"
			class:shake={shaking}
			onanimationend={() => (shaking = false)}
		>
			不正解時の揺れ
		</div>
		<button onclick={triggerShake}>シェイクを再生</button>
	</div>
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

	.unlock {
		padding: 0.75rem 1rem;
		border-radius: 0.75rem;
		border: 1px solid #ccc;
		background: #fafafa;
		font-size: 0.95rem;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
		width: 100%;
		max-width: 20rem;
	}

	.grid button {
		padding: 1rem 0.5rem;
		border-radius: 0.75rem;
		border: 1px solid #ddd;
		background: #f5f5f5;
		font-size: 0.9rem;
	}

	.shake-demo {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		margin-top: 1rem;
	}

	.shake-target {
		padding: 1rem 1.5rem;
		border-radius: 0.75rem;
		background: #ffe5e5;
		color: #b00020;
		font-weight: bold;
	}

	.shake-demo button {
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		border: 1px solid #ddd;
		background: #f5f5f5;
	}
</style>
