<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '#lib/api';
	import Modal from '#lib/Modal.svelte';
	import { money } from '#lib/format';
	import type { ServiceItem } from '#lib/types';

	let services = $state<ServiceItem[]>([]);
	let loading = $state(true);
	let modalOpen = $state(false);
	let editing = $state<Partial<ServiceItem> | null>(null);
	let error = $state('');
	let saving = $state(false);

	async function load() {
		loading = true;
		services = await api<ServiceItem[]>('/services');
		loading = false;
	}
	onMount(load);

	const categories: Record<string, string> = {
		tecnologia: 'Tecnología', inmobiliario: 'Inmobiliario', empresarial: 'Empresarial'
	};

	function openNew() { editing = { is_active: true, category: 'empresarial', base_cost: 0, currency: 'MXN' }; modalOpen = true; }
	function openEdit(s: ServiceItem) { editing = { ...s }; modalOpen = true; }
	async function save() {
		if (!editing) return;
		saving = true; error = '';
		try {
			if (editing.id) await api(`/services/${editing.id}`, { method: 'PATCH', body: editing });
			else await api('/services', { method: 'POST', body: editing });
			modalOpen = false;
			await load();
		} catch (e: any) { error = e.message; }
		finally { saving = false; }
	}
</script>

<div class="toolbar">
	<h1 style="margin:0">Servicios</h1>
	<button class="btn gold" onclick={openNew}>+ Nuevo servicio</button>
</div>

<div class="table-wrap">
	<table>
		<thead><tr><th>Servicio</th><th>Categoría</th><th>Costo base</th><th>Estado</th><th></th></tr></thead>
		<tbody>
			{#each services as s (s.id)}
				<tr>
					<td><strong>{s.name}</strong>{#if s.description}<br /><span class="muted">{s.description}</span>{/if}</td>
					<td><span class="badge {s.category}">{categories[s.category]}</span></td>
					<td>{money(Number(s.base_cost), s.currency)}</td>
					<td><span class="badge {s.is_active ? 'activo' : 'inactivo'}">{s.is_active ? 'activo' : 'inactivo'}</span></td>
					<td><button class="btn sm secondary" onclick={() => openEdit(s)}>Editar</button></td>
				</tr>
			{:else}
				<tr><td colspan="5" class="empty">{loading ? 'Cargando…' : 'Sin servicios. Ejecuta el seed de Supabase.'}</td></tr>
			{/each}
		</tbody>
	</table>
</div>

<Modal bind:open={modalOpen} title={editing?.id ? 'Editar servicio' : 'Nuevo servicio'}>
	{#if editing}
		<div class="field"><label>Nombre *</label><input bind:value={editing.name} /></div>
		<div class="field"><label>Categoría</label>
			<select bind:value={editing.category}>
				<option value="tecnologia">Tecnología</option>
				<option value="inmobiliario">Inmobiliario</option>
				<option value="empresarial">Empresarial</option>
			</select>
		</div>
		<div class="field"><label>Costo base</label><input type="number" step="0.01" bind:value={editing.base_cost} /></div>
		<div class="field"><label>Moneda</label><input bind:value={editing.currency} /></div>
		<div class="field"><label>Descripción</label><textarea rows="2" bind:value={editing.description}></textarea></div>
		<div class="field"><label><input type="checkbox" bind:checked={editing.is_active} /> Activo</label></div>
		{#if error}<div class="error-msg">{error}</div>{/if}
		<div style="display:flex;justify-content:flex-end;gap:.5rem">
			<button class="btn secondary" onclick={() => (modalOpen = false)}>Cancelar</button>
			<button class="btn gold" onclick={save} disabled={saving || !editing.name}>{saving ? 'Guardando…' : 'Guardar'}</button>
		</div>
	{/if}
</Modal>
