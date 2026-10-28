<script lang="ts">
	import type { BillsBookData } from '$lib/content/documents';
	import ColumnTable from '../ColumnTable.svelte';
	import { billsBookColumns } from '../formColumns';

	/**
	 * 受取手形記入帳・支払手形記入帳の共通レンダラ。
	 * counterparty/drawer の見出しだけが帳簿種別で変わる（docs/form-schema.md §4-10）。
	 */
	let {
		data,
		variant
	}: {
		data: BillsBookData;
		variant: 'receivable' | 'payable';
	} = $props();

	const title = $derived(variant === 'receivable' ? '受取手形記入帳' : '支払手形記入帳');
</script>

<ColumnTable columns={billsBookColumns(variant)} rows={data.rows} minWidth={1080}>
	{#snippet caption()}{data.header.title ?? title}{/snippet}
</ColumnTable>
