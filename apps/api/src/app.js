import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';
import { authRequired } from './middleware/auth.js';
import { apiLimiter, authLimiter } from './middleware/rateLimit.js';
import clientsRouter from './routes/clients.js';
import contactsRouter from './routes/contacts.js';
import servicesRouter from './routes/services.js';
import partnersRouter from './routes/partners.js';
import pipelinesRouter from './routes/pipelines.js';
import opportunitiesRouter from './routes/opportunities.js';
import auditRouter from './routes/audit.js';
import adminRouter from './routes/admin.js';
import authPublicRouter from './routes/auth.js';

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '1mb' }));

const corsOrigins = (process.env.CORS_ORIGIN || '*').split(',').map((s) => s.trim());
const isLoopback = (origin) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || '');
const corsOrigin =
  process.env.NODE_ENV === 'production'
    ? corsOrigins
    : (origin, cb) => cb(null, corsOrigins.includes(origin) || isLoopback(origin) || !origin);
app.use(cors({ origin: corsOrigin, credentials: true }));

// Balance de cargas: límite global + límite estricto en endpoints sensibles.
app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

// Clientes Supabase: anon para validar JWT del usuario, service_role solo en servidor.
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'eing-api' }));

// Registro/login públicos: sin JWT, antes del middleware de autenticación.
app.use('/api/auth', authPublicRouter);

// Todo lo demás requiere sesión de Supabase Auth.
app.use('/api', authRequired);
app.use('/api/clients', clientsRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/services', servicesRouter);
app.use('/api/partners', partnersRouter);
app.use('/api/pipelines', pipelinesRouter);
app.use('/api/opportunities', opportunitiesRouter);
app.use('/api/audit', auditRouter);
app.use('/api/admin', adminRouter);

app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Error interno' });
});

export default app;
