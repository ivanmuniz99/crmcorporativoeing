<script lang="ts">
	let {
		open = $bindable(false),
		title = '',
		children
	}: {
		open?: boolean;
		title?: string;
		children: import('svelte').Snippet;
	} = $props();
</script>

{#if open}
	<div class="modal-backdrop" role="presentation" onclick={(e) => e.target === e.currentTarget && (open = false)}>
		<div class="modal" role="dialog" aria-modal="true">
			<div class="modal-head">
				<h2>{title}</h2>
				<button class="modal-close" onclick={() => (open = false)} aria-label="Cerrar">×</button>
			</div>
			{@render children()}
		</div>
	</div>
{/if}
