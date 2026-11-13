import { supabaseAdmin } from '../app.js';

/** Registra un cambio en audit_log (best-effort, no bloquea la operación). */
export async function audit({ userId, action, entity, entityId, detail = null }) {
  try {
    await supabaseAdmin.from('audit_log').insert({
      user_id: userId,
      action,
      entity,
      entity_id: entityId,
      detail
    });
  } catch (err) {
    console.error('audit_log insert failed', err);
  }
}
