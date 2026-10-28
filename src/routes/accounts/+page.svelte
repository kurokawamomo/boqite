<script lang="ts">
	import accountsData from '../../../content/accounts.json';
	import BackLink from '$lib/components/nav/BackLink.svelte';
	import type { AccountRole, NormalSide } from '$lib/content/types';

	type AccountEntry = {
		name: string;
		category: AccountRole;
		normalSide: NormalSide;
		chapter: number;
		description: string;
	};

	const accounts = accountsData as AccountEntry[];

	const categoryOrder: AccountRole[] = ['資産', '負債', '純資産', '収益', '費用', '仮勘定', '集合勘定'];

	const normalSideLabel: Record<NormalSide, string> = {
		debit: '借方',
		credit: '貸方',
		either: '両方'
	};

	const groups = categoryOrder
		.map((category) => ({
			category,
			accounts: accounts
				.filter((account) => account.category === category)
				.sort((a, b) => a.chapter - b.chapter || a.name.localeCompare(b.name, 'ja'))
		}))
		.filter((group) => group.accounts.length > 0);
</script>

<svelte:head>
	<title>勘定科目一覧 - Boqite</title>
</svelte:head>

<div class="page">
	<BackLink />
	<h1>勘定科目一覧表</h1>
	<p class="count">全{accounts.length}科目</p>

	{#each groups as group (group.category)}
		<section>
			<h2 class="category" data-category={group.category}>{group.category}</h2>
			<ul class="list">
				{#each group.accounts as account (account.name)}
					<li class="account">
						<div class="head">
							<span class="name">{account.name}</span>
							<span class="side" data-side={account.normalSide}>
								{normalSideLabel[account.normalSide]}
							</span>
						</div>
						<p class="description">{account.description}</p>
					</li>
				{/each}
			</ul>
		</section>
	{/each}
</div>

<style>
	.page {
		box-sizing: border-box;
		min-height: 100dvh;
		padding: 1.25rem 1rem 3rem;
		max-width: 26rem;
		margin: 0 auto;
		background: #ffffff;
	}

	h1 {
		font-size: 1.2rem;
		margin: 0 0 0.25rem;
	}

	.count {
		font-size: 0.85rem;
		color: #6b7280;
		margin: 0 0 1.5rem;
	}

	section {
		margin-bottom: 1.5rem;
	}

	.category {
		font-size: 0.95rem;
		font-weight: 800;
		margin: 0 0 0.6rem;
		padding: 0.4rem 0.75rem;
		border-radius: 0.6rem;
		color: #ffffff;
		background: #9ca3af;
	}

	.category[data-category='資産'] {
		background: #1fa9ee;
	}
	.category[data-category='負債'] {
		background: #f24a4a;
	}
	.category[data-category='純資産'] {
		background: #8e2de2;
	}
	.category[data-category='収益'] {
		background: #55c50d;
	}
	.category[data-category='費用'] {
		background: #fb9407;
	}
	.category[data-category='仮勘定'] {
		background: #6b7280;
	}
	.category[data-category='集合勘定'] {
		background: #374151;
	}

	.list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.account {
		box-sizing: border-box;
		width: 100%;
		padding: 0.7rem 0.85rem;
		border-radius: 0.75rem;
		border: 1px solid #e5e7eb;
		background: #f9fafb;
	}

	.head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.name {
		font-size: 1rem;
		font-weight: 700;
		color: #1f2937;
	}

	.side {
		flex: none;
		font-size: 0.75rem;
		font-weight: 700;
		padding: 0.15rem 0.55rem;
		border-radius: 999px;
		background: #eef2ff;
		color: #4338ca;
	}

	.side[data-side='credit'] {
		background: #ffe8e8;
		color: #b02a2a;
	}

	.side[data-side='either'] {
		background: #fff4d6;
		color: #92600a;
	}

	.description {
		margin: 0.3rem 0 0;
		font-size: 0.8rem;
		line-height: 1.5;
		color: #4b5563;
	}
</style>
