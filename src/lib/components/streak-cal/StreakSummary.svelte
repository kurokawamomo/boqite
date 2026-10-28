<script lang="ts">
	type Props = {
		currentStreak: number;
		longestStreak: number;
		freezeCount: number;
		freezeCap: number;
	};

	let { currentStreak, longestStreak, freezeCount, freezeCap }: Props = $props();
</script>

<div class="summary">
	<div class="stat">
		<span class="icon" aria-hidden="true">🔥</span>
		<span class="value">{currentStreak}</span>
		<span class="label">現在のストリーク</span>
	</div>
	<div class="stat">
		<span class="icon" aria-hidden="true">🏆</span>
		<span class="value">{longestStreak}</span>
		<span class="label">最長ストリーク</span>
	</div>
	<div class="stat">
		<span class="icon" aria-hidden="true">❄️</span>
		<span class="value">{freezeCount}<span class="cap">/{freezeCap}</span></span>
		<span class="label">フリーズ残</span>
	</div>
</div>

<style>
	.summary {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.5rem;
		width: 100%;
		max-width: 22rem;
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.15rem;
		padding: 0.75rem 0.25rem;
		border-radius: 0.75rem;
		background: #fafafa;
		border: 1px solid #eee;
	}

	.icon {
		font-size: 1.3rem;
	}

	.value {
		font-weight: 800;
		font-size: 1.1rem;
	}

	.cap {
		font-weight: 500;
		font-size: 0.85rem;
		color: #999;
	}

	.label {
		font-size: 0.65rem;
		color: #888;
		text-align: center;
	}
</style>
