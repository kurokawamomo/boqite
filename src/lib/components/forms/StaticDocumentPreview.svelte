<script lang="ts">
	import type { Document } from '$lib/content/documents';
	import DocumentRenderer from './DocumentRenderer.svelte';
	import { setFormFillContext } from './formFillContext';

	let { document }: { document: Document } = $props();

	// 空欄・タップ処理なしの静的表示用 no-op context（レンダラのプレビュー・解説表示に使う）
	setFormFillContext({
		blanksByRef: new Map(),
		answers: {},
		onActivate: () => {}
	});
</script>

<DocumentRenderer {document} />
