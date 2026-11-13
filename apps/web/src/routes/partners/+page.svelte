<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '#lib/api';
	import Modal from '#lib/Modal.svelte';
	import type { Partner } from '#lib/types';

	let partners = $state<Partner[]>([]);
	let loading = $state(true);
	let modalOpen = $state(false);
	let editing = $state<Partial<Partner> | null>(null);
	let error = $state('');
	let saving = $state(false);

	async function load() {
		loading = true;
		partners = await api<Partner[]>('/partners');
		loading = false;
	}
	onMount(load);

	function openNew() { editing = { is_active: true, commission_percent: 0 }; modalOpen = true; }
	function openEdit(p: Partner) { editing = { ...p }; modalOpen = true; }
	const PARTNER_FIELDS = ['name', 'type', 'email', 'phone', 'tax_id', 'commission_percent', 'notes', 'is_active'] as const;

	function partnerPayload(p: Partial<Partner>) {
		const out: Record<string, unknown> = {};
		for (const k of PARTNER_FIELDS) if (p[k as keyof Partner] !== undefined) out[k] = p[k as keyof Partner];
		return out;
	}

	async function save() {
		if (!editing) return;
		saving = true; error = '';
		try {
			const body = partnerPayload(editing);
			if (editing.id) await api(`/partners/${editing.id}`, { method: 'PATCH', body });
			else await api('/partners', { method: 'POST', body });
			modalOpen = false;
			await load();
		} catch (e: any) { error = e.message; }
		finally { saving = false; }
	}
</script>

<div class="toolbar">
	<h1 style="margin:0">Partners</h1>
	<button class="btn gold" onclick={openNew}>+ Nuevo partner</button>
</div>

<div class="table-wrap">
	<table>
		<thead><tr><th>Nombre</th><th>Tipo</th><th>Correo</th><th>Teléfono</th><th>Comisión %</th><th>Estado</th><th></th></tr></thead>
		<tbody>
			{#each partners as p (p.id)}
				<tr>
					<td><strong>{p.name}</strong></td>
					<td>{p.type ?? '—'}</td>
					<td>{p.email ?? '—'}</td>
					<td>{p.phone ?? '—'}</td>
					<td>{p.commission_percent ?? 0}%</td>
					<td><span class="badge {p.is_active ? 'activo' : 'inactivo'}">{p.is_active ? 'activo' : 'inactivo'}</span></td>
					<td><button class="btn sm secondary" onclick={() => openEdit(p)}>Editar</button></td>
				</tr>
			{:else}
				<tr><td colspan="7" class="empty">{loading ? 'Cargando…' : 'Sin partners registrados.'}</td></tr>
			{/each}
		</tbody>
	</table>
</div>

<Modal bind:open={modalOpen} title={editing?.id ? 'Editar partner' : 'Nuevo partner'}>
	{#if editing}
		<div class="form-grid">
			<div class="field"><label>Nombre *</label><input bind:value={editing.name} /></div>
			<div class="field"><label>Tipo</label><input bind:value={editing.type} placeholder="Ej. Broker, integrador, despachante" /></div>
			<div class="field"><label>Correo</label><input type="email" bind:value={editing.email} /></div>
			<div class="field"><label>Teléfono</label><input bind:value={editing.phone} /></div>
			<div class="field"><label>RFC</label><input bind:value={editing.tax_id} /></div>
			<div class="field"><label>Comisión %</label><input type="number" step="0.01" min="0" max="100" bind:value={editing.commission_percent} /></div>
			<div class="field"><label><input type="checkbox" bind:checked={editing.is_active} /> Activo</label></div>
			<div class="field" style="grid-column:1/-1"><label>Notas / condiciones</label><textarea rows="2" bind:value={editing.notes}></textarea></div>
		</div>
		{#if error}<div class="error-msg">{error}</div>{/if}
		<div style="display:flex;justify-content:flex-end;gap:.5rem">
			<button class="btn secondary" onclick={() => (modalOpen = false)}>Cancelar</button>
			<button class="btn gold" onclick={save} disabled={saving || !editing.name}>{saving ? 'Guardando…' : 'Guardar'}</button>
		</div>
	{/if}
</Modal>
