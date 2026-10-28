<script lang="ts">
	import type { SlipData } from '$lib/content/documents';
	import ColumnTable from '../ColumnTable.svelte';
	import { slipColumns } from '../formColumns';

	/** 入金伝票・出金伝票・振替伝票（三伝票制。docs/form-schema.md §4-16） */
	let {
		data
	}: {
		data: SlipData;
	} = $props();

	const defaultTitle = $derived(
		data.slipType === 'receipt' ? '入金伝票' : data.slipType === 'payment' ? '出金伝票' : '振替伝票'
	);
</script>

<div class="slip">
	<div class="slip-head">
		<span class="slip-title">{data.header.title ?? defaultTitle}</span>
		{#if data.slipNo}<span class="slip-no">No. {data.slipNo}</span>{/if}
		{#if data.header.period}<span class="slip-date">{data.header.period}</span>{/if}
	</div>

	<ColumnTable
		columns={slipColumns(data.slipType)}
		rows={data.rows}
		minWidth={data.slipType === 'transfer' ? undefined : 220}
	/>
</div>

<style>
	.slip {
		display: inline-block;
		border: 2px solid #333;
		border-radius: 6px;
		padding: 10px;
		min-width: 260px;
	}

	.slip-head {
		display: flex;
		align-items: baseline;
		gap: 10px;
		margin-bottom: 8px;
		border-bottom: 2px solid #333;
		padding-bottom: 6px;
	}

	.slip-title {
		font-weight: 800;
		font-size: 15px;
	}

	.slip-no,
	.slip-date {
		font-size: 12px;
		color: #666;
	}
</style>
