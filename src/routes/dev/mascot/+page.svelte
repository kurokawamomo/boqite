<script lang="ts">
	import Boquito, { type BoquitoMood } from '$lib/components/mascot/Boquito.svelte';

	const moods: BoquitoMood[] = ['idle', 'happy', 'sad', 'cheer'];
</script>

<svelte:head>
	<title>Boqite - Boquito dev</title>
</svelte:head>

<div class="page">
	<div class="grid">
		{#each moods as mood (mood)}
			<figure class="card" data-mood-card={mood}>
				<Boquito {mood} size={150} />
				<figcaption>{mood}</figcaption>
			</figure>
		{/each}
	</div>
</div>

<style>
	.page {
		padding: 16px;
		background: #fff9e6;
		min-height: 100vh;
		box-sizing: border-box;
	}

	.grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}

	.card {
		margin: 0;
		padding: 12px 4px 8px;
		display: flex;
		flex-direction: column;
		align-items: center;
		background: #fff;
		border-radius: 16px;
		border: 1px solid #eadfb8;
	}

	figcaption {
		margin-top: 4px;
		font-size: 13px;
		font-weight: 700;
		color: #6b5a3a;
	}
</style>
