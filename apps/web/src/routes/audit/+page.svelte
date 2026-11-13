<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '#lib/api';
	import { dateTime } from '#lib/format';
	import type { AuditEntry } from '#lib/types';

	let entries = $state<AuditEntry[]>([]);
	let loading = $state(true);
	let entity = $state('');

	async function load() {
		loading = true;
		entries = await api<AuditEntry[]>('/audit', { query: { entity: entity || undefined } });
		loading = false;
	}
	onMount(load);
</script>

<div class="toolbar">
	<h1 style="margin:0">Auditoría</h1>
	<select bind:value={entity} onchange={load}>
		<option value="">Todas las entidades</option>
		<option value="clients">Clientes</option>
		<option value="partners">Partners</option>
		<option value="services">Servicios</option>
		<option value="pipelines">Embudos</option>
		<option value="stages">Etapas</option>
		<option value="opportunities">Oportunidades</option>
		<option value="profiles">Usuarios</option>
	</select>
</div>

<div class="table-wrap">
	<table>
		<thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Entidad</th><th>Detalle</th></tr></thead>
		<tbody>
			{#each entries as e (e.id)}
				<tr>
					<td>{dateTime(e.created_at)}</td>
					<td>{e.profile?.full_name ?? e.profile?.email ?? '—'}</td>
					<td>{e.action}</td>
					<td>{e.entity}</td>
					<td class="muted" style="max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{e.detail ? JSON.stringify(e.detail) : '—'}</td>
				</tr>
			{:else}
				<tr><td colspan="5" class="empty">{loading ? 'Cargando…' : 'Sin registros.'}</td></tr>
			{/each}
		</tbody>
	</table>
</div>
