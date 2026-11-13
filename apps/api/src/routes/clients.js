import { Router } from 'express';
import { audit } from '../lib/audit.js';
import { pick } from '../lib/pick.js';

const router = Router();

const CLIENT_FIELDS = ['name', 'legal_name', 'type', 'tax_id', 'email', 'phone', 'address', 'status', 'notes', 'lat', 'lng'];

router.get('/', async (req, res, next) => {
  try {
    let q = req.supabase
      .from('clients')
      .select('*, contacts(*)')
      .order('name');
    const { search } = req.query;
    if (search) q = q.or(`name.ilike.%${search}%,legal_name.ilike.%${search}%,email.ilike.%${search}%,tax_id.ilike.%${search}%`);
    const { data, error } = await q;
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { data, error } = await req.supabase
      .from('clients')
      .select('*, contacts(*), notes:client_notes(*), opportunities(id,title,amount,status,service:services(name))')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { data, error } = await req.supabase.from('clients').insert(pick(req.body, CLIENT_FIELDS)).select().single();
    if (error) throw error;
    await audit({ userId: req.user.id, action: 'create', entity: 'clients', entityId: data.id, detail: data });
    res.status(201).json(data);
  } catch (e) { next(e); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const body = pick(req.body, CLIENT_FIELDS);
    const { data, error } = await req.supabase
      .from('clients').update(body).eq('id', req.params.id).select().single();
    if (error) throw error;
    await audit({ userId: req.user.id, action: 'update', entity: 'clients', entityId: data.id, detail: body });
    res.json(data);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { error } = await req.supabase.from('clients').delete().eq('id', req.params.id);
    if (error) throw error;
    await audit({ userId: req.user.id, action: 'delete', entity: 'clients', entityId: req.params.id });
    res.status(204).end();
  } catch (e) { next(e); }
});

export default router;
