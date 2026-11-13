# Corporativo EING · CRM

CRM interno para Corporativo EING con Service Desk y portal de clientes.
Monorepo publicado en Vercel: **frontend SvelteKit (Svelte 5)** + **backend Node.js/Express** + **Supabase** (Postgres, Auth, Storage).

## Estructura

```
apps/
  web/    → SvelteKit + Svelte 5 (runas) + adapter-vercel
  api/    → Express + Supabase JS (JWT por request, RLS)
supabase/
  migrations/0001_schema_inicial.sql → tablas, RLS y triggers
  seed.sql                            → servicios y embudos por defecto
```

## Fases

- **Fase 1 (actual):** clientes, contactos, servicios, Partners y embudo comercial tipo Pipedrive (tarjetas arrastrables, múltiples embudos, etapas editables, resultados ganada/perdida/cancelada con motivo, historial de movimientos y auditoría). Mapa de oficinas con Leaflet: asignación de ubicación por clic, geocodificación de direcciones y coordenadas manuales (requiere ejecutar `supabase/migrations/0002_client_locations.sql`).
- Fases siguientes: expedientes de ejecución, agenda/cotizaciones/pagos/comisiones, portal de clientes, Service Desk con tickets/folio/conversaciones, indicadores con filtros.

## Puesta en marcha local

1. `npm install`
2. Crear proyecto en [Supabase](https://supabase.com) y ejecutar en el SQL Editor:
   - `supabase/migrations/0001_schema_inicial.sql`
   - `supabase/migrations/0002_client_locations.sql`
   - `supabase/seed.sql`
3. Crear usuarios en *Authentication → Users* (o desde la app, rol admin → Usuarios). Cada usuario necesita su fila en `public.profiles`.
4. Configurar `.env` (ver `.env.example`):
   - `apps/api/.env` → `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `API_PORT=3001`, `CORS_ORIGIN`
   - `apps/web/.env` → `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `PUBLIC_API_URL=http://localhost:3001`
5. `npm run dev:api` (puerto 3001) y `npm run dev:web` (puerto 5173)

## Seguridad

- Las contraseñas las guarda **Supabase Auth** con hash (bcrypt); el backend nunca las ve.
- El frontend solo usa la `anon key` (pública por diseño). La `service_role` vive únicamente en el backend y **nunca** se expone al cliente.
- Todas las rutas `/api/*` exigen JWT válido de Supabase; las consultas corren con el token del usuario para que apliquen las políticas RLS por rol.
- **Balance de cargas:** `express-rate-limit` global (300 req/min por IP) + límite estricto en auth (20 req/min), headers `RateLimit-*` estándar, `helmet` y CORS restringido por `CORS_ORIGIN`.
- Toda escritura relevante se registra en `audit_log`.
- `.env` está en `.gitignore`; nunca subir secretos al repo.

## Deploy en Vercel (monorepo)

Dos proyectos en Vercel apuntando al mismo repo:

| Proyecto | Root Directory | Framework | Variables |
|---|---|---|---|
| `eing-web` | `apps/web` | SvelteKit | `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `PUBLIC_API_URL` (URL del proyecto api) |
| `eing-api` | `apps/api` | Express | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CORS_ORIGIN` (URL del proyecto web) |

- Web: adapter `@sveltejs/adapter-vercel` (configurado en `apps/web/vite.config.ts`).
- API: `apps/api/index.js` exporta la app Express; `vercel.json` reescribe todo a ese handler. `src/server.js` solo hace `listen` fuera de Vercel.
- Tras el primer deploy, actualizar `CORS_ORIGIN` (web) y `PUBLIC_API_URL` (api ↔ web) con las URLs reales y redesplegar.

## Notas

- Las mutaciones de catálogo/embudo están pensadas para roles internos; el rol `cliente` queda limitado por RLS a sus propios datos (portal, fase posterior).
- Para crear el primer usuario admin: regístrate en Supabase Auth y luego inserta/actualiza su fila en `profiles` con `role='admin'`.
