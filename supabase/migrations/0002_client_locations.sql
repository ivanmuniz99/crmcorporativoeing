-- ============================================================
-- Ubicación geográfica de clientes (oficinas)
-- lat/lng en grados decimales (WGS84).
-- ============================================================

alter table public.clients
  add column if not exists lat numeric(10,7),
  add column if not exists lng numeric(10,7);

-- Validación aproximada de rangos válidos.
alter table public.clients
  drop constraint if exists clients_lat_range,
  add constraint clients_lat_range check (lat is null or lat between -90 and 90),
  drop constraint if exists clients_lng_range,
  add constraint clients_lng_range check (lng is null or lng between -180 and 180);
