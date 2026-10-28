<script lang="ts">
	import type { StreakSummary } from '$lib/server/streak/service';

	let { streak }: { streak: StreakSummary } = $props();

	const flameColor = $derived(streak.clearedToday ? '#fb9407' : '#b0b0b0');
</script>

<header class="header">
	<a class="streak-pill" class:inactive={!streak.clearedToday} href="/streak" aria-label="ストリークカレンダーを見る">
		<svg viewBox="0 0 24 24" width="22" height="22" fill="none">
			<path
				d="M12 2c1 3-2 4.5-2 7a3 3 0 0 0 6 0c0-1-.5-2-.5-2 2 1 3.5 3.5 3.5 6a7 7 0 1 1-14 0c0-4.5 3-7 4-8 1-1 2-2 3-3Z"
				fill={flameColor}
			/>
		</svg>
		<span class="count" style:color={flameColor}>{streak.streakCount}</span>
	</a>

	<div class="freeze-pill">
		<svg viewBox="0 0 24 24" width="18" height="18" fill="none">
			<g stroke="#4fb3e8" stroke-width="2" stroke-linecap="round">
				<path d="M12 2v20" />
				<path d="M4 7l16 10" />
				<path d="M20 7L4 17" />
				<path d="M9 3.5l3 2.2 3-2.2" />
				<path d="M9 20.5l3-2.2 3 2.2" />
				<path d="M2.7 9l3.6.6.6 3.6" />
				<path d="M21.3 15l-3.6-.6-.6-3.6" />
				<path d="M21.3 9l-3.6.6-.6 3.6" />
				<path d="M2.7 15l3.6-.6.6-3.6" />
			</g>
		</svg>
		<span class="freeze-count">{streak.freezeCount}/{streak.freezeCap}</span>
	</div>

	<a class="accounts-link" href="/accounts" aria-label="勘定科目一覧を見る">
		<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
			<path
				d="M5 4.5A1.5 1.5 0 0 1 6.5 3H17a2 2 0 0 1 2 2v14.5a.5.5 0 0 1-.79.41L15 17.5l-3.21 1.91a.5.5 0 0 1-.58 0L8 17.5l-3.21 1.91A.5.5 0 0 1 4 19V6a1.5 1.5 0 0 1 1-1.41V4.5Z"
				stroke="#999999"
				stroke-width="1.6"
				stroke-linejoin="round"
			/>
			<path d="M7.5 8h9M7.5 11h9M7.5 14h5" stroke="#999999" stroke-width="1.6" stroke-linecap="round" />
		</svg>
	</a>
</header>

<style>
	.header {
		position: sticky;
		top: 0;
		z-index: 10;
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 10px;
		padding: 10px 16px;
		background: rgba(255, 255, 255, 0.9);
		backdrop-filter: blur(6px);
		border-bottom: 1px solid #eeeeee;
	}

	.accounts-link {
		position: absolute;
		right: 16px;
		top: 50%;
		transform: translateY(-50%);
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 999px;
		opacity: 0.7;
		transition:
			opacity 0.1s ease,
			transform 0.1s ease;
	}

	.accounts-link:active {
		opacity: 1;
		transform: translateY(-50%) scale(0.92);
	}

	.streak-pill {
		display: flex;
		align-items: center;
		gap: 6px;
		background: #fff7ea;
		border: 2px solid #ffd28f;
		border-radius: 999px;
		padding: 4px 14px;
		text-decoration: none;
		cursor: pointer;
		transition: transform 0.1s ease;
	}

	.streak-pill:active {
		transform: scale(0.96);
	}

	.streak-pill.inactive {
		background: #f2f2f2;
		border-color: #e0e0e0;
	}

	.count {
		font-weight: 800;
		font-size: 16px;
	}

	.freeze-pill {
		display: flex;
		align-items: center;
		gap: 5px;
		background: #eaf7ff;
		border: 2px solid #bfe6fb;
		border-radius: 999px;
		padding: 4px 12px;
	}

	.freeze-count {
		font-weight: 800;
		font-size: 14px;
		color: #2a9fd8;
	}
</style>
