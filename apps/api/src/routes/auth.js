import { Router } from 'express';
import { supabaseAdmin } from '../app.js';
import { audit } from '../lib/audit.js';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Registro público (sin JWT): crea usuario en Supabase Auth + fila en profiles.
 * Regla de negocio: el PRIMER usuario registrado queda como 'admin' (superadmin);
 * cualquier registro posterior queda como 'comercial'.
 */
router.post('/register', async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const full_name = String(req.body?.full_name || '').trim();

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios' });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'El correo no tiene un formato válido' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    // ¿Ya existe algún perfil? El primero en llegar se vuelve admin.
    const { count, error: countError } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true });
    if (countError) throw countError;
    const role = (count ?? 0) === 0 ? 'admin' : 'comercial';

    const { data: created, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role }
    });
    if (authError) {
      const msg = /already|exists|registered/i.test(authError.message || '')
        ? 'Ya existe una cuenta con ese correo'
        : authError.message;
      return res.status(authError.status || 400).json({ error: msg });
    }

    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: created.user.id,
      full_name,
      email,
      role
    });
    if (profileError) {
      // ROLLBACK: borra el usuario de Auth para no dejar huérfanos sin perfil.
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw profileError;
    }

    await audit({
      userId: created.user.id,
      action: 'register',
      entity: 'profiles',
      entityId: created.user.id,
      detail: { email, role }
    });

    res.status(201).json({ id: created.user.id, email, role });
  } catch (e) { next(e); }
});

export default router;
