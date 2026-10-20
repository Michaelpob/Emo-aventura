-- ============================================================================
-- EMO-AVENTURA · esquema del panel de administracion
--
-- Pegalo entero en Supabase: proyecto -> SQL Editor -> New query -> Run.
-- Se puede volver a ejecutar sin miedo: todo es "if not exists" o "replace".
--
-- Que guarda: eventos ANONIMOS de uso (que isla, que evento, cuando, cuanto
-- duro y tipo de dispositivo). Ningun dato personal del jugador.
--
-- Quien puede hacer que:
--   * rol anon (los visitantes del juego) -> SOLO insertar eventos.
--   * el administrador (maicolpoveda115@gmail.com) -> leer estadisticas
--     agregadas a traves de funciones, nunca la tabla directamente.
-- ============================================================================

-- ---------------------------------------------------------------- tabla ----
create table if not exists public.island_events (
  id           bigint generated always as identity primary key,
  created_at   timestamptz  not null default now(),
  island_id    text         not null
                 check (island_id in ('sadness','anger','fear','disgust','frustration','calm')),
  event_type   text         not null
                 check (event_type in ('island_view','game_start','game_complete','game_exit')),
  minigame     text         null check (minigame is null or char_length(minigame) <= 60),
  session_id   uuid         not null,
  duration_ms  integer      null check (duration_ms is null or (duration_ms >= 0 and duration_ms <= 14400000)),
  device       text         null check (device is null or device in ('mobile','tablet','desktop'))
);

comment on table public.island_events is
  'Eventos anonimos de uso de las islas. Sin datos personales.';

create index if not exists island_events_created_at_idx
  on public.island_events (created_at desc);
create index if not exists island_events_island_event_idx
  on public.island_events (island_id, event_type);

-- ------------------------------------------------------------ administrador --
create table if not exists public.admins (
  email text primary key
);

insert into public.admins (email)
values ('maicolpoveda115@gmail.com')
on conflict (email) do nothing;

-- ¿quien pregunta es el administrador? (compara el correo del token con la tabla)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.admins a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- --------------------------------------------------------------- seguridad --
alter table public.island_events enable row level security;
alter table public.admins        enable row level security;

-- los visitantes SOLO pueden insertar (no leer, no editar, no borrar)
drop policy if exists "anon inserta eventos" on public.island_events;
create policy "anon inserta eventos"
  on public.island_events
  for insert
  to anon, authenticated
  with check (true);

-- la lectura directa de la tabla queda reservada al administrador
drop policy if exists "admin lee eventos" on public.island_events;
create policy "admin lee eventos"
  on public.island_events
  for select
  to authenticated
  using (public.is_admin());

-- la lista de administradores solo la ve el administrador
drop policy if exists "admin lee admins" on public.admins;
create policy "admin lee admins"
  on public.admins
  for select
  to authenticated
  using (public.is_admin());

-- ============================================================================
-- Funciones del panel. Todas:
--   * comprueban is_admin() y, si no, lanzan error;
--   * reciben el periodo (p_from, p_to);
--   * agrupan en la zona horaria America/Bogota.
-- ============================================================================

-- 1) Resumen general -------------------------------------------------------
create or replace function public.admin_summary(p_from timestamptz, p_to timestamptz)
returns table (
  visitas            bigint,
  sesiones_unicas    bigint,
  partidas_iniciadas bigint,
  partidas_completas bigint,
  tasa_finalizacion  numeric,
  duracion_promedio  numeric
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Acceso no autorizado';
  end if;

  return query
  with e as (
    select * from public.island_events
    where created_at >= p_from and created_at < p_to
  )
  select
    count(*) filter (where event_type = 'island_view')::bigint,
    count(distinct session_id)::bigint,
    count(*) filter (where event_type = 'game_start')::bigint,
    count(*) filter (where event_type = 'game_complete')::bigint,
    case when count(*) filter (where event_type = 'game_start') = 0 then 0
         else round(100.0 * count(*) filter (where event_type = 'game_complete')
                          / count(*) filter (where event_type = 'game_start'), 1)
    end,
    coalesce(round(avg(duration_ms) filter (where event_type in ('game_complete','game_exit')), 0), 0)
  from e;
end;
$$;

-- 2) Estadisticas por isla -------------------------------------------------
create or replace function public.admin_island_stats(p_from timestamptz, p_to timestamptz)
returns table (
  island_id          text,
  visitas            bigint,
  sesiones_unicas    bigint,
  partidas_iniciadas bigint,
  partidas_completas bigint,
  tasa_finalizacion  numeric,
  duracion_promedio  numeric,
  ultima_visita      timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Acceso no autorizado';
  end if;

  return query
  select
    i.island_id,
    count(*) filter (where e.event_type = 'island_view')::bigint,
    count(distinct e.session_id)::bigint,
    count(*) filter (where e.event_type = 'game_start')::bigint,
    count(*) filter (where e.event_type = 'game_complete')::bigint,
    case when count(*) filter (where e.event_type = 'game_start') = 0 then 0
         else round(100.0 * count(*) filter (where e.event_type = 'game_complete')
                          / count(*) filter (where e.event_type = 'game_start'), 1)
    end,
    coalesce(round(avg(e.duration_ms) filter (where e.event_type in ('game_complete','game_exit')), 0), 0),
    max(e.created_at) filter (where e.event_type = 'island_view')
  from (values ('sadness'),('anger'),('fear'),('disgust'),('frustration'),('calm')) as i(island_id)
  left join public.island_events e
    on e.island_id = i.island_id
   and e.created_at >= p_from and e.created_at < p_to
  group by i.island_id;
end;
$$;

-- 3) Visitas por dia y por isla -------------------------------------------
create or replace function public.admin_daily_visits(p_from timestamptz, p_to timestamptz)
returns table (dia date, island_id text, visitas bigint)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Acceso no autorizado';
  end if;

  -- el alias `e` es obligatorio: sin el, `island_id` es ambiguo entre la
  -- columna de la tabla y la columna de salida de la funcion (error 42702)
  return query
  select
    (e.created_at at time zone 'America/Bogota')::date as dia,
    e.island_id,
    count(*)::bigint
  from public.island_events e
  where e.created_at >= p_from and e.created_at < p_to
    and e.event_type = 'island_view'
  group by 1, 2
  order by 1, 2;
end;
$$;

-- 4) Visitas por hora del dia (0-23) --------------------------------------
create or replace function public.admin_hourly_visits(p_from timestamptz, p_to timestamptz)
returns table (hora integer, visitas bigint)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Acceso no autorizado';
  end if;

  return query
  select
    extract(hour from (created_at at time zone 'America/Bogota'))::integer as hora,
    count(*)::bigint
  from public.island_events
  where created_at >= p_from and created_at < p_to
    and event_type = 'island_view'
  group by 1
  order by 1;
end;
$$;

-- 5) Tipos de dispositivo --------------------------------------------------
create or replace function public.admin_devices(p_from timestamptz, p_to timestamptz)
returns table (device text, sesiones bigint, eventos bigint)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Acceso no autorizado';
  end if;

  return query
  select
    coalesce(e.device, 'desktop') as device,
    count(distinct e.session_id)::bigint,
    count(*)::bigint
  from public.island_events e
  where e.created_at >= p_from and e.created_at < p_to
  group by 1
  order by 2 desc;
end;
$$;

-- ------------------------------------------------------------- permisos ----
revoke all on function public.admin_summary(timestamptz, timestamptz)       from public, anon;
revoke all on function public.admin_island_stats(timestamptz, timestamptz)  from public, anon;
revoke all on function public.admin_daily_visits(timestamptz, timestamptz)  from public, anon;
revoke all on function public.admin_hourly_visits(timestamptz, timestamptz) from public, anon;
revoke all on function public.admin_devices(timestamptz, timestamptz)       from public, anon;

grant execute on function public.admin_summary(timestamptz, timestamptz)       to authenticated;
grant execute on function public.admin_island_stats(timestamptz, timestamptz)  to authenticated;
grant execute on function public.admin_daily_visits(timestamptz, timestamptz)  to authenticated;
grant execute on function public.admin_hourly_visits(timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_devices(timestamptz, timestamptz)       to authenticated;

-- El rol anon solo necesita poder insertar en la tabla de eventos
grant insert on public.island_events to anon, authenticated;
revoke select, update, delete on public.island_events from anon;
