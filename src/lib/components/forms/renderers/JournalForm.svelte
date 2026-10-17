<script lang="ts">
	import type { JournalFormData } from '$lib/content/documents';
	import ColumnTable from '../ColumnTable.svelte';
	import { JOURNAL_FORM_COLUMNS } from '../formColumns';

	let {
		data
	}: {
		data: JournalFormData;
	} = $props();
</script>

<ColumnTable columns={JOURNAL_FORM_COLUMNS} rows={data.rows} minWidth={440} />
