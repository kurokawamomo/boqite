<script lang="ts">
	let { title, color, y }: { title: string; color: string; y: number } = $props();
</script>

<div class="banner" style:top="{y}px" style:background={color}>
	<span class="text">{title}</span>
</div>

<style>
	.banner {
		position: absolute;
		left: 50%;
		transform: translateX(-50%);
		width: calc(100% - 32px);
		max-width: 360px;
		border-radius: 14px;
		padding: 12px 16px;
		box-shadow: 0 4px 0 rgba(0, 0, 0, 0.12);
	}

	.text {
		display: block;
		color: #ffffff;
		font-weight: 800;
		font-size: 14px;
		text-align: center;
		letter-spacing: 0.02em;
	}
</style>
