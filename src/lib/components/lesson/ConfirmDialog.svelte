<script lang="ts">
	let {
		title,
		message,
		confirmLabel = 'やめる',
		cancelLabel = 'つづける',
		onconfirm,
		oncancel
	}: {
		title: string;
		message?: string;
		confirmLabel?: string;
		cancelLabel?: string;
		onconfirm: () => void;
		oncancel: () => void;
	} = $props();
</script>

<div class="backdrop" role="presentation" onclick={() => oncancel()}></div>
<div class="dialog" role="alertdialog" aria-modal="true" aria-label={title}>
	<p class="title">{title}</p>
	{#if message}<p class="message">{message}</p>{/if}
	<div class="actions">
		<button type="button" class="cancel" onclick={() => oncancel()}>{cancelLabel}</button>
		<button type="button" class="confirm" onclick={() => onconfirm()}>{confirmLabel}</button>
	</div>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 110;
		background: rgba(0, 0, 0, 0.35);
		animation: fade-in 0.15s ease;
	}

	.dialog {
		position: fixed;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		z-index: 111;
		box-sizing: border-box;
		width: calc(100% - 48px);
		max-width: 20rem;
		padding: 1.5rem 1.25rem 1.25rem;
		border-radius: 1.25rem;
		background: #ffffff;
		box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
		text-align: center;
		animation: pop-in 0.18s ease;
	}

	.title {
		margin: 0 0 6px;
		font-size: 1.05rem;
		font-weight: 800;
		color: #3b3b3a;
	}

	.message {
		margin: 0 0 18px;
		font-size: 0.85rem;
		color: #8a8a8a;
		line-height: 1.5;
	}

	.actions {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.cancel {
		appearance: none;
		border: none;
		border-radius: 1rem;
		padding: 0.85rem;
		font-size: 0.95rem;
		font-weight: 800;
		color: #ffffff;
		background: #55c50d;
		box-shadow: 0 4px 0 #3f9a0a;
		touch-action: manipulation;
	}

	.cancel:active {
		transform: translateY(3px);
		box-shadow: 0 0 0 transparent;
	}

	.confirm {
		appearance: none;
		border: none;
		background: transparent;
		padding: 0.6rem;
		font-size: 0.85rem;
		font-weight: 700;
		color: #adadab;
		touch-action: manipulation;
	}

	@keyframes fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes pop-in {
		from {
			opacity: 0;
			transform: translate(-50%, -50%) scale(0.92);
		}
		to {
			opacity: 1;
			transform: translate(-50%, -50%) scale(1);
		}
	}
</style>
