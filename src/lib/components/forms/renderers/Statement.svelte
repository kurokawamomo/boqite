<script lang="ts">
	import type { StatementData } from '$lib/content/documents';
	import ColumnTable from '../ColumnTable.svelte';
	import { statementColumns } from '../formColumns';

	/**
	 * 損益計算書（P/L）・貸借対照表（B/S）勘定式（docs/form-schema.md §4-15）。
	 * B/S の控除内書き（売掛金の下の貸倒引当金、建物の下の減価償却累計額）は
	 * deduction（科目・額）+ netAmount を別セルとして描画する（総額を消してしまわない）。
	 */
	let {
		data,
		variant
	}: {
		data: StatementData;
		variant: 'pl' | 'bs';
	} = $props();

	const defaultTitle = $derived(variant === 'pl' ? '損益計算書' : '貸借対照表');
	const debitLabel = $derived(variant === 'pl' ? '費用' : '資産');
	const creditLabel = $derived(variant === 'pl' ? '収益' : '負債および純資産');
</script>

<div class="statement">
	<div class="statement-title">{data.header.title ?? defaultTitle}</div>
	{#if data.header.period}<div class="statement-period">{data.header.period}</div>{/if}
	<div class="statement-meta">
		<span>{data.header.company ?? ''}</span>
		<span>{data.header.unit ?? ''}</span>
	</div>

	<div class="statement-sides">
		<ColumnTable columns={statementColumns(debitLabel)} rows={data.debit} minWidth={320} />
		<ColumnTable columns={statementColumns(creditLabel)} rows={data.credit} minWidth={320} />
	</div>
</div>

<style>
	.statement {
		display: inline-block;
	}

	.statement-title {
		text-align: center;
		font-weight: 800;
		font-size: 17px;
		letter-spacing: 0.1em;
	}

	.statement-period {
		text-align: center;
		font-size: 12px;
		color: #666;
		margin-bottom: 4px;
	}

	.statement-meta {
		display: flex;
		justify-content: space-between;
		font-size: 12px;
		color: #666;
		margin-bottom: 8px;
	}

	.statement-sides {
		display: flex;
		gap: 12px;
	}
</style>
