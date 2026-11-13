import { Router } from 'express';
import { supabaseAdmin } from '../app.js';
import { audit } from '../lib/audit.js';

const router = Router();

// Oportunidades del embudo. Incluye cliente, servicio, partner y etapa.
router.get('/', async (req, res, next) => {
  try {
    let q = req.supabase
      .from('opportunities')
      .select(`
        *,
        client:clients(id,name,type),
        service:services(id,name),
        partner:partners(id,name),
        stage:stages(id,name,is_won_stage,is_lost_stage),
        owner:profiles!opportunities_owner_id_fkey(id,full_name)
      `)
      .order('created_at', { ascending: false });
    for (const key of ['pipeline_id', 'stage_id', 'client_id', 'partner_id', 'owner_id', 'status']) {
      if (req.query[key]) q = q.eq(key, req.query[key]);
    }
    const { data, error } = await q;
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { data, error } = await req.supabase
      .from('opportunities')
      .select(`
        *,
        client:clients(*),
        service:services(*),
        partner:partners(*),
        stage:stages(*),
        history:opportunity_history(*)
      `)
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const body = { ...req.body, owner_id: req.body.owner_id === undefined ? req.user.id : req.body.owner_id };
    if (!body.pipeline_id && body.stage_id) {
      const { data: stage } = await req.supabase
        .from('stages').select('pipeline_id').eq('id', body.stage_id).single();
      if (stage) body.pipeline_id = stage.pipeline_id;
    }
    if (!body.pipeline_id) {
      return res.status(400).json({ error: 'pipeline_id es obligatorio (o indica stage_id válido)' });
    }
    const { data, error } = await req.supabase.from('opportunities').insert(body).select().single();
    if (error) throw error;
    await supabaseAdmin.from('opportunity_history').insert({
      opportunity_id: data.id, from_stage_id: null, to_stage_id: data.stage_id,
      changed_by: req.user.id, note: 'Oportunidad creada'
    });
    await audit({ userId: req.user.id, action: 'create', entity: 'opportunities', entityId: data.id, detail: data });
    res.status(201).json(data);
  } catch (e) { next(e); }
});

// Mover de etapa o editar campos. Si la etapa destino es ganada/perdida,
// marca el resultado con motivo.
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const patch = { ...req.body };

    if (patch.stage_id) {
      const { data: stage } = await req.supabase
        .from('stages').select('is_won_stage,is_lost_stage').eq('id', patch.stage_id).single();
      if (stage?.is_won_stage) {
        patch.status = 'won'; patch.won_at = new Date().toISOString();
      } else if (stage?.is_lost_stage) {
        patch.status = 'lost'; patch.lost_at = new Date().toISOString();
      } else {
        patch.status = 'open';
      }
    }
    if (['won', 'lost', 'cancelled'].includes(patch.status) && patch.status !== 'open' && !patch.outcome_reason) {
      patch.outcome_reason = patch.outcome_reason || null;
    }

    const { data: before } = await req.supabase.from('opportunities').select('stage_id').eq('id', id).single();
    const { data, error } = await req.supabase.from('opportunities').update(patch).eq('id', id).select().single();
    if (error) throw error;

    if (patch.stage_id && before && before.stage_id !== patch.stage_id) {
      await supabaseAdmin.from('opportunity_history').insert({
        opportunity_id: id, from_stage_id: before.stage_id, to_stage_id: patch.stage_id,
        changed_by: req.user.id, note: patch.outcome_reason || null
      });
    }
    await audit({ userId: req.user.id, action: 'update', entity: 'opportunities', entityId: id, detail: patch });
    res.json(data);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { error } = await req.supabase.from('opportunities').delete().eq('id', req.params.id);
    if (error) throw error;
    await audit({ userId: req.user.id, action: 'delete', entity: 'opportunities', entityId: req.params.id });
    res.status(204).end();
  } catch (e) { next(e); }
});

export default router;
