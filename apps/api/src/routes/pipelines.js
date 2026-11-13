import { Router } from 'express';
import { audit } from '../lib/audit.js';

const router = Router();

// Lista pipelines con sus etapas ordenadas.
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await req.supabase
      .from('pipelines')
      .select('*, stages:stages(*)')
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    const sorted = data.map((p) => ({
      ...p,
      stages: (p.stages || []).sort((a, b) => a.position - b.position)
    }));
    res.json(sorted);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { data, error } = await req.supabase.from('pipelines').insert(req.body).select().single();
    if (error) throw error;
    await audit({ userId: req.user.id, action: 'create', entity: 'pipelines', entityId: data.id });
    res.status(201).json(data);
  } catch (e) { next(e); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const { data, error } = await req.supabase.from('pipelines').update(req.body).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { error } = await req.supabase.from('pipelines').delete().eq('id', req.params.id);
    if (error) throw error;
    res.status(204).end();
  } catch (e) { next(e); }
});

// --- Etapas ---
router.post('/:pipelineId/stages', async (req, res, next) => {
  try {
    const { data, error } = await req.supabase
      .from('stages')
      .insert({ ...req.body, pipeline_id: req.params.pipelineId })
      .select().single();
    if (error) throw error;
    await audit({ userId: req.user.id, action: 'create', entity: 'stages', entityId: data.id });
    res.status(201).json(data);
  } catch (e) { next(e); }
});

router.patch('/stages/:stageId', async (req, res, next) => {
  try {
    const { data, error } = await req.supabase.from('stages').update(req.body).eq('id', req.params.stageId).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

router.delete('/stages/:stageId', async (req, res, next) => {
  try {
    const { error } = await req.supabase.from('stages').delete().eq('id', req.params.stageId);
    if (error) throw error;
    res.status(204).end();
  } catch (e) { next(e); }
});

export default router;
