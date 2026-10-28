<script lang="ts">
	let { message }: { message: string } = $props();
</script>

<div class="toast" role="status">{message}</div>

<style>
	.toast {
		position: fixed;
		left: 50%;
		bottom: 100px;
		transform: translateX(-50%);
		max-width: calc(100% - 32px);
		background: #3b3b3a;
		color: #ffffff;
		font-size: 0.8rem;
		font-weight: 700;
		padding: 0.6rem 1.1rem;
		border-radius: 999px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
		z-index: 30;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		pointer-events: none;
		animation: toast-inout 1.4s ease forwards;
	}

	@keyframes toast-inout {
		0% {
			opacity: 0;
			transform: translate(-50%, 8px);
		}
		12% {
			opacity: 1;
			transform: translate(-50%, 0);
		}
		82% {
			opacity: 1;
			transform: translate(-50%, 0);
		}
		100% {
			opacity: 0;
			transform: translate(-50%, -6px);
		}
	}
</style>
