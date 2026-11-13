<script lang="ts">
	import { onMount } from 'svelte';
	import { auth } from '#lib/auth';
	import { api } from '#lib/api';
	import type { Profile } from '#lib/types';

	let users = $state<Profile[]>([]);
	let loading = $state(true);
	let error = $state('');
	let saving = $state(false);
	let form = $state({ email: '', password: '', full_name: '', role: 'comercial' as Profile['role'] });

	async function load() {
		loading = true;
		users = await api<Profile[]>('/admin/users');
		loading = false;
	}
	onMount(load);

	async function createUser(e: SubmitEvent) {
		e.preventDefault();
		saving = true; error = '';
		try {
			await auth.createUser(form);
			form = { email: '', password: '', full_name: '', role: 'comercial' };
			await load();
		} catch (err: any) {
			error = err.message;
		} finally { saving = false; }
	}
</script>

<h1>Usuarios</h1>
<p class="muted">Las contraseñas se almacenan cifradas (hash) por Supabase Auth — nunca en texto plano.</p>

<div class="table-wrap" style="margin-bottom:1.5rem">
	<table>
		<thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th></tr></thead>
		<tbody>
			{#each users as u (u.id)}
				<tr>
					<td><strong>{u.full_name}</strong></td>
					<td>{u.email}</td>
					<td><span class="badge open">{u.role}</span></td>
					<td>{u.is_active ? 'activo' : 'inactivo'}</td>
				</tr>
			{:else}
				<tr><td colspan="4" class="empty">{loading ? 'Cargando…' : 'Sin usuarios.'}</td></tr>
			{/each}
		</tbody>
	</table>
</div>

<h2>Crear usuario</h2>
<form class="table-wrap" style="padding:1rem;max-width:560px" onsubmit={createUser}>
	<div class="form-grid">
		<div class="field"><label>Nombre completo *</label><input bind:value={form.full_name} required /></div>
		<div class="field"><label>Correo *</label><input type="email" bind:value={form.email} required /></div>
		<div class="field"><label>Contraseña * (mín. 8)</label><input type="password" bind:value={form.password} minlength="8" required /></div>
		<div class="field"><label>Rol</label>
			<select bind:value={form.role}>
				<option value="admin">Administrador</option>
				<option value="comercial">Comercial</option>
				<option value="operaciones">Operaciones</option>
				<option value="soporte">Soporte</option>
				<option value="contador">Contador</option>
				<option value="cliente">Cliente (portal)</option>
			</select>
		</div>
	</div>
	{#if error}<div class="error-msg">{error}</div>{/if}
	<button class="btn gold" disabled={saving}>{saving ? 'Creando…' : 'Crear usuario'}</button>
</form>
