<script lang="ts">
	import { untrack } from 'svelte';
	import type { Account, Question } from '$lib/content/types';
	import { playComboChime, playCorrectChime, playIncorrectBuzz } from '$lib/audio';
	import JournalForm from './JournalForm.svelte';
	import CalcForm from './CalcForm.svelte';
	import FormFillBody from '$lib/components/forms/FormFillBody.svelte';
	import StaticDocumentPreview from '$lib/components/forms/StaticDocumentPreview.svelte';
	import FitScroll from '$lib/components/forms/FitScroll.svelte';
	import ChoiceTask from '$lib/components/tasks/ChoiceTask.svelte';
	import MatchTask from '$lib/components/tasks/MatchTask.svelte';
	import NewAccountCard from '$lib/components/cards/NewAccountCard.svelte';
	import ConfirmDialog from './ConfirmDialog.svelte';
	import UnsupportedTaskNotice from './UnsupportedTaskNotice.svelte';
	import SkipToast from './SkipToast.svelte';
	import LessonProgressBar from './LessonProgressBar.svelte';
	import JudgmentSheet from './JudgmentSheet.svelte';
	import ClearScreen from './ClearScreen.svelte';
	import { type EnteredJournal, checkAnswer } from './journal';
	import { type FormFillAnswers, type WrongBlank, checkFormFillAnswers, findWrongBlanks } from './formFill';
	import type { AttemptRecord, LessonSummary } from './session';
	import StreakFlameScreen from '$lib/components/flair/StreakFlameScreen.svelte';
	import FreezeRefillScreen from '$lib/components/flair/FreezeRefillScreen.svelte';
	import type { StreakClearResult } from './streak';

	const COMBO_MILESTONES = [3, 5, 10];

	let {
		questions,
		accounts = [],
		streakResult = null,
		progressFailed = false,
		submitting = false,
		onComplete,
		onClose,
		onFinish
	}: {
		questions: Question[];
		/** NewAccountCard表示用の勘定科目マスタ（正解データは含まない） */
		accounts?: Account[];
		/** クリア時のストリーク結果。POST /api/streak/clear はページ側の責務（重複POST防止） */
		streakResult?: StreakClearResult | null;
		/** 進捗POST(/api/progress/lesson-complete)がリトライしても失敗したか。ページ側が確定させる */
		progressFailed?: boolean;
		/** 進捗/ストリークPOSTが実行中か。完了前に「地図にもどる」で離脱されるのを防ぐため */
		submitting?: boolean;
		/** 全問消化でクリアした瞬間に一度だけ発火（初回回答の正誤配列はattemptsに含む。仕様書5章） */
		onComplete?: (summary: LessonSummary) => void;
		onClose?: () => void;
		/** クリア画面の「地図にもどる」タップ */
		onFinish?: () => void;
	} = $props();

	const total = $derived(questions.length);
	const attempted = new Set<string>();
	const attempts: AttemptRecord[] = [];
	const previouslyMissed = new Set<string>();
	const shownIntroFor = new Set<string>();
	const startedAt = Date.now();

	let queue = $state<Question[]>(untrack(() => [...questions]));
	let cleared = $state(0);
	let mistakes = $state(0);
	let judgment = $state<'correct' | 'incorrect' | null>(null);
	let wrongBlanks = $state<WrongBlank[]>([]);
	let completion = $state<LessonSummary | null>(null);
	let elapsedSeconds = $state<number | null>(null);
	/** クリア後に出す演出画面の進行。clear → flame → freeze → 地図へ */
	let afterClear = $state<'clear' | 'flame' | 'freeze'>('clear');
	let correctStreak = $state(0);
	let newAccountQueue = $state<Account[]>([]);
	let skipToastVisible = $state(false);
	let skipToastKey = $state(0);
	let skipToastTimer: ReturnType<typeof setTimeout> | undefined;
	let comboToastVisible = $state(false);
	let comboToastKey = $state(0);
	let comboToastMessage = $state('');
	let comboToastTimer: ReturnType<typeof setTimeout> | undefined;
	let showExitConfirm = $state(false);
	/**
	 * `{#key}` 用の試行カウンタ。
	 *
	 * 最後の1問を不正解にすると、advanceQueue が同じ問題(同一id)をqueueの先頭に
	 * 積み直すため current.id が変化しない。`{#key current.id}` だけだと
	 * ChoiceTask/JournalForm 等が再マウントされず、内部state（選択済みindex等）が
	 * 残留してタップ操作が無視され、JudgmentSheet が二度と出ずに詰む。
	 * id に加えて毎試行インクリメントするこのカウンタを key へ含め、
	 * 同一問題の再挑戦でも必ず子コンポーネントを作り直す。
	 */
	let attemptKey = $state(0);

	const current = $derived<Question | null>(queue[0] ?? null);
	const accountsByName = $derived(new Map(accounts.map((a) => [a.name, a] as const)));

	// 新出勘定科目カードは各問題につき初出時1回だけ、順番にキューへ積む
	$effect(() => {
		if (!current || shownIntroFor.has(current.id)) return;
		shownIntroFor.add(current.id);
		const names = current.newAccounts ?? [];
		if (names.length === 0) return;
		const accs = names.map((n) => accountsByName.get(n)).filter((a): a is Account => a !== undefined);
		if (accs.length > 0) newAccountQueue = accs;
	});

	/** ClearScreen 以降の演出を順に進める。該当しない画面は飛ばす */
	function advanceAfterClear() {
		if (afterClear === 'clear' && streakResult?.streakAdvanced) {
			afterClear = 'flame';
			return;
		}
		if (afterClear !== 'freeze' && streakResult?.freezeRefilled) {
			afterClear = 'freeze';
			return;
		}
		onFinish?.();
	}

	function closeNewAccountCard() {
		newAccountQueue = newAccountQueue.slice(1);
	}

	/** レッスン途中の×タップ。即終了せず確認ダイアログを挟む（進捗は保存されない旨を明示） */
	function requestExit() {
		showExitConfirm = true;
	}

	function confirmExit() {
		showExitConfirm = false;
		onClose?.();
	}

	function cancelExit() {
		showExitConfirm = false;
	}

	function showComboToast() {
		if (!COMBO_MILESTONES.includes(correctStreak)) return;
		comboToastMessage = `🔥 ${correctStreak}問連続正解！`;
		comboToastVisible = true;
		comboToastKey += 1;
		clearTimeout(comboToastTimer);
		comboToastTimer = setTimeout(() => {
			comboToastVisible = false;
		}, 1600);
	}

	function recordAndJudge(correct: boolean) {
		if (!current) return;
		if (!attempted.has(current.id)) {
			attempted.add(current.id);
			attempts.push({ questionId: current.id, correct, firstTry: true });
		}
		if (correct) {
			correctStreak += 1;
			showComboToast();
		} else {
			mistakes += 1;
			previouslyMissed.add(current.id);
			correctStreak = 0;
		}
		judgment = correct ? 'correct' : 'incorrect';
		if (!correct) playIncorrectBuzz();
		else if (COMBO_MILESTONES.includes(correctStreak)) playComboChime(correctStreak);
		else playCorrectChime();
	}

	function handleJournalAnswer(entry: EnteredJournal) {
		if (!current || current.task.kind !== 'journal') return;
		recordAndJudge(checkAnswer(entry, current.task));
	}

	function handleCalcAnswer(value: number) {
		if (!current || current.task.kind !== 'calc') return;
		recordAndJudge(value === current.task.answer);
	}

	function handleFormFillAnswer(answers: FormFillAnswers) {
		if (!current || current.task.kind !== 'form_fill') return;
		const { blanks, document } = current.task;
		const correct = checkFormFillAnswers(answers, blanks);
		wrongBlanks = correct ? [] : findWrongBlanks(answers, blanks, document);
		recordAndJudge(correct);
	}

	function handleChoiceAnswer(correct: boolean) {
		if (!current || current.task.kind !== 'choice') return;
		recordAndJudge(correct);
	}

	/** MatchTaskは全ペアが揃って初めて onComplete が発火する（誤答は内部でシェイクするだけで確定しない） */
	function handleMatchComplete() {
		if (!current || current.task.kind !== 'match') return;
		recordAndJudge(true);
	}

	function advanceQueue(wasCorrect: boolean) {
		if (!current) return;
		const rest = queue.slice(1);
		queue = wasCorrect ? rest : [...rest, current];
		if (wasCorrect) cleared += 1;
		if (queue.length === 0) {
			elapsedSeconds = Math.round((Date.now() - startedAt) / 1000);
			// 分母は採点対象の問題数のみ。未対応kindのスキップはattemptsに記録されないため、
			// total（全問題数）を使うと正答率が実態より下振れしてしまう。
			const correctFirstTry = attempts.filter((a) => a.correct).length;
			const gradedCount = attempts.length;
			const result = gradedCount === 0 ? 100 : Math.round((correctFirstTry / gradedCount) * 100);
			const summary: LessonSummary = { attempts: [...attempts], result };
			completion = summary;
			onComplete?.(summary);
		}
	}

	function handleContinue() {
		const wasCorrect = judgment === 'correct';
		judgment = null;
		wrongBlanks = [];
		advanceQueue(wasCorrect);
		attemptKey += 1;
	}

	/** 現状の全taskKindはjournal/calc/form_fill/choice/matchで対応済み。
	 * このハンドラは将来の未対応kind向けの安全弁として残す。 */
	function handleSkip() {
		skipToastVisible = true;
		skipToastKey += 1;
		clearTimeout(skipToastTimer);
		skipToastTimer = setTimeout(() => {
			skipToastVisible = false;
		}, 1400);
		advanceQueue(true);
	}
</script>

{#if current}
	<LessonProgressBar {total} {cleared} onclose={requestExit} />

	<div class="stage">
		{#if (current.newAccounts && current.newAccounts.length > 0) || previouslyMissed.has(current.id)}
			<div class="badges">
				{#if current.newAccounts && current.newAccounts.length > 0}
					<span class="tag tag-new">NEW</span>
				{/if}
				{#if previouslyMissed.has(current.id)}
					<span class="tag tag-mistake">まえに まちがえた もんだい</span>
				{/if}
			</div>
		{/if}

		<p class="stimulus">{current.stimulus.text}</p>

		{#if current.stimulus.document}
			<div class="stimulus-document">
				<FitScroll>
					<StaticDocumentPreview document={current.stimulus.document} />
				</FitScroll>
			</div>
		{/if}

		{#key current.id + ':' + attemptKey}
			{#if current.task.kind === 'journal'}
				<JournalForm task={current.task} onsubmit={handleJournalAnswer} />
			{:else if current.task.kind === 'calc'}
				<CalcForm task={current.task} onsubmit={handleCalcAnswer} />
			{:else if current.task.kind === 'form_fill'}
				<FormFillBody task={current.task} onComplete={handleFormFillAnswer} />
			{:else if current.task.kind === 'choice'}
				<ChoiceTask options={current.task.options} answerIndex={current.task.answerIndex} onAnswer={handleChoiceAnswer} />
			{:else if current.task.kind === 'match'}
				<MatchTask pairs={current.task.pairs} onComplete={handleMatchComplete} />
			{:else}
				<UnsupportedTaskNotice kind={(current.task as { kind: string }).kind} onskip={handleSkip} />
			{/if}
		{/key}
	</div>

	{#if judgment}
		<JudgmentSheet
			result={judgment}
			explanation={judgment === 'incorrect' ? current.explanation : undefined}
			wrongBlanks={judgment === 'incorrect' ? wrongBlanks : undefined}
			oncontinue={handleContinue}
		/>
	{/if}
{:else}
	<ClearScreen
		{total}
		{mistakes}
		accuracy={completion?.result ?? null}
		{elapsedSeconds}
		{progressFailed}
		{submitting}
		oncontinue={advanceAfterClear}
	/>
	{#if afterClear === 'flame' && streakResult}
		<StreakFlameScreen count={streakResult.streakCount} oncontinue={advanceAfterClear} />
	{:else if afterClear === 'freeze' && streakResult}
		<FreezeRefillScreen
			count={streakResult.freezeCount}
			cap={streakResult.freezeCap}
			oncontinue={advanceAfterClear}
		/>
	{/if}
{/if}

{#if newAccountQueue[0]}
	{#key newAccountQueue[0].name}
		<NewAccountCard account={newAccountQueue[0]} onClose={closeNewAccountCard} />
	{/key}
{/if}

{#if skipToastVisible}
	{#key skipToastKey}
		<SkipToast message="スキップしました" />
	{/key}
{/if}

{#if comboToastVisible}
	{#key comboToastKey}
		<SkipToast message={comboToastMessage} />
	{/key}
{/if}

{#if showExitConfirm}
	<ConfirmDialog
		title="レッスンをやめますか？"
		message="ここまでの進捗は保存されません。"
		confirmLabel="やめる"
		cancelLabel="つづける"
		onconfirm={confirmExit}
		oncancel={cancelExit}
	/>
{/if}

<style>
	.stage {
		box-sizing: border-box;
		padding: 8px 16px 140px;
		max-width: 480px;
		margin: 0 auto;
	}

	.badges {
		display: flex;
		gap: 6px;
		margin: 8px 0 0;
	}

	.tag {
		display: inline-block;
		padding: 3px 10px;
		border-radius: 999px;
		font-size: 0.7rem;
		font-weight: 800;
		letter-spacing: 0.03em;
	}

	.tag-new {
		background: #f0e2ff;
		color: #8e2de2;
	}

	.tag-mistake {
		background: #ffe9d6;
		color: #b8590a;
	}

	.stimulus {
		font-size: 1.05rem;
		font-weight: 700;
		color: #3b3b3a;
		line-height: 1.6;
		margin: 8px 0 20px;
	}

	.stimulus-document {
		margin: -8px 0 20px;
	}
</style>
