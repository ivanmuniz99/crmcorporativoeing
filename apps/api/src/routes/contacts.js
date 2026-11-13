import { Router } from 'express';
import { audit } from '../lib/audit.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    let q = req.supabase.from('contacts').select('*, clients(name)').order('name');
    if (req.query.client_id) q = q.eq('client_id', req.query.client_id);
    const { data, error } = await q;
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { data, error } = await req.supabase.from('contacts').insert(req.body).select().single();
    if (error) throw error;
    await audit({ userId: req.user.id, action: 'create', entity: 'contacts', entityId: data.id });
    res.status(201).json(data);
  } catch (e) { next(e); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const { data, error } = await req.supabase.from('contacts').update(req.body).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { error } = await req.supabase.from('contacts').delete().eq('id', req.params.id);
    if (error) throw error;
    res.status(204).end();
  } catch (e) { next(e); }
});

export default router;
