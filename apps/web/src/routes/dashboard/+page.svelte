<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '#lib/api';
	import { money } from '#lib/format';
	import type { Client, Opportunity, Partner } from '#lib/types';

	let clients: Client[] = $state([]);
	let partners: Partner[] = $state([]);
	let opportunities: Opportunity[] = $state([]);
	let loading = $state(true);

	const open = $derived(opportunities.filter((o) => o.status === 'open'));
	const won = $derived(opportunities.filter((o) => o.status === 'won'));
	const pipelineValue = $derived(open.reduce((s, o) => s + Number(o.amount || 0), 0));
	const wonValue = $derived(won.reduce((s, o) => s + Number(o.amount || 0), 0));
	const winRate = $derived(
		opportunities.length ? Math.round((won.length / Math.max(1, won.length + opportunities.filter((o) => o.status === 'lost').length)) * 100) : 0
	);

	const byStage = $derived.by(() => {
		const map = new Map<string, { count: number; total: number }>();
		for (const o of open) {
			const key = o.stage?.name ?? 'Sin etapa';
			const cur = map.get(key) ?? { count: 0, total: 0 };
			cur.count++; cur.total += Number(o.amount || 0);
			map.set(key, cur);
		}
		return [...map.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 8);
	});

	onMount(async () => {
		try {
			const [c, p, o] = await Promise.all([
				api<Client[]>('/clients'),
				api<Partner[]>('/partners'),
				api<Opportunity[]>('/opportunities')
			]);
			clients = c; partners = p; opportunities = o;
		} finally {
			loading = false;
		}
	});
</script>

<h1>Dashboard</h1>

{#if loading}
	<p class="muted">Cargando indicadores…</p>
{:else}
	<div class="kpis">
		<div class="kpi"><div class="kpi-label">Clientes</div><div class="kpi-value">{clients.length}</div><div class="kpi-sub">{clients.filter(c => c.status === 'activo').length} activos</div></div>
		<div class="kpi"><div class="kpi-label">Partners</div><div class="kpi-value">{partners.filter(p => p.is_active).length}</div><div class="kpi-sub">activos</div></div>
		<div class="kpi"><div class="kpi-label">Oportunidades abiertas</div><div class="kpi-value">{open.length}</div><div class="kpi-sub">{money(pipelineValue)} en pipeline</div></div>
		<div class="kpi"><div class="kpi-label">Ventas ganadas</div><div class="kpi-value">{won.length}</div><div class="kpi-sub">{money(wonValue)} cerradas</div></div>
		<div class="kpi"><div class="kpi-label">Tasa de cierre</div><div class="kpi-value">{winRate}%</div><div class="kpi-sub">ganadas vs perdidas</div></div>
	</div>

	<div class="table-wrap" style="padding:1rem">
		<h2>Valor por etapa (abiertas)</h2>
		{#each byStage as [stage, v] (stage)}
			<div style="display:flex;justify-content:space-between;padding:.4rem 0;border-bottom:1px solid var(--e-border)">
				<span>{stage}</span>
				<span><strong>{v.count}</strong> · {money(v.total)}</span>
			</div>
		{:else}
			<p class="empty">Sin oportunidades abiertas.</p>
		{/each}
	</div>
{/if}
