<script lang="ts">
	import { untrack } from 'svelte';
	import { buildCalendarGrid, shiftMonth } from '$lib/streak';
	import type { StreakLogEntry } from '$lib/streak/types';

	type Props = {
		logs: StreakLogEntry[];
		today: string;
		/** 初期表示する年月（省略時は today の月） */
		initialYear?: number;
		initialMonth?: number;
	};

	let { logs, today, initialYear, initialMonth }: Props = $props();

	// 月送り状態はマウント時の初期値としてのみ props を使う（以後の today/initial* 変化には追従しない）
	let year = $state(
		untrack(() => {
			const [todayYear] = today.split('-').map(Number);
			return initialYear ?? todayYear;
		})
	);
	let month = $state(
		untrack(() => {
			const [, todayMonth] = today.split('-').map(Number);
			return initialMonth ?? todayMonth;
		})
	);

	const cells = $derived(buildCalendarGrid(year, month, logs, today));
	const weekdayLabels = ['日', '月', '火', '水', '木', '金', '土'];

	function goPrevMonth() {
		[year, month] = shiftMonth(year, month, -1);
	}

	function goNextMonth() {
		[year, month] = shiftMonth(year, month, 1);
	}
</script>

<div class="calendar">
	<div class="nav">
		<button class="nav-button" onclick={goPrevMonth} aria-label="前の月">‹</button>
		<span class="month-label">{year}年{month}月</span>
		<button class="nav-button" onclick={goNextMonth} aria-label="次の月">›</button>
	</div>

	<div class="weekday-row">
		{#each weekdayLabels as label (label)}
			<span class="weekday">{label}</span>
		{/each}
	</div>

	<div class="grid">
		{#each cells as cell, i (i)}
			<div class="cell" class:is-today={cell.isToday}>
				{#if cell.date}
					<span class="day-number">{Number(cell.date.slice(-2))}</span>
					{#if cell.status === 'cleared'}
						<span class="mark" aria-label="クリア済み">🔥</span>
					{:else if cell.status === 'frozen'}
						<span class="mark" aria-label="フリーズで維持">❄️</span>
					{/if}
				{/if}
			</div>
		{/each}
	</div>
</div>

<style>
	.calendar {
		width: 100%;
		max-width: 22rem;
		box-sizing: border-box;
	}

	.nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.5rem;
	}

	.month-label {
		font-weight: 700;
		font-size: 1rem;
	}

	.nav-button {
		width: 2rem;
		height: 2rem;
		border-radius: 999px;
		border: 1px solid #ddd;
		background: #fafafa;
		font-size: 1.1rem;
		line-height: 1;
	}

	.weekday-row,
	.grid {
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
	}

	.weekday {
		text-align: center;
		font-size: 0.7rem;
		color: #999;
		padding-bottom: 0.25rem;
	}

	.cell {
		aspect-ratio: 1 / 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		border-radius: 0.5rem;
		position: relative;
	}

	.cell.is-today {
		outline: 2px solid #55c50d;
		outline-offset: -2px;
	}

	.day-number {
		font-size: 0.65rem;
		color: #999;
		position: absolute;
		top: 2px;
		left: 4px;
	}

	.mark {
		font-size: 1.1rem;
	}
</style>
