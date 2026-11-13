-- ============================================================
-- Corporativo EING CRM - Esquema inicial (Fase 1)
-- Clientes, contactos, servicios, Partners y embudo comercial.
-- Ejecutar en el SQL Editor de Supabase.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- Perfiles de usuario (roles internos) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role text not null default 'comercial'
    check (role in ('admin','comercial','operaciones','soporte','contador','cliente')),
  partner_id uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Clientes ----------
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  type text not null default 'empresa' check (type in ('persona','empresa')),
  tax_id text,
  email text,
  phone text,
  address text,
  status text not null default 'activo' check (status in ('activo','inactivo','prospecto')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  role_title text,
  email text,
  phone text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  author_id uuid references public.profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

-- ---------- Catálogos ----------
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null default 'empresarial'
    check (category in ('tecnologia','inmobiliario','empresarial')),
  description text,
  base_cost numeric(14,2) default 0,
  currency text not null default 'MXN',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text,
  email text,
  phone text,
  tax_id text,
  commission_percent numeric(5,2) default 0,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.partner_contacts (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  created_at timestamptz not null default now()
);

-- ---------- Embudo comercial ----------
create table if not exists public.pipelines (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.stages (
  id uuid primary key default gen_random_uuid(),
  pipeline_id uuid not null references public.pipelines(id) on delete cascade,
  name text not null,
  position integer not null default 0,
  probability integer not null default 0 check (probability between 0 and 100),
  is_won_stage boolean not null default false,
  is_lost_stage boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  client_id uuid not null references public.clients(id),
  contact_id uuid references public.contacts(id),
  service_id uuid references public.services(id),
  partner_id uuid references public.partners(id),
  pipeline_id uuid not null references public.pipelines(id),
  stage_id uuid not null references public.stages(id),
  amount numeric(14,2) default 0,
  currency text not null default 'MXN',
  owner_id uuid references public.profiles(id),
  expected_close_date date,
  next_action text,
  next_action_at timestamptz,
  status text not null default 'open' check (status in ('open','won','lost','cancelled')),
  outcome_reason text,
  won_at timestamptz,
  lost_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_opportunities_pipeline on public.opportunities(pipeline_id, stage_id);
create index if not exists idx_opportunities_client on public.opportunities(client_id);
create index if not exists idx_contacts_client on public.contacts(client_id);

create table if not exists public.opportunity_history (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  from_stage_id uuid references public.stages(id),
  to_stage_id uuid references public.stages(id),
  changed_by uuid references public.profiles(id),
  note text,
  created_at timestamptz not null default now()
);

-- ---------- Portal de clientes (vínculo perfil <-> cliente) ----------
create table if not exists public.client_users (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade unique,
  created_at timestamptz not null default now()
);

-- ---------- Auditoría ----------
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  action text not null,
  entity text not null,
  entity_id uuid,
  detail jsonb,
  created_at timestamptz not null default now()
);

-- ---------- updated_at automático ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['clients','partners','opportunities'] loop
    execute format('drop trigger if exists trg_%I_updated_at on public.%I', t, t);
    execute format('create trigger trg_%I_updated_at before update on public.%I for each row execute function public.touch_updated_at()', t, t);
  end loop;
end $$;

-- ============================================================
-- Row Level Security
-- Regla base: staff interno (admin/comercial/operaciones/soporte/contador)
-- tiene acceso total; rol 'cliente' solo ve sus propios datos (portal).
-- ============================================================

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active and role <> 'cliente'
  );
$$;

create or replace function public.my_client_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select client_id from public.client_users where profile_id = auth.uid();
$$;

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.contacts enable row level security;
alter table public.client_notes enable row level security;
alter table public.services enable row level security;
alter table public.partners enable row level security;
alter table public.partner_contacts enable row level security;
alter table public.pipelines enable row level security;
alter table public.stages enable row level security;
alter table public.opportunities enable row level security;
alter table public.opportunity_history enable row level security;
alter table public.client_users enable row level security;
alter table public.audit_log enable row level security;

-- Catálogos y tablas internas: staff completo; clientes solo lectura de lo suyo.
do $$
declare t text;
begin
  foreach t in array array[
    'clients','contacts','client_notes','services','partners','partner_contacts',
    'pipelines','stages','opportunities','opportunity_history','audit_log','profiles'
  ] loop
    execute format('drop policy if exists staff_all on public.%I', t);
    execute format(
      'create policy staff_all on public.%I for all to authenticated using (public.is_staff()) with check (public.is_staff())', t);
  end loop;
end $$;

-- Clientes (portal): solo lectura de su propia información.
create policy client_read_clients on public.clients
  for select to authenticated using (id in (select public.my_client_ids()));
create policy client_read_contacts on public.contacts
  for select to authenticated using (client_id in (select public.my_client_ids()));
create policy client_read_services on public.services
  for select to authenticated using (true);
create policy client_read_partners on public.partners
  for select to authenticated using (true);
create policy client_read_opportunities on public.opportunities
  for select to authenticated using (client_id in (select public.my_client_ids()));
create policy client_read_own_profile on public.profiles
  for select to authenticated using (id = auth.uid());
create policy client_read_client_users on public.client_users
  for select to authenticated using (profile_id = auth.uid());
