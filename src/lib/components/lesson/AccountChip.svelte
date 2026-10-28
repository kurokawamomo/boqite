<script lang="ts">
	let { label, disabled = false, onclick }: { label: string; disabled?: boolean; onclick: () => void } = $props();
</script>

<button type="button" class="chip" {disabled} onclick={() => onclick()}>
	{label}
</button>

<style>
	.chip {
		appearance: none;
		border: 2px solid #e3e3e1;
		border-radius: 999px;
		padding: 0.55rem 1rem;
		font-size: 0.95rem;
		font-weight: 700;
		background: #ffffff;
		color: #3b3b3a;
		box-shadow: 0 3px 0 #e3e3e1;
		touch-action: manipulation;
		user-select: none;
		transition:
			transform 0.06s ease,
			box-shadow 0.06s ease;
	}

	.chip:active {
		transform: translateY(3px);
		box-shadow: 0 0 0 transparent;
	}

	.chip:disabled {
		opacity: 0.4;
	}
</style>
