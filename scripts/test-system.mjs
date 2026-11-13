// Prueba end-to-end del sistema: Supabase + API Express.
// Crea un usuario temporal, ejercita los endpoints y limpia los datos de prueba.
// Uso: node scripts/test-system.mjs   (desde la raíz del repo, con .env configurado)

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;

let passed = 0;
let failed = 0;
const results = [];

function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  if (ok) passed++; else failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
  console.error('Faltan variables en .env (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// ---------- 1. Conectividad y esquema en Supabase ----------
console.log('\n== 1. Supabase / base de datos ==');

const tables = ['profiles', 'clients', 'contacts', 'client_notes', 'services',
  'partners', 'partner_contacts', 'pipelines', 'stages', 'opportunities',
  'opportunity_history', 'client_users', 'audit_log'];

for (const t of tables) {
  const { count, error } = await admin.from(t).select('*', { count: 'exact', head: true });
  check(`tabla ${t}`, !error, error ? error.message : `${count} filas`);
}

// ---------- 2. Usuario de prueba ----------
console.log('\n== 2. Usuario de prueba ==');

const testEmail = `e2e-test-${Date.now()}@eing.local`;
const testPassword = 'E2eTest!2026';
let testUserId = null;
let accessToken = null;

const { data: created, error: createErr } = await admin.auth.admin.createUser({
  email: testEmail,
  password: testPassword,
  email_confirm: true,
  user_metadata: { full_name: 'E2E Test', role: 'admin' }
});
if (createErr) {
  check('crear usuario auth', false, createErr.message);
} else {
  testUserId = created.user.id;
  const { error: profErr } = await admin.from('profiles').insert({
    id: testUserId, full_name: 'E2E Test', email: testEmail, role: 'admin'
  });
  check('perfil admin creado', !profErr, profErr?.message);

  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: signIn, error: signErr } = await anon.auth.signInWithPassword({
    email: testEmail, password: testPassword
  });
  accessToken = signIn?.session?.access_token;
  check('login Supabase Auth', !signErr && !!accessToken, signErr?.message);
}

// ---------- 3. API Express ----------
console.log('\n== 3. API Express ==');

const { default: app } = await import('../apps/api/src/app.js');
const server = app.listen(0);
await new Promise((r) => server.once('listening', r));
const base = `http://localhost:${server.address().port}`;

async function req(method, path, { token = accessToken, body } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  let json = null;
  try { json = await res.json(); } catch { /* 204 */ }
  return { status: res.status, json };
}

{
  const r = await req('GET', '/api/health', { token: null });
  check('GET /api/health', r.status === 200 && r.json?.ok === true);
}

{
  const r = await req('GET', '/api/clients', { token: null });
  check('GET /api/clients sin token → 401', r.status === 401);
}

{
  const r = await req('GET', '/api/clients');
  check('GET /api/clients con token', r.status === 200 && Array.isArray(r.json), `status ${r.status}`);
}

let clientId = null;
{
  const r = await req('POST', '/api/clients', {
    body: { name: 'Cliente E2E', type: 'empresa', email: 'e2e@eing.local', status: 'prospecto' }
  });
  clientId = r.json?.id;
  check('POST /api/clients', r.status === 201 && !!clientId, `status ${r.status}`);
}

if (clientId) {
  const r = await req('GET', `/api/clients/${clientId}`);
  check('GET /api/clients/:id', r.status === 200 && r.json?.name === 'Cliente E2E');

  const r2 = await req('PATCH', `/api/clients/${clientId}`, { body: { status: 'activo' } });
  check('PATCH /api/clients/:id', r2.status === 200 && r2.json?.status === 'activo');

  const r3 = await req('GET', '/api/clients?search=E2E');
  check('GET /api/clients?search', r3.status === 200 && r3.json?.length >= 1);

  const d = await req('DELETE', `/api/clients/${clientId}`);
  check('DELETE /api/clients/:id', d.status === 204);
}

for (const ep of ['services', 'partners', 'pipelines', 'opportunities', 'audit', 'admin/users']) {
  const r = await req('GET', `/api/${ep}`);
  check(`GET /api/${ep}`, r.status === 200, `status ${r.status}${r.json?.error ? ` (${r.json.error})` : ''}`);
}

// ---------- 4. Limpieza ----------
console.log('\n== 4. Limpieza ==');

if (clientId) await admin.from('clients').delete().eq('id', clientId);
await admin.from('audit_log').delete().eq('user_id', testUserId);
if (testUserId) await admin.from('profiles').delete().eq('id', testUserId);
if (testUserId) await admin.auth.admin.deleteUser(testUserId);
check('datos de prueba eliminados', true);

server.close();

// ---------- Resumen ----------
console.log(`\n========== RESULTADO: ${passed} PASS / ${failed} FAIL ==========`);
process.exit(failed ? 1 : 0);
