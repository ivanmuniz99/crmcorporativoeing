<script lang="ts">
	import { goto } from '$app/navigation';
	import { auth } from '#lib/auth';
	import logo from '#lib/assets/eing-logo.png';

	let full_name = $state('');
	let email = $state('');
	let password = $state('');
	let confirm = $state('');
	let error = $state('');
	let notice = $state('');
	let loading = $state(false);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		notice = '';
		if (password !== confirm) {
			error = 'Las contraseñas no coinciden';
			return;
		}
		loading = true;
		try {
			const created = await auth.register({ full_name, email, password });
			notice = created.role === 'admin'
				? '¡Cuenta creada! Eres el administrador principal. Iniciando sesión…'
				: '¡Cuenta creada! Iniciando sesión…';
			await auth.login(email, password);
			goto('/dashboard');
		} catch (err: any) {
			error = err.message || 'No se pudo crear la cuenta';
		} finally {
			loading = false;
		}
	}
</script>

<div class="login-wrap">
	<form class="login-card" onsubmit={submit}>
		<div class="brand">
			<img src={logo} alt="Corporativo EING" class="login-logo" />
			<p>Plataforma interna · Regístrate para continuar</p>
		</div>
		{#if error}<div class="error-msg">{error}</div>{/if}
		{#if notice}<div class="ok-msg">{notice}</div>{/if}
		<div class="field">
			<label for="full_name">Nombre completo</label>
			<input id="full_name" bind:value={full_name} required autocomplete="name" />
		</div>
		<div class="field">
			<label for="email">Correo</label>
			<input id="email" type="email" bind:value={email} required autocomplete="email" />
		</div>
		<div class="field">
			<label for="password">Contraseña (mín. 8 caracteres)</label>
			<input id="password" type="password" bind:value={password} required minlength="8" autocomplete="new-password" />
		</div>
		<div class="field">
			<label for="confirm">Confirmar contraseña</label>
			<input id="confirm" type="password" bind:value={confirm} required autocomplete="new-password" />
		</div>
		<button class="btn gold" style="width:100%;justify-content:center" disabled={loading}>
			{loading ? 'Creando cuenta…' : 'Crear cuenta'}
		</button>
		<p class="auth-switch">
			¿Ya tienes cuenta? <a href="/login">Inicia sesión</a>
		</p>
		<p class="muted tiny">El primer usuario registrado obtiene permisos de superadministrador.</p>
	</form>
</div>
