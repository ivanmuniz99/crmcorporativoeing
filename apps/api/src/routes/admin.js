import { Router } from 'express';
import { supabaseAdmin } from '../app.js';
import { audit } from '../lib/audit.js';

const router = Router();

function requireAdmin(req, res, next) {
  // El rol viene del perfil cargado por el frontend vía claim; lo verificamos en BD.
  supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', req.user.id)
    .single()
    .then(({ data, error }) => {
      if (error || data?.role !== 'admin') return res.status(403).json({ error: 'Se requiere rol administrador' });
      next();
    });
}

// Crear usuario de Supabase Auth + perfil. La contraseña la hashea Supabase (bcrypt).
router.post('/users', requireAdmin, async (req, res, next) => {
  try {
    const { email, password, full_name, role = 'comercial', partner_id = null } = req.body;
    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'email, password y full_name son obligatorios' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    const { data: created, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role }
    });
    if (authError) throw authError;

    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: created.user.id,
      full_name,
      email,
      role,
      partner_id
    });
    if (profileError) throw profileError;

    await audit({ userId: req.user.id, action: 'create_user', entity: 'profiles', entityId: created.user.id, detail: { email, role } });
    res.status(201).json({ id: created.user.id });
  } catch (e) { next(e); }
});

// Listar perfiles de staff.
router.get('/users', requireAdmin, async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin.from('profiles').select('*').order('full_name');
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

export default router;
