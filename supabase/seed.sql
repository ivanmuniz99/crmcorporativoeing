-- Datos iniciales: catálogo de servicios y embudo comercial por defecto.
-- Los usuarios se crean desde Supabase Auth (Authentication > Users) o con el
-- endpoint de admin; al registrarse, crear su fila en public.profiles.
--
-- IMPORTANTE: ejecutar primero supabase/migrations/0001_schema_inicial.sql.

-- Guardia: falla con mensaje claro si el esquema aún no existe.
do $$
begin
  if to_regclass('public.services') is null
     or to_regclass('public.pipelines') is null
     or to_regclass('public.stages') is null then
    raise exception 'El esquema no existe. Ejecuta primero supabase/migrations/0001_schema_inicial.sql';
  end if;
end $$;

insert into public.services (name, category, description, base_cost) values
  ('Consultoría tecnológica', 'tecnologia', 'Diagnóstico y estrategia de TI', 0),
  ('Implementación de CRM', 'tecnologia', 'Despliegue y configuración del CRM EING', 0),
  ('Soporte y mesa de ayuda', 'tecnologia', 'Soporte técnico mensual', 0),
  ('Desarrollo web / app', 'tecnologia', 'Software a la medida', 0),
  ('Administración de propiedades', 'inmobiliario', 'Gestión de inmuebles en renta/venta', 0),
  ('Brokerage inmobiliario', 'inmobiliario', 'Intermediación de compraventa', 0),
  ('Gestoría empresarial', 'empresarial', 'Constitución y trámites societarios', 0),
  ('Facturación y contabilidad', 'empresarial', 'Servicios contables y CFDI', 0)
on conflict (name) do nothing;

insert into public.pipelines (name, description) values
  ('Ventas directas', 'Oportunidades atendidas directamente por EING'),
  ('Ventas con Partner', 'Oportunidades operadas mediante Partners')
on conflict (name) do nothing;

-- Etapas del pipeline por defecto (ajustar ids según el insert anterior).
do $$
declare
  pid uuid;
begin
  select id into pid from public.pipelines where name = 'Ventas directas' limit 1;
  if pid is not null and not exists (select 1 from public.stages where pipeline_id = pid) then
    insert into public.stages (pipeline_id, name, position, probability, is_won_stage, is_lost_stage) values
      (pid, 'Contacto inicial',        1, 10,  false, false),
      (pid, 'Calificación',            2, 25,  false, false),
      (pid, 'Propuesta enviada',       3, 50,  false, false),
      (pid, 'Negociación',              4, 75,  false, false),
      (pid, 'Cierre ganado',            5, 100, true,  false),
      (pid, 'Cierre perdido',           6, 0,   false, true);
  end if;

  select id into pid from public.pipelines where name = 'Ventas con Partner' limit 1;
  if pid is not null and not exists (select 1 from public.stages where pipeline_id = pid) then
    insert into public.stages (pipeline_id, name, position, probability, is_won_stage, is_lost_stage) values
      (pid, 'Prospección Partner',     1, 10,  false, false),
      (pid, 'Presentación al cliente', 2, 30,  false, false),
      (pid, 'Propuesta conjunta',      3, 55,  false, false),
      (pid, 'Negociación',              4, 75,  false, false),
      (pid, 'Cierre ganado',            5, 100, true,  false),
      (pid, 'Cierre perdido',           6, 0,   false, true);
  end if;
end $$;
