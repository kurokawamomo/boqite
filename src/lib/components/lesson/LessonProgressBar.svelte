<script lang="ts">
	let { total, cleared, onclose }: { total: number; cleared: number; onclose?: () => void } = $props();

	const percent = $derived(total === 0 ? 0 : Math.min(100, (cleared / total) * 100));
</script>

<div class="bar">
	<button type="button" class="close" aria-label="レッスンを終了" onclick={() => onclose?.()}>×</button>
	<div class="track">
		<div class="fill" style:width="{percent}%"></div>
	</div>
</div>

<style>
	.bar {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 16px;
	}

	.close {
		appearance: none;
		border: none;
		background: transparent;
		font-size: 1.4rem;
		line-height: 1;
		color: #adadab;
		padding: 0;
		cursor: pointer;
	}

	.track {
		flex: 1;
		height: 14px;
		border-radius: 999px;
		background: #e3e3e1;
		overflow: hidden;
	}

	.fill {
		height: 100%;
		border-radius: 999px;
		background: #55c50d;
		transition: width 0.25s ease;
	}
</style>
