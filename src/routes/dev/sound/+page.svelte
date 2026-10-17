<script lang="ts">
	import { onMount } from 'svelte';
	import {
		SOUNDS,
		installAudioUnlock,
		isAudioUnlocked,
		measureSound,
		playSound,
		type SoundMeasure,
		type SoundName
	} from '$lib/audio';

	const names = Object.keys(SOUNDS) as SoundName[];
	const comboLevels = [3, 5, 10, 20];

	let unlocked = $state(false);
	let comboLevel = $state(5);
	let measures = $state<Partial<Record<SoundName, SoundMeasure>>>({});
	let playingAll = $state(false);

	function refresh() {
		unlocked = isAudioUnlocked();
	}

	function play(name: SoundName) {
		playSound(name, comboLevel);
		// 最初のタップでは resume が非同期なので、少し待ってから状態を見る
		setTimeout(refresh, 150);
	}

	async function playAll() {
		playingAll = true;
		for (const name of names) {
			playSound(name, comboLevel);
			await new Promise((r) => setTimeout(r, SOUNDS[name].duration * 1000 + 250));
		}
		playingAll = false;
	}

	onMount(() => {
		const uninstall = installAudioUnlock();
		const timer = setInterval(refresh, 500);
		void (async () => {
			for (const name of names) {
				const m = await measureSound(name, comboLevel);
				measures = { ...measures, [name]: m };
			}
		})();
		return () => {
			uninstall();
			clearInterval(timer);
		};
	});
</script>

<svelte:head>
	<title>Boqite - 効果音 dev</title>
</svelte:head>

<div class="page">
	<p class="state" class:on={unlocked}>{unlocked ? '音 ON' : 'どこかをタップ'}</p>

	<div class="grid">
		{#each names as name (name)}
			<button type="button" onclick={() => play(name)}>
				<span class="name">{SOUNDS[name].label}</span>
				<span class="sec">{SOUNDS[name].duration}s</span>
			</button>
		{/each}
	</div>

	<div class="levels">
		<span>連続正解</span>
		{#each comboLevels as level (level)}
			<button type="button" class:active={comboLevel === level} onclick={() => (comboLevel = level)}>{level}問</button>
		{/each}
	</div>

	<button type="button" class="all" disabled={playingAll} onclick={playAll}>全部を順に鳴らす</button>

	<table>
		<thead>
			<tr><th>音</th><th>音量 dBFS</th><th>ピーク</th></tr>
		</thead>
		<tbody>
			{#each names as name (name)}
				<tr>
					<td>{SOUNDS[name].label}</td>
					<td>{measures[name] ? measures[name].loudnessDb.toFixed(1) : '…'}</td>
					<td>{measures[name] ? measures[name].peakDb.toFixed(1) : '…'}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.page {
		box-sizing: border-box;
		min-height: 100dvh;
		padding: 16px 16px 40px;
		background: #fff9e6;
		color: #4a3320;
	}

	.state {
		margin: 0 0 12px;
		font-weight: 800;
		color: #a08a62;
	}

	.state.on {
		color: #3d8b3d;
	}

	.grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}

	button {
		appearance: none;
		border: 2px solid #4a3320;
		border-radius: 14px;
		background: #fff;
		color: inherit;
		font: inherit;
		font-weight: 700;
		padding: 14px 8px;
		touch-action: manipulation;
		cursor: pointer;
	}

	.grid button {
		display: flex;
		flex-direction: column;
		gap: 4px;
		align-items: center;
		box-shadow: 0 3px 0 #4a3320;
	}

	.grid button:active {
		transform: translateY(2px);
		box-shadow: 0 1px 0 #4a3320;
	}

	.sec {
		font-size: 12px;
		font-weight: 500;
		color: #8a7458;
	}

	.levels {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 16px 0 12px;
		font-weight: 700;
	}

	.levels button {
		padding: 6px 10px;
		border-width: 1.5px;
	}

	.levels button.active {
		background: #f7c52b;
	}

	.all {
		width: 100%;
		background: #f7c52b;
	}

	.all:disabled {
		opacity: 0.5;
	}

	table {
		width: 100%;
		margin-top: 20px;
		border-collapse: collapse;
		font-size: 13px;
	}

	th,
	td {
		border-bottom: 1px solid #eadfb8;
		padding: 6px 4px;
		text-align: left;
	}

	td:nth-child(n + 2),
	th:nth-child(n + 2) {
		text-align: right;
	}
</style>
