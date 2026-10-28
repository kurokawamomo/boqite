<script lang="ts">
	import { playTap } from '$lib/audio';

	let {
		label,
		color,
		edge,
		disabled = false,
		onclick
	}: {
		label: string;
		/** ボタン文字色。背景は白固定、底の厚みは edge */
		color: string;
		edge: string;
		disabled?: boolean;
		onclick?: () => void;
	} = $props();
</script>

<button
	type="button"
	class="cta"
	{disabled}
	style:--cta-color={color}
	style:--cta-edge={edge}
	onclick={() => {
		playTap();
		onclick?.();
	}}
>
	{label}
</button>

<style>
	.cta {
		appearance: none;
		border: none;
		min-width: 14rem;
		padding: 1rem 2rem;
		border-radius: 1.1rem;
		font: inherit;
		font-size: 1.1rem;
		font-weight: 800;
		letter-spacing: 0.04em;
		color: var(--cta-color);
		background: #ffffff;
		box-shadow: 0 6px 0 var(--cta-edge);
		touch-action: manipulation;
		cursor: pointer;
	}

	.cta:active {
		transform: translateY(4px);
		box-shadow: 0 2px 0 var(--cta-edge);
	}

	.cta:disabled {
		opacity: 0.6;
	}

	.cta:focus-visible {
		outline: 3px solid #ffffff;
		outline-offset: 4px;
	}
</style>
