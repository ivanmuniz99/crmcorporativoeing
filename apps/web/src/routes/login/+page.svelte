<script lang="ts">
	import { goto } from '$app/navigation';
	import { auth } from '#lib/auth';
	import logo from '#lib/assets/eing-logo.png';

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		loading = true;
		try {
			await auth.login(email, password);
			goto('/dashboard');
		} catch (err: any) {
			error = err.message === 'Invalid login credentials'
				? 'Credenciales incorrectas'
				: err.message || 'No se pudo iniciar sesión';
		} finally {
			loading = false;
		}
	}
</script>

<div class="login-wrap">
	<form class="login-card" onsubmit={submit}>
		<div class="brand">
			<img src={logo} alt="Corporativo EING" class="login-logo" />
			<p>Corporativo EING — plataforma interna</p>
		</div>
		{#if error}<div class="error-msg">{error}</div>{/if}
		<div class="field">
			<label for="email">Correo</label>
			<input id="email" type="email" bind:value={email} required autocomplete="email" />
		</div>
		<div class="field">
			<label for="password">Contraseña</label>
			<input id="password" type="password" bind:value={password} required autocomplete="current-password" />
		</div>
		<button class="btn gold" style="width:100%;justify-content:center" disabled={loading}>
			{loading ? 'Entrando…' : 'Entrar'}
		</button>
		<p class="auth-switch">
			¿No tienes cuenta? <a href="/register">Regístrate aquí</a>
		</p>
	</form>
</div>
