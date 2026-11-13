import { Router } from 'express';

const router = Router();

// Bitácora de cambios (registro de auditoría).
router.get('/', async (req, res, next) => {
  try {
    let q = req.supabase
      .from('audit_log')
      .select('*, profile:profiles!audit_log_user_id_fkey(full_name,email)')
      .order('created_at', { ascending: false })
      .limit(200);
    if (req.query.entity) q = q.eq('entity', req.query.entity);
    if (req.query.user_id) q = q.eq('user_id', req.query.user_id);
    const { data, error } = await q;
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

export default router;
