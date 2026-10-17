<script lang="ts">
	import type { TransferRequestData } from '$lib/content/documents';
	import ColumnTable from '../ColumnTable.svelte';
	import { TRANSFER_REQUEST_COLUMNS } from '../formColumns';

	let {
		data
	}: {
		data: TransferRequestData;
	} = $props();
</script>

<div class="transfer-request">
	<div class="request-title">{data.header.title ?? '振込依頼書'}</div>

	<div class="request-parties">
		<span class="addressee">{data.addressee}</span>
		<span class="requester">{data.requester}</span>
	</div>

	<ColumnTable columns={TRANSFER_REQUEST_COLUMNS} rows={data.rows} class="request-table" />

	<div class="request-total">合計: {data.total}</div>

	<div class="request-account">{data.account}</div>
</div>

<style>
	.transfer-request {
		display: inline-block;
		border: 2px solid #333;
		border-radius: 6px;
		padding: 14px;
		box-sizing: border-box;
		max-width: 100%;
		min-width: 300px;
		background: #fff;
	}

	.request-title {
		text-align: center;
		font-weight: 800;
		font-size: 17px;
		letter-spacing: 0.3em;
		border-bottom: 2px solid #333;
		padding-bottom: 6px;
		margin-bottom: 10px;
	}

	.request-parties {
		display: flex;
		justify-content: space-between;
		font-size: 13px;
		margin-bottom: 8px;
	}

	.addressee {
		font-weight: 700;
	}

	.transfer-request :global(.request-table) {
		width: 100%;
		margin-bottom: 8px;
	}

	.request-total {
		text-align: right;
		font-weight: 800;
		font-size: 14px;
	}

	.request-account {
		margin-top: 10px;
		padding-top: 8px;
		border-top: 1px dashed #ccc;
		font-size: 12px;
		color: #666;
	}
</style>
