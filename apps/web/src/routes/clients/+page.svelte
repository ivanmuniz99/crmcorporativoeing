<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { api } from '#lib/api';
	import Modal from '#lib/Modal.svelte';
	import { date } from '#lib/format';
	import type { Client } from '#lib/types';

	let clients = $state<Client[]>([]);
	let loading = $state(true);
	let search = $state('');
	let modalOpen = $state(false);
	let editing = $state<Partial<Client> | null>(null);
	let error = $state('');
	let saving = $state(false);

	async function load() {
		loading = true;
		clients = await api<Client[]>('/clients', { query: { search: search || undefined } });
		loading = false;
	}
	onMount(load);

	function openNew() {
		editing = { type: 'empresa', status: 'activo' };
		modalOpen = true;
	}
	function openEdit(c: Client) {
		editing = { ...c };
		modalOpen = true;
	}
	const CLIENT_FIELDS = ['name', 'legal_name', 'type', 'tax_id', 'email', 'phone', 'address', 'status', 'notes', 'lat', 'lng'] as const;

	function clientPayload(c: Partial<Client>) {
		const out: Record<string, unknown> = {};
		for (const k of CLIENT_FIELDS) if (c[k as keyof Client] !== undefined) out[k] = c[k as keyof Client];
		return out;
	}

	async function save() {
		if (!editing) return;
		saving = true; error = '';
		try {
			const body = clientPayload(editing);
			if (editing.id) await api(`/clients/${editing.id}`, { method: 'PATCH', body });
			else await api('/clients', { method: 'POST', body });
			modalOpen = false;
			await load();
		} catch (e: any) { error = e.message; }
		finally { saving = false; }
	}
	async function remove(c: Client) {
		if (!confirm(`¿Eliminar cliente "${c.name}"?`)) return;
		await api(`/clients/${c.id}`, { method: 'DELETE' });
		await load();
	}
</script>

<div class="toolbar">
	<h1 style="margin:0">Clientes</h1>
	<input placeholder="Buscar por nombre, RFC, correo…" bind:value={search} oninput={load} style="flex:1;min-width:200px" />
	<button class="btn gold" onclick={openNew}>+ Nuevo cliente</button>
</div>

<div class="table-wrap">
	<table>
		<thead><tr><th>Nombre</th><th>Tipo</th><th>RFC / ID fiscal</th><th>Correo</th><th>Teléfono</th><th>Estado</th><th>Alta</th><th></th></tr></thead>
		<tbody>
			{#each clients as c (c.id)}
				<tr class="clickable" ondblclick={() => goto(`/clients/${c.id}`)}>
					<td><strong>{c.name}</strong></td>
					<td>{c.type === 'empresa' ? 'Empresa' : 'Persona'}</td>
					<td>{c.tax_id ?? '—'}</td>
					<td>{c.email ?? '—'}</td>
					<td>{c.phone ?? '—'}</td>
					<td><span class="badge {c.status}">{c.status}</span></td>
					<td>{date(c.created_at)}</td>
					<td style="white-space:nowrap">
						<button class="btn sm secondary" onclick={() => goto(`/clients/${c.id}`)}>Ver</button>
						<button class="btn sm secondary" onclick={() => openEdit(c)}>Editar</button>
						<button class="btn sm danger" onclick={() => remove(c)}>✕</button>
					</td>
				</tr>
			{:else}
				<tr><td colspan="8" class="empty">{loading ? 'Cargando…' : 'Sin clientes. Crea el primero.'}</td></tr>
			{/each}
		</tbody>
	</table>
</div>

<Modal bind:open={modalOpen} title={editing?.id ? 'Editar cliente' : 'Nuevo cliente'}>
	{#if editing}
		<div class="form-grid">
			<div class="field"><label>Nombre *</label><input bind:value={editing.name} /></div>
			<div class="field"><label>Razón social</label><input bind:value={editing.legal_name} /></div>
			<div class="field">
				<label>Tipo</label>
				<select bind:value={editing.type}>
					<option value="empresa">Empresa</option>
					<option value="persona">Persona</option>
				</select>
			</div>
			<div class="field"><label>RFC / ID fiscal</label><input bind:value={editing.tax_id} /></div>
			<div class="field"><label>Correo</label><input type="email" bind:value={editing.email} /></div>
			<div class="field"><label>Teléfono</label><input bind:value={editing.phone} /></div>
			<div class="field"><label>Estado</label>
				<select bind:value={editing.status}>
					<option value="activo">Activo</option>
					<option value="prospecto">Prospecto</option>
					<option value="inactivo">Inactivo</option>
				</select>
			</div>
			<div class="field" style="grid-column:1/-1"><label>Dirección</label><input bind:value={editing.address} /></div>
			<div class="field" style="grid-column:1/-1"><label>Notas</label><textarea rows="2" bind:value={editing.notes}></textarea></div>
		</div>
		{#if error}<div class="error-msg">{error}</div>{/if}
		<div style="display:flex;justify-content:flex-end;gap:.5rem">
			<button class="btn secondary" onclick={() => (modalOpen = false)}>Cancelar</button>
			<button class="btn gold" onclick={save} disabled={saving || !editing.name}>{saving ? 'Guardando…' : 'Guardar'}</button>
		</div>
	{/if}
</Modal>
