<script lang="ts">
	/**
	 * 新出勘定科目カード（仕様書 2章 決定#7）。
	 * 新出勘定科目の全画面カード演出。タップで閉じる。
	 */
	import { onMount } from 'svelte';
	import { playNewAccountCard } from '$lib/audio';
	import type { AccountRole, NormalSide } from '$lib/content/types';

	let {
		account,
		onClose
	}: {
		account: { name: string; category: AccountRole; normalSide: NormalSide };
		onClose?: () => void;
	} = $props();

	onMount(playNewAccountCard);

	const normalSideLabel: Record<NormalSide, string> = {
		debit: '借方',
		credit: '貸方',
		either: '借方・貸方どちらも'
	};
</script>

<div
	class="backdrop"
	role="button"
	tabindex="0"
	aria-label="閉じる"
	onclick={() => onClose?.()}
	onkeydown={(event) => (event.key === 'Enter' || event.key === ' ') && onClose?.()}
>
	<div
		class="card"
		role="dialog"
		tabindex="-1"
		aria-label="新出勘定科目"
		onclick={(event) => event.stopPropagation()}
		onkeydown={(event) => event.stopPropagation()}
	>
		<h2 class="name">{account.name}</h2>
		<div class="badges">
			<span class="badge category">{account.category}</span>
			<span class="badge side">ホームポジション: {normalSideLabel[account.normalSide]}</span>
		</div>
		<button type="button" class="ok" onclick={() => onClose?.()}>おぼえた</button>
	</div>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 100;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1.5rem;
		background: #58118bdd;
		animation: fade-in 0.2s ease;
	}

	.card {
		box-sizing: border-box;
		width: 100%;
		max-width: 22rem;
		padding: 2.5rem 2rem;
		border-radius: 1.5rem;
		background: linear-gradient(160deg, #8e2de2, #4a00b0);
		color: #ffffff;
		text-align: center;
		box-shadow: 0 20px 40px #00000055;
		animation: card-in 0.55s cubic-bezier(0.2, 0.9, 0.3, 1.2);
	}

	.name {
		margin: 0 0 1.5rem;
		font-size: 2rem;
		font-weight: 800;
	}

	.badges {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		margin-bottom: 1.5rem;
	}

	.badge {
		padding: 0.6rem 1rem;
		border-radius: 0.75rem;
		background: #ffffff26;
		font-size: 0.95rem;
		font-weight: 700;
	}

	.ok {
		appearance: none;
		border: none;
		margin-top: 0.5rem;
		padding: 0.8rem 2rem;
		border-radius: 1rem;
		font: inherit;
		font-size: 1rem;
		font-weight: 800;
		color: #58118b;
		background: #ffffff;
		box-shadow: 0 5px 0 #c9b0ea;
		touch-action: manipulation;
	}

	.ok:active {
		transform: translateY(3px);
		box-shadow: 0 2px 0 #c9b0ea;
	}

	@keyframes fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes card-in {
		0% {
			opacity: 0;
			transform: perspective(800px) rotateY(-100deg) scale(0.6);
		}
		60% {
			opacity: 1;
			transform: perspective(800px) rotateY(15deg) scale(1.03);
		}
		100% {
			opacity: 1;
			transform: perspective(800px) rotateY(0deg) scale(1);
		}
	}
</style>
