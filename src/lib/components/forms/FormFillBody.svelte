<script lang="ts">
	import type { CellRef, FormBlank, FormFillTask } from '$lib/content/types';
	import DocumentRenderer from './DocumentRenderer.svelte';
	import FitScroll from './FitScroll.svelte';
	import InputSheet from './InputSheet.svelte';
	import { labelForCell } from './formColumns';
	import { createInitialCalcState } from '$lib/components/numpad/calculator';
	import { setFormFillContext } from './formFillContext';

	let {
		task,
		onComplete
	}: {
		task: FormFillTask;
		onComplete?: (answers: Record<CellRef, string | number>) => void;
	} = $props();

	let answers = $state<Record<CellRef, string | number>>({});
	let activeBlank = $state<FormBlank | null>(null);
	// 電卓の表示は、OK で空欄を閉じても残し、次の空欄で同じ値を使えるようにする（問題が変われば作り直し）
	let calc = $state(createInitialCalcState());

	const blanksByRef = $derived(new Map(task.blanks.map((b) => [b.ref, b] as const)));

	function activate(blank: FormBlank) {
		activeBlank = blank;
	}

	function commit(value: string | number) {
		if (!activeBlank) return;
		const next = { ...answers, [activeBlank.ref]: value };
		answers = next;
		activeBlank = null;
		if (task.blanks.every((b) => next[b.ref] !== undefined)) {
			onComplete?.(next);
		}
	}

	// FormCell/StockLayerCellへはcontext経由で渡す（プロップドリリング解消、レビュー🟢-1）。
	// ゲッターで公開し、blanksByRef/answersの更新に子孫の$derivedが追従できるようにする。
	setFormFillContext({
		get blanksByRef() {
			return blanksByRef;
		},
		get answers() {
			return answers;
		},
		onActivate: activate
	});
</script>

<div class="form-fill-body">
	<FitScroll>
		<DocumentRenderer document={task.document} />
	</FitScroll>
</div>

{#if activeBlank}
	<InputSheet blank={activeBlank} label={labelForCell(task.document, activeBlank.ref) ?? ''} bind:calc onCommit={commit} onCancel={() => (activeBlank = null)} />
{/if}
