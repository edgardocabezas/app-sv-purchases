-- Anexo Compras MVP schema + RLS
-- Apply via Supabase SQL editor or `supabase db push`.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Workspaces
-- ---------------------------------------------------------------------------
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workspaces enable row level security;

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

alter table public.workspace_members enable row level security;

create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_admin(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin')
  );
$$;

create policy "workspaces_select_member_or_creator"
  on public.workspaces for select
  using (
    public.is_workspace_member(id)
    or auth.uid() = created_by
  );

create policy "workspaces_insert_authenticated"
  on public.workspaces for insert
  with check (auth.uid() = created_by);

create policy "workspaces_update_admin"
  on public.workspaces for update
  using (public.is_workspace_admin(id))
  with check (public.is_workspace_admin(id));

-- Atomic workspace + owner membership (avoids RLS race on first member insert)
create or replace function public.create_workspace_with_owner(p_name text)
returns public.workspaces
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace public.workspaces;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.workspaces (name, created_by)
  values (p_name, auth.uid())
  returning * into v_workspace;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_workspace.id, auth.uid(), 'owner');

  return v_workspace;
end;
$$;

grant execute on function public.create_workspace_with_owner(text) to authenticated;

create policy "workspace_members_select_member"
  on public.workspace_members for select
  using (public.is_workspace_member(workspace_id));

create policy "workspace_members_insert_admin_or_creator"
  on public.workspace_members for insert
  with check (
    public.is_workspace_admin(workspace_id)
    or (
      user_id = auth.uid()
      and role = 'owner'
      and exists (
        select 1 from public.workspaces w
        where w.id = workspace_id and w.created_by = auth.uid()
      )
    )
  );

create policy "workspace_members_delete_admin"
  on public.workspace_members for delete
  using (public.is_workspace_admin(workspace_id));

-- ---------------------------------------------------------------------------
-- Companies (belong to a workspace)
-- ---------------------------------------------------------------------------
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  nit text,
  nrc text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists companies_workspace_id_idx on public.companies (workspace_id);

alter table public.companies enable row level security;

create policy "companies_select_member"
  on public.companies for select
  using (public.is_workspace_member(workspace_id));

create policy "companies_insert_member"
  on public.companies for insert
  with check (public.is_workspace_member(workspace_id));

create policy "companies_update_member"
  on public.companies for update
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "companies_delete_admin"
  on public.companies for delete
  using (public.is_workspace_admin(workspace_id));

-- ---------------------------------------------------------------------------
-- DTE documents
-- ---------------------------------------------------------------------------
create table if not exists public.dte_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  -- Any parseable DTE tipo (01/03/05/06/07 and unexpected); CSV still filters 03/05/06.
  tipo_dte text not null check (tipo_dte ~ '^[0-9A-Za-z]{1,4}$'),
  codigo_generacion text not null,
  fec_emi date not null,
  emisor_nit text,
  emisor_nrc text,
  emisor_nombre text,
  total_gravada numeric(14, 2) not null default 0,
  iva numeric(14, 2) not null default 0,
  fovial numeric(14, 2) not null default 0,
  cotrans numeric(14, 2) not null default 0,
  total_con_iva numeric(14, 2) not null default 0,
  exento numeric(14, 2) not null default 0,
  raw_json jsonb not null,
  source_filename text,
  -- export classification (Q–T); U is always 3 at CSV build time
  tipo_operacion text check (tipo_operacion is null or tipo_operacion in ('0', '1', '2', '3', '4', '9')),
  clasificacion text check (clasificacion is null or clasificacion in ('0', '1', '2', '9')),
  sector text check (sector is null or sector in ('0', '1', '2', '3', '4', '9')),
  tipo_costo_gasto text check (tipo_costo_gasto is null or tipo_costo_gasto in ('0', '1', '2', '3', '4', '5', '6', '7', '8', '9')),
  period_year integer,
  period_month integer check (period_month is null or (period_month between 1 and 12)),
  exported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, codigo_generacion)
);

create index if not exists dte_documents_company_id_idx on public.dte_documents (company_id);
create index if not exists dte_documents_company_period_idx
  on public.dte_documents (company_id, period_year, period_month);
create index if not exists dte_documents_fec_emi_idx on public.dte_documents (fec_emi);

alter table public.dte_documents enable row level security;

create or replace function public.company_workspace_id(p_company_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.workspace_id from public.companies c where c.id = p_company_id;
$$;

create policy "dte_select_member"
  on public.dte_documents for select
  using (public.is_workspace_member(public.company_workspace_id(company_id)));

create policy "dte_insert_member"
  on public.dte_documents for insert
  with check (public.is_workspace_member(public.company_workspace_id(company_id)));

create policy "dte_update_member"
  on public.dte_documents for update
  using (public.is_workspace_member(public.company_workspace_id(company_id)))
  with check (public.is_workspace_member(public.company_workspace_id(company_id)));

create policy "dte_delete_member"
  on public.dte_documents for delete
  using (public.is_workspace_member(public.company_workspace_id(company_id)));

-- ---------------------------------------------------------------------------
-- Grants for authenticated role (RLS still applies)
-- ---------------------------------------------------------------------------
grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update on public.workspaces to authenticated;
grant select, insert, delete on public.workspace_members to authenticated;
grant select, insert, update, delete on public.companies to authenticated;
grant select, insert, update, delete on public.dte_documents to authenticated;
