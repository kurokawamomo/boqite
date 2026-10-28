<script lang="ts">
	let { href = '/', label = 'マップ' }: { href?: string; label?: string } = $props();
</script>

<a class="back" {href}>
	<span class="arrow" aria-hidden="true">‹</span>
	{label}
</a>

<style>
	.back {
		align-self: flex-start;
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		min-width: 44px;
		min-height: 44px;
		padding: 0 0.75rem 0 0.25rem;
		font-size: 0.95rem;
		font-weight: 700;
		color: #3b3b3a;
		text-decoration: none;
	}

	.arrow {
		font-size: 1.8rem;
		line-height: 1;
	}
</style>
