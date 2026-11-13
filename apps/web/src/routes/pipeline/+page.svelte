<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '#lib/api';
	import { supabase } from '#lib/supabase';
	import Modal from '#lib/Modal.svelte';
	import { date, money } from '#lib/format';
	import type { Client, Opportunity, Partner, Pipeline, Profile, ServiceItem, Stage } from '#lib/types';

	let pipelines = $state<Pipeline[]>([]);
	let pipelineId = $state<string | null>(null);
	let opportunities = $state<Opportunity[]>([]);
	let clients = $state<Client[]>([]);
	let services = $state<ServiceItem[]>([]);
	let partners = $state<Partner[]>([]);
	let users = $state<Profile[]>([]);
	let loading = $state(true);
	let error = $state('');

	let cardModal = $state(false);
	let editing = $state<Partial<Opportunity> | null>(null);
	let saving = $state(false);
	let draggedId = $state<string | null>(null);
	let dragOverStage = $state<string | null>(null);

	let stageModal = $state(false);
	let stageEditing = $state<Partial<Stage> | null>(null);

	const pipeline = $derived(pipelines.find((p) => p.id === pipelineId) ?? null);

	const byStage = $derived.by(() => {
		const map = new Map<string, Opportunity[]>();
		for (const s of pipeline?.stages ?? []) map.set(s.id, []);
		for (const o of opportunities) {
			if (!map.has(o.stage_id)) map.set(o.stage_id, []);
			map.get(o.stage_id)!.push(o);
		}
		return map;
	});

	async function load() {
		loading = true; error = '';
		try {
			const [p, c, s, pa] = await Promise.all([
				api<Pipeline[]>('/pipelines'),
				api<Client[]>('/clients'),
				api<ServiceItem[]>('/services'),
				api<Partner[]>('/partners')
			]);
			pipelines = p; clients = c; services = s.filter((x) => x.is_active); partners = pa.filter((x) => x.is_active);
			pipelineId = pipelineId ?? p[0]?.id ?? null;
			if (pipelineId) await loadOpportunities();
			const { data: profs } = await supabase.from('profiles').select('*').eq('is_active', true).order('full_name');
			users = (profs ?? []) as Profile[];
		} catch (e: any) {
			error = e.message || 'Error al cargar el embudo';
		} finally {
			loading = false;
		}
	}
	onMount(load);

	async function loadOpportunities() {
		if (!pipelineId) { opportunities = []; return; }
		opportunities = await api<Opportunity[]>('/opportunities', { query: { pipeline_id: pipelineId } });
	}

	function openNew(stageId?: string) {
		if (!pipelineId || !pipeline) return;
		const stage = pipeline.stages.find((s) => s.id === stageId) ?? pipeline.stages[0];
		editing = {
			pipeline_id: pipelineId!, stage_id: stage?.id,
			currency: 'MXN', status: 'open'
		};
		cardModal = true;
	}
	function openEdit(o: Opportunity) {
		editing = { ...o };
		cardModal = true;
	}

	async function saveCard() {
		if (!editing) return;
		saving = true; error = '';
		try {
			const { client, service, partner, stage, owner, ...body } = editing as any;
			for (const key of ['contact_id', 'service_id', 'partner_id', 'owner_id', 'expected_close_date', 'next_action_at', 'outcome_reason', 'next_action', 'amount']) {
				if (body[key] === '') body[key] = null;
			}
			const targetStage = pipeline?.stages.find((s) => s.id === body.stage_id);
			if ((targetStage?.is_won_stage || targetStage?.is_lost_stage) && body.status !== 'open' && !body.outcome_reason) {
				body.outcome_reason = prompt(targetStage.is_won_stage ? 'Motivo de cierre ganado (opcional):' : 'Motivo de pérdida/cancelación:') ?? '';
				if (targetStage.is_lost_stage && !body.outcome_reason) {
					error = 'Se requiere motivo para marcar como perdida.';
					saving = false;
					return;
				}
			}
			if (editing.id) await api(`/opportunities/${editing.id}`, { method: 'PATCH', body });
			else await api('/opportunities', { method: 'POST', body });
			cardModal = false;
			await loadOpportunities();
		} catch (e: any) { error = e.message; }
		finally { saving = false; }
	}

	// ---------- Drag & drop ----------
	function onDragStart(e: DragEvent, id: string) {
		draggedId = id;
		(e.target as HTMLElement).classList.add('dragging');
		e.dataTransfer!.effectAllowed = 'move';
	}
	function onDragEnd(e: DragEvent) {
		(e.target as HTMLElement).classList.remove('dragging');
		draggedId = null; dragOverStage = null;
	}
	function onDrop(e: DragEvent, stageId: string) {
		e.preventDefault();
		dragOverStage = null;
		if (!draggedId) return;
		moveToStage(draggedId, stageId);
		draggedId = null;
	}
	async function moveToStage(oppId: string, stageId: string) {
		const opp = opportunities.find((o) => o.id === oppId);
		if (!opp || opp.stage_id === stageId) return;
		const stage = pipeline?.stages.find((s) => s.id === stageId);
		const patch: Record<string, unknown> = { stage_id: stageId };
		if (stage?.is_lost_stage) {
			const reason = prompt('Motivo de pérdida/cancelación:');
			if (reason === null) return;
			patch.outcome_reason = reason;
			patch.status = 'lost';
		} else if (stage?.is_won_stage) {
			patch.status = 'won';
			patch.outcome_reason = prompt('Motivo de cierre ganado (opcional):') ?? '';
		} else {
			patch.status = 'open';
		}
		try {
			await api(`/opportunities/${oppId}`, { method: 'PATCH', body: patch });
			await loadOpportunities();
		} catch (e: any) { error = e.message; }
	}

	// ---------- Etapas ----------
	function openStageNew() {
		stageEditing = { position: (pipeline?.stages.length ?? 0) + 1, probability: 0, pipeline_id: pipelineId! };
		stageModal = true;
	}
	function openStageEdit(s: Stage) {
		stageEditing = { ...s };
		stageModal = true;
	}
	async function saveStage() {
		if (!stageEditing) return;
		const { pipeline_id, ...body } = stageEditing as any;
		try {
			if (stageEditing.id) {
				await api(`/pipelines/stages/${stageEditing.id}`, { method: 'PATCH', body });
			} else {
				await api(`/pipelines/${pipeline_id}/stages`, { method: 'POST', body });
			}
			stageModal = false;
			await load();
		} catch (e: any) { error = e.message; }
	}
	async function deleteStage(s: Stage) {
		const count = byStage.get(s.id)?.length ?? 0;
		if (count > 0) { alert(`La etapa tiene ${count} oportunidad(es). Muévelas primero.`); return; }
		if (!confirm(`¿Eliminar etapa "${s.name}"?`)) return;
		await api(`/pipelines/stages/${s.id}`, { method: 'DELETE' });
		await load();
	}
</script>

<div class="toolbar">
	<h1 style="margin:0">Embudo comercial</h1>
	<button class="btn gold" onclick={() => openNew()} disabled={!pipeline}>+ Nueva oportunidad</button>
</div>

{#if error}<div class="error-msg">{error}</div>{/if}

<div class="pipeline-tabs">
	{#each pipelines as p (p.id)}
		<button class:active={p.id === pipelineId} onclick={() => { pipelineId = p.id; loadOpportunities(); }}>{p.name}</button>
	{/each}
	{#if pipeline}<button class="btn sm secondary" onclick={openStageNew}>+ Etapa</button>{/if}
</div>

{#if loading}
	<p class="muted">Cargando embudo…</p>
{:else if !pipeline}
	<p class="empty">No hay embudos configurados. Ejecuta el seed de Supabase.</p>
{:else}
	<div class="kanban">
		{#each pipeline.stages as stage (stage.id)}
			{@const opps = byStage.get(stage.id) ?? []}
			<div
				class="kanban-col"
				role="list"
				aria-label={`Etapa ${stage.name}`}
				class:drag-over={dragOverStage === stage.id}
				ondragover={(e) => { e.preventDefault(); dragOverStage = stage.id; }}
				ondragleave={() => (dragOverStage = null)}
				ondrop={(e) => onDrop(e, stage.id)}
			>
				<div class="kanban-col-head">
					<span>{stage.name} {stage.is_won_stage ? '🏆' : stage.is_lost_stage ? '✕' : ''}</span>
					<span class="count">{opps.length}</span>
					<span class="col-actions">
						<button title="Nueva oportunidad en esta etapa" onclick={() => openNew(stage.id)}>+</button>
						<button title="Editar etapa" onclick={() => openStageEdit(stage)}>✎</button>
						<button title="Eliminar etapa" onclick={() => deleteStage(stage)}>🗑</button>
					</span>
				</div>
				{#each opps as o (o.id)}
					<div
						class="opp-card"
						role="button"
						tabindex="0"
						aria-label={`Oportunidad ${o.title}`}
						draggable="true"
						onkeydown={(e) => e.key === 'Enter' && openEdit(o)}
						ondragstart={(e) => onDragStart(e, o.id)}
						ondragend={onDragEnd}
						onclick={() => openEdit(o)}
					>
						<div class="opp-title">{o.title}</div>
						<div class="opp-meta">
							<span>Cliente: {o.client?.name ?? '—'}</span>
							<span>Servicio: {o.service?.name ?? '—'}</span>
							{o.owner && `<span>Resp.: ${o.owner.full_name}</span>`}
							{o.partner && `<span>Partner: ${o.partner.name}</span>`}
							{o.expected_close_date && `<span>Cierre est.: ${date(o.expected_close_date)}</span>`}
							{o.next_action && `<span>→ ${o.next_action}</span>`}
						</div>
						<div class="opp-amount">{money(Number(o.amount), o.currency)}</div>
						{#if o.status !== 'open' || o.outcome_reason}
							<div class="opp-flags">
								<span class="opp-flag">{o.status}</span>
								{#if o.outcome_reason}<span class="opp-flag">{o.outcome_reason}</span>{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/each}
	</div>
{/if}

<!-- Modal oportunidad -->
<Modal bind:open={cardModal} title={editing?.id ? 'Editar oportunidad' : 'Nueva oportunidad'}>
	{#if editing}
		<div class="form-grid">
			<div class="field" style="grid-column:1/-1"><label>Título *</label><input bind:value={editing.title} /></div>
			<div class="field"><label>Cliente *</label>
				<select bind:value={editing.client_id}>
					<option value="">— Seleccionar —</option>
					{#each clients as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
				</select>
			</div>
			<div class="field"><label>Servicio</label>
				<select bind:value={editing.service_id}>
					<option value="">— Ninguno —</option>
					{#each services as s (s.id)}<option value={s.id}>{s.name}</option>{/each}
				</select>
			</div>
			<div class="field"><label>Partner</label>
				<select bind:value={editing.partner_id}>
					<option value="">— Directo —</option>
					{#each partners as p (p.id)}<option value={p.id}>{p.name}</option>{/each}
				</select>
			</div>
			<div class="field"><label>Responsable</label>
				<select bind:value={editing.owner_id}>
					<option value="">— Sin asignar —</option>
					{#each users as u (u.id)}<option value={u.id}>{u.full_name} ({u.role})</option>{/each}
				</select>
			</div>
			<div class="field"><label>Monto</label><input type="number" step="0.01" min="0" bind:value={editing.amount} /></div>
			<div class="field"><label>Moneda</label><input bind:value={editing.currency} /></div>
			<div class="field"><label>Etapa</label>
				<select bind:value={editing.stage_id}>
					{#each pipeline?.stages ?? [] as s (s.id)}<option value={s.id}>{s.name}</option>{/each}
				</select>
			</div>
			<div class="field"><label>Fecha de cierre estimada</label><input type="date" bind:value={editing.expected_close_date} /></div>
			<div class="field"><label>Próxima acción</label><input bind:value={editing.next_action} /></div>
			<div class="field"><label>Fecha próxima acción</label><input type="date" bind:value={editing.next_action_at} /></div>
			<div class="field"><label>Estado</label>
				<select bind:value={editing.status}>
					<option value="open">Abierta</option>
					<option value="won">Ganada</option>
					<option value="lost">Perdida</option>
					<option value="cancelled">Cancelada</option>
				</select>
			</div>
			{#if editing.status !== 'open'}
				<div class="field" style="grid-column:1/-1"><label>Motivo del resultado</label><input bind:value={editing.outcome_reason} placeholder="Ej. Precio, competencia, canceló el cliente…" /></div>
			{/if}
		</div>
		{#if error}<div class="error-msg">{error}</div>{/if}
		<div style="display:flex;justify-content:flex-end;gap:.5rem">
			<button class="btn secondary" onclick={() => (cardModal = false)}>Cancelar</button>
			<button class="btn gold" onclick={saveCard} disabled={saving || !editing.title || !editing.client_id}>{saving ? 'Guardando…' : 'Guardar'}</button>
		</div>
	{/if}
</Modal>

<!-- Modal etapa -->
<Modal bind:open={stageModal} title={stageEditing?.id ? 'Editar etapa' : 'Nueva etapa'}>
	{#if stageEditing}
		<div class="field"><label>Nombre *</label><input bind:value={stageEditing.name} /></div>
		<div class="field"><label>Probabilidad %</label><input type="number" min="0" max="100" bind:value={stageEditing.probability} /></div>
		<div class="field"><label><input type="checkbox" bind:checked={stageEditing.is_won_stage} /> Etapa de cierre ganado</label></div>
		<div class="field"><label><input type="checkbox" bind:checked={stageEditing.is_lost_stage} /> Etapa de cierre perdido/cancelado</label></div>
		<div style="display:flex;justify-content:flex-end;gap:.5rem">
			<button class="btn secondary" onclick={() => (stageModal = false)}>Cancelar</button>
			<button class="btn gold" onclick={saveStage} disabled={!stageEditing.name}>Guardar</button>
		</div>
	{/if}
</Modal>
