-- Tattoo Art Salas Carlos
-- Supabase / PostgreSQL schema for persistent reservations.
-- Run this file once in Supabase SQL Editor.

create table if not exists public.appointments (
  id uuid primary key,
  code text not null unique,
  client_token text not null unique,
  status text not null default 'Pendiente de revision',
  booking jsonb not null default '{}'::jsonb,
  references_data jsonb not null default '[]'::jsonb,
  proposal jsonb,
  whatsapp_message text not null default '',
  payment_proof jsonb,
  consent jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists appointments_status_idx on public.appointments(status);
create index if not exists appointments_created_at_idx on public.appointments(created_at desc);

-- The Node server uses the Supabase service-role key, so database access is
-- intentionally kept server-side. RLS is enabled as a defense-in-depth measure.
alter table public.appointments enable row level security;

-- Do not create public policies. The browser must never access this table directly.

create or replace function public.set_appointments_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists appointments_updated_at on public.appointments;
create trigger appointments_updated_at
before update on public.appointments
for each row execute function public.set_appointments_updated_at();

-- Optional storage bucket for future persistent private uploads.
-- The current deployment can continue using its existing private-file mechanism
-- until file storage migration is completed.
insert into storage.buckets (id, name, public)
values ('tattoo-private', 'tattoo-private', false)
on conflict (id) do nothing;
