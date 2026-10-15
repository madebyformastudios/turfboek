-- Turfen: werkregistratie meterwissels (multi-user)
-- Draait naast de Boekhouding-tabellen in hetzelfde project, daarom de prefix turf_.

-- Tarieven (gedeeld voor iedereen; alleen admin/SQL wijzigt deze)
create table public.turf_activity_types (
  code        integer primary key,
  name        text    not null,
  description text,
  unit        text    not null check (unit in ('stuks', 'uur', 'bedrag')),
  price       numeric(10,3) not null default 0,
  sort        integer not null default 0,
  active      boolean not null default true
);

insert into public.turf_activity_types (code, name, description, unit, price, sort) values
  (10,  'Combi-plaatsing: E-meter', 'Verwisselen E-meter bij combi-wisseling', 'stuks', 32.300, 10),
  (20,  'Combi-plaatsing: G-meter', 'Verwisselen G-meter bij combi-wisseling', 'stuks', 10.098, 20),
  (30,  'Solo-plaatsing: E-meter',  'Uitsluitend E-meter (bv. geen gas aanwezig)', 'stuks', 32.300, 30),
  (40,  'Solo-plaatsing: G-meter',  'Uitsluitend G-meter (bv. E-meter eerder gewisseld)', 'stuks', 27.460, 40),
  (50,  'Niet uitvoerbaar',         'Niet uitvoerbare opdracht per adres (bv. pand onbewoond/gesloopt)', 'stuks', 15.300, 50),
  (60,  'TNU - asbest',             'Verdenking asbest in meterkast of meters', 'stuks', 19.180, 60),
  (70,  'TNU - geen toegang meterkast', 'Geen toegang tot de meterkast', 'stuks', 19.180, 70),
  (80,  'Regie-uur VOP-m',          'Incl. gereedschap, vervoer, opleiding en tablet', 'uur', 42.500, 80),
  (90,  'Regie-uur VP',             'Incl. gereedschap, vervoer, opleiding en tablet', 'uur', 46.750, 90),
  (100, 'Reis / transportkosten',   'Parkeren, vergunningen, emissievrije zones', 'bedrag', 0, 100),
  (0,   'Niet uitgevoerd (€0)',     'Klant niet thuis, nieuwe afspraak, geen medewerking', 'stuks', 0, 5);

alter table public.turf_activity_types enable row level security;
create policy "activity_types leesbaar voor ingelogde gebruikers"
  on public.turf_activity_types for select to authenticated using (true);

-- Profiel per gebruiker
create table public.turf_profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  display_name      text,
  period_end_dow    smallint not null default 4 check (period_end_dow between 0 and 6), -- 4 = donderdag
  created_at        timestamptz not null default now()
);

alter table public.turf_profiles enable row level security;
create policy "eigen profiel lezen"   on public.turf_profiles for select to authenticated using ((select auth.uid()) = id);
create policy "eigen profiel wijzigen" on public.turf_profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create function public.turf_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.turf_profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

revoke execute on function public.turf_handle_new_user() from public, anon, authenticated;

create trigger turf_on_auth_user_created
  after insert on auth.users
  for each row execute function public.turf_handle_new_user();

-- Geturfde werkzaamheden
create table public.turf_entries (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  work_date     date not null,
  activity_code integer not null references public.turf_activity_types (code),
  quantity      numeric(8,2)  not null default 1 check (quantity > 0),
  unit_price    numeric(10,3) not null,           -- prijs vastgelegd op moment van turven
  amount        numeric(12,3) generated always as (quantity * unit_price) stored,
  reason        text,
  address       text,                              -- optioneel, bv. 4337TR-340
  note          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index turf_entries_user_date_idx on public.turf_entries (user_id, work_date);
create index turf_entries_activity_code_idx on public.turf_entries (activity_code);

alter table public.turf_entries enable row level security;
create policy "eigen regels lezen"     on public.turf_entries for select to authenticated using ((select auth.uid()) = user_id);
create policy "eigen regels toevoegen" on public.turf_entries for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "eigen regels wijzigen"  on public.turf_entries for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "eigen regels verwijderen" on public.turf_entries for delete to authenticated using ((select auth.uid()) = user_id);

create function public.turf_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger turf_entries_touch before update on public.turf_entries
  for each row execute function public.turf_touch_updated_at();

revoke execute on function public.turf_touch_updated_at() from public, anon, authenticated;

-- Bestaande gebruikers (aangemaakt via Boekhouding) ook een turf-profiel geven
insert into public.turf_profiles (id, display_name)
select id, coalesce(raw_user_meta_data ->> 'display_name', split_part(email, '@', 1)) from auth.users
on conflict (id) do nothing;
