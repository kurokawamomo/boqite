<script lang="ts">
	let { kind, onskip }: { kind: string; onskip: () => void } = $props();

	const LABELS: Record<string, string> = {
		choice: '択一問題',
		match: 'マッチング',
		form_fill: '様式穴埋め'
	};
</script>

<div class="unsupported">
	<p class="notice">{LABELS[kind] ?? kind}は準備中</p>
	<button type="button" class="skip" onclick={() => onskip()}>スキップ</button>
</div>

<style>
	.unsupported {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 14px;
		padding: 24px 16px;
		border-radius: 1rem;
		background: #f7f8fa;
		border: 2px dashed #e3e3e1;
		text-align: center;
	}

	.notice {
		margin: 0;
		font-size: 0.9rem;
		font-weight: 700;
		color: #6b6b6b;
	}

	.skip {
		appearance: none;
		border: none;
		border-radius: 1rem;
		padding: 0.75rem 2rem;
		font-size: 0.95rem;
		font-weight: 800;
		color: #ffffff;
		background: #adadab;
		box-shadow: 0 4px 0 #8f8f8f;
		touch-action: manipulation;
	}

	.skip:active {
		transform: translateY(3px);
		box-shadow: 0 0 0 transparent;
	}
</style>
