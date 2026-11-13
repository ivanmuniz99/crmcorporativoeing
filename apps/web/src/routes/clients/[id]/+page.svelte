<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { api } from '#lib/api';
	import Modal from '#lib/Modal.svelte';
	import { date, money } from '#lib/format';
	import type { Client, Contact, Opportunity } from '#lib/types';

	const id = $derived(page.params.id!);
	let client = $state<Client | null>(null);
	let contacts = $state<Contact[]>([]);
	let opportunities = $state<Opportunity[]>([]);
	let loading = $state(true);
	let contactModal = $state(false);
	let editingContact = $state<Partial<Contact> | null>(null);

	async function load() {
		loading = true;
		const [c, o] = await Promise.all([
			api<Client>(`/clients/${id}`),
			api<Opportunity[]>('/opportunities', { query: { client_id: id } })
		]);
		client = c;
		contacts = (c.contacts ?? []) as Contact[];
		opportunities = o;
		loading = false;
	}
	onMount(load);

	function newContact() {
		editingContact = { client_id: id, is_primary: contacts.length === 0 };
		contactModal = true;
	}
	async function saveContact() {
		if (!editingContact) return;
		if (editingContact.id) await api(`/contacts/${editingContact.id}`, { method: 'PATCH', body: editingContact });
		else await api('/contacts', { method: 'POST', body: editingContact });
		contactModal = false;
		await load();
	}
</script>

{#if loading}
	<p class="muted">Cargando…</p>
{:else if client}
	<div class="toolbar">
		<h1 style="margin:0">{client.name}</h1>
		<span class="badge {client.status}">{client.status}</span>
	</div>

	<div class="form-grid" style="margin-bottom:1.25rem">
		<div class="kpi"><div class="kpi-label">Tipo</div><div class="kpi-value" style="font-size:1rem">{client.type === 'empresa' ? 'Empresa' : 'Persona'}</div></div>
		<div class="kpi"><div class="kpi-label">RFC / ID fiscal</div><div class="kpi-value" style="font-size:1rem">{client.tax_id ?? '—'}</div></div>
		<div class="kpi"><div class="kpi-label">Correo</div><div class="kpi-value" style="font-size:1rem">{client.email ?? '—'}</div></div>
		<div class="kpi"><div class="kpi-label">Teléfono</div><div class="kpi-value" style="font-size:1rem">{client.phone ?? '—'}</div></div>
	</div>
	{#if client.address}<p class="muted">{client.address}</p>{/if}
	{#if client.notes}<p>{client.notes}</p>{/if}

	<h2>Contactos</h2>
	<div class="table-wrap" style="margin-bottom:1.5rem">
		<table>
			<thead><tr><th>Nombre</th><th>Puesto</th><th>Correo</th><th>Teléfono</th><th>Principal</th></tr></thead>
			<tbody>
				{#each contacts as ct (ct.id)}
					<tr>
						<td><strong>{ct.name}</strong></td>
						<td>{ct.role_title ?? '—'}</td>
						<td>{ct.email ?? '—'}</td>
						<td>{ct.phone ?? '—'}</td>
						<td>{ct.is_primary ? 'Sí' : ''}</td>
					</tr>
				{:else}
					<tr><td colspan="5" class="empty">Sin contactos registrados.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
	<button class="btn secondary" onclick={newContact}>+ Agregar contacto</button>

	<h2 style="margin-top:1.5rem">Oportunidades</h2>
	<div class="table-wrap">
		<table>
			<thead><tr><th>Oportunidad</th><th>Servicio</th><th>Monto</th><th>Etapa</th><th>Estado</th><th>Cierre est.</th><th>Creada</th></tr></thead>
			<tbody>
				{#each opportunities as o (o.id)}
					<tr>
						<td>{o.title}</td>
						<td>{o.service?.name ?? '—'}</td>
						<td>{money(Number(o.amount))}</td>
						<td>{o.stage?.name ?? '—'}</td>
						<td><span class="badge {o.status}">{o.status}</span></td>
						<td>{date(o.expected_close_date)}</td>
						<td>{date(o.created_at)}</td>
					</tr>
				{:else}
					<tr><td colspan="7" class="empty">Sin oportunidades.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>

	<Modal bind:open={contactModal} title="Nuevo contacto">
		{#if editingContact}
			<div class="field"><label>Nombre *</label><input bind:value={editingContact.name} /></div>
			<div class="field"><label>Puesto</label><input bind:value={editingContact.role_title} /></div>
			<div class="field"><label>Correo</label><input type="email" bind:value={editingContact.email} /></div>
			<div class="field"><label>Teléfono</label><input bind:value={editingContact.phone} /></div>
			<div class="field"><label><input type="checkbox" bind:checked={editingContact.is_primary} /> Contacto principal</label></div>
			<div style="display:flex;justify-content:flex-end;gap:.5rem">
				<button class="btn secondary" onclick={() => (contactModal = false)}>Cancelar</button>
				<button class="btn gold" onclick={saveContact}>Guardar</button>
			</div>
		{/if}
	</Modal>
{/if}
