import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabase = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

/**
 * Middleware: exige un JWT válido de Supabase Auth.
 * Carga el perfil del usuario en req.user y propaga el token
 * en req.supabaseClient para respetar RLS con el rol del usuario.
 */
export async function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Token de autenticación requerido' });

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return res.status(401).json({ error: 'Sesión inválida o expirada' });

    req.user = data.user;

    // Cliente con el JWT del usuario => las políticas RLS se aplican por rol.
    req.supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false }
    });
    next();
  } catch (err) {
    next(err);
  }
}
