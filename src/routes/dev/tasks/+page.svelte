<script lang="ts">
	import ChoiceTask from '$lib/components/tasks/ChoiceTask.svelte';
	import MatchTask from '$lib/components/tasks/MatchTask.svelte';
	import NewAccountCard from '$lib/components/cards/NewAccountCard.svelte';

	let choiceLog = $state('未回答');
	let choiceKey = $state(0);

	function onChoiceAnswer(correct: boolean, selectedIndex: number) {
		choiceLog = `${correct ? '正解' : '不正解'}（選択: ${selectedIndex}）`;
	}

	let matchLog = $state('未完了');
	let matchKey = $state(0);
	const matchPairs: Array<[string, string]> = [
		['現金', '資産'],
		['借入金', '負債'],
		['資本金', '純資産'],
		['売上', '収益'],
		['仕入', '費用']
	];

	function onMatchComplete() {
		matchLog = '全ペア消灯・完了';
	}

	let showCard = $state(false);
	const sampleAccount = { name: '売掛金', category: '資産' as const, normalSide: 'debit' as const };
</script>

<div class="page">
	<h1>出題コンポーネント デモ</h1>

	<section>
		<h2>ChoiceTask（5要素分類判定）</h2>
		{#key choiceKey}
			<ChoiceTask
				options={['資産', '負債', '純資産', '収益', '費用']}
				answerIndex={0}
				onAnswer={onChoiceAnswer}
			/>
		{/key}
		<p class="log">{choiceLog}</p>
		<button
			type="button"
			class="reset"
			onclick={() => {
				choiceKey += 1;
				choiceLog = '未回答';
			}}
		>
			リセット
		</button>
	</section>

	<section>
		<h2>MatchTask（科目 × 5要素）</h2>
		{#key matchKey}
			<MatchTask pairs={matchPairs} onComplete={onMatchComplete} />
		{/key}
		<p class="log">{matchLog}</p>
		<button
			type="button"
			class="reset"
			onclick={() => {
				matchKey += 1;
				matchLog = '未完了';
			}}
		>
			リセット
		</button>
	</section>

	<section>
		<h2>新出勘定科目カード</h2>
		<button type="button" class="reset" onclick={() => (showCard = true)}> カードを表示 </button>
	</section>
</div>

{#if showCard}
	<NewAccountCard account={sampleAccount} onClose={() => (showCard = false)} />
{/if}

<style>
	.page {
		box-sizing: border-box;
		min-height: 100dvh;
		padding: 1.5rem 1rem 4rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2.5rem;
		background: #ffffff;
		max-width: 26rem;
		margin: 0 auto;
	}

	h1 {
		font-size: 1.1rem;
		margin: 0;
	}

	section {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}

	h2 {
		font-size: 0.95rem;
		margin: 0;
		align-self: flex-start;
	}

	.log {
		font-size: 0.85rem;
		color: #4b5563;
		margin: 0;
	}

	.reset {
		appearance: none;
		border: none;
		border-radius: 0.75rem;
		padding: 0.5rem 1rem;
		font-size: 0.85rem;
		font-weight: 700;
		background: #eef2ff;
		color: #4338ca;
	}
</style>
