import { Router } from 'express';
import { audit } from '../lib/audit.js';
import { pick } from '../lib/pick.js';

const router = Router();

const PARTNER_FIELDS = ['name', 'type', 'email', 'phone', 'tax_id', 'commission_percent', 'notes', 'is_active'];

router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await req.supabase
      .from('partners')
      .select('*, partner_contacts(*)')
      .order('name');
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { data, error } = await req.supabase
      .from('partners')
      .select('*, partner_contacts(*), opportunities(id,title,amount,status)')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { data, error } = await req.supabase.from('partners').insert(pick(req.body, PARTNER_FIELDS)).select().single();
    if (error) throw error;
    await audit({ userId: req.user.id, action: 'create', entity: 'partners', entityId: data.id });
    res.status(201).json(data);
  } catch (e) { next(e); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const body = pick(req.body, PARTNER_FIELDS);
    const { data, error } = await req.supabase.from('partners').update(body).eq('id', req.params.id).select().single();
    if (error) throw error;
    await audit({ userId: req.user.id, action: 'update', entity: 'partners', entityId: data.id, detail: body });
    res.json(data);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { error } = await req.supabase.from('partners').delete().eq('id', req.params.id);
    if (error) throw error;
    res.status(204).end();
  } catch (e) { next(e); }
});

export default router;
