<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { auth } from '#lib/auth';
	import logo from '#lib/assets/eing-logo.png';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	let state = $state({ session: null as any, profile: null as any, loading: true });
	const unsub = auth.subscribe((s) => (state = s));

	onMount(() => {
		auth.init();
		return () => unsub();
	});

	$effect(() => {
		if (state.loading) return;
		const publicPaths = ['/login', '/register'];
		const onPublic = publicPaths.includes(page.url.pathname);
		if (!state.session && !onPublic) goto('/login');
		if (state.session && onPublic) goto('/dashboard');
	});

	const nav = $derived([
		{ href: '/dashboard', label: 'Dashboard' },
		{ href: '/pipeline', label: 'Embudo comercial' },
		{ href: '/clients', label: 'Clientes' },
		{ href: '/map', label: 'Mapa' },
		{ href: '/partners', label: 'Partners' },
		{ href: '/services', label: 'Servicios' },
		{ href: '/audit', label: 'Auditoría' },
		...(state.profile?.role === 'admin' ? [{ href: '/users', label: 'Usuarios' }] : [])
	]);
</script>

<svelte:head><title>Corporativo EING · CRM</title></svelte:head>

{#if state.loading}
	<div class="login-wrap"><p class="muted">Cargando…</p></div>
{:else if state.session}
	<div class="app-shell">
		<aside class="sidebar">
			<div class="brand"><img src={logo} alt="Corporativo EING" class="brand-logo" /></div>
			<nav>
				{#each nav as item}
					<a href={item.href} class:active={page.url.pathname.startsWith(item.href)}>{item.label}</a>
				{/each}
			</nav>
			<div class="user">
				<strong>{state.profile?.full_name ?? state.session.user.email}</strong><br />
				{state.profile?.role ?? ''}<br />
				<button class="btn sm secondary" style="margin-top:.5rem" onclick={() => auth.logout()}>Cerrar sesión</button>
			</div>
		</aside>
		<div class="main">
			<header class="topbar">
				<img src={logo} alt="Corporativo EING" class="topbar-logo" />
				<span class="muted">Service Desk · Portal de clientes · Fase 1</span>
			</header>
			<main class="content">{@render children()}</main>
		</div>
	</div>
{:else}
	{@render children()}
{/if}
