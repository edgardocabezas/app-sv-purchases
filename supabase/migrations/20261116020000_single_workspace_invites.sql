-- Single default workspace per user + email invites
-- Apply after 20261116000000_init.sql (and optional allow-any-tipo migration).

-- ---------------------------------------------------------------------------
-- Ensure one default workspace for the current user (create if none)
-- ---------------------------------------------------------------------------
create or replace function public.ensure_default_workspace(p_name text default null)
returns public.workspaces
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace public.workspaces;
  v_name text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Prefer oldest owned workspace (legacy multi-workspace users keep data).
  select w.*
    into v_workspace
  from public.workspaces w
  join public.workspace_members wm
    on wm.workspace_id = w.id
  where wm.user_id = auth.uid()
    and wm.role = 'owner'
  order by w.created_at asc
  limit 1;

  if found then
    return v_workspace;
  end if;

  -- Else any existing membership (invited member with no owned space).
  select w.*
    into v_workspace
  from public.workspaces w
  join public.workspace_members wm
    on wm.workspace_id = w.id
  where wm.user_id = auth.uid()
  order by w.created_at asc
  limit 1;

  if found then
    return v_workspace;
  end if;

  v_name := nullif(trim(coalesce(p_name, '')), '');
  if v_name is null then
    v_name := 'Mi espacio';
  end if;

  insert into public.workspaces (name, created_by)
  values (v_name, auth.uid())
  returning * into v_workspace;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_workspace.id, auth.uid(), 'owner');

  return v_workspace;
end;
$$;

grant execute on function public.ensure_default_workspace(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Workspace invites (email + token accept link)
-- ---------------------------------------------------------------------------
create table if not exists public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'member')),
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  invited_by uuid not null references auth.users (id) on delete cascade,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint workspace_invites_email_lower check (email = lower(email))
);

create unique index if not exists workspace_invites_workspace_email_pending_idx
  on public.workspace_invites (workspace_id, email)
  where accepted_at is null;

create index if not exists workspace_invites_token_idx
  on public.workspace_invites (token);

create index if not exists workspace_invites_email_idx
  on public.workspace_invites (email);

alter table public.workspace_invites enable row level security;

-- Admins/owners see invites for their workspaces.
create policy "workspace_invites_select_admin"
  on public.workspace_invites for select
  using (
    public.is_workspace_admin(workspace_id)
    or lower(coalesce(auth.jwt() ->> 'email', '')) = email
  );

create policy "workspace_invites_insert_admin"
  on public.workspace_invites for insert
  with check (
    public.is_workspace_admin(workspace_id)
    and invited_by = auth.uid()
  );

create policy "workspace_invites_update_admin_or_invitee"
  on public.workspace_invites for update
  using (
    public.is_workspace_admin(workspace_id)
    or lower(coalesce(auth.jwt() ->> 'email', '')) = email
  )
  with check (
    public.is_workspace_admin(workspace_id)
    or lower(coalesce(auth.jwt() ->> 'email', '')) = email
  );

create policy "workspace_invites_delete_admin"
  on public.workspace_invites for delete
  using (public.is_workspace_admin(workspace_id));

-- Accept invite by token: insert membership + stamp accepted_at (atomic).
create or replace function public.accept_workspace_invite(p_token text)
returns public.workspace_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.workspace_invites;
  v_member public.workspace_members;
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  v_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  if v_email = '' then
    raise exception 'Authenticated user has no email';
  end if;

  select * into v_invite
  from public.workspace_invites
  where token = p_token
  for update;

  if not found then
    raise exception 'Invite not found';
  end if;

  if v_invite.accepted_at is not null then
    -- Idempotent: return existing membership if already accepted.
    select * into v_member
    from public.workspace_members
    where workspace_id = v_invite.workspace_id
      and user_id = auth.uid();
    if found then
      return v_member;
    end if;
    raise exception 'Invite already accepted';
  end if;

  if v_invite.email <> v_email then
    raise exception 'Invite email does not match signed-in user';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_invite.workspace_id, auth.uid(), v_invite.role)
  on conflict (workspace_id, user_id) do update
    set role = excluded.role
  returning * into v_member;

  update public.workspace_invites
  set accepted_at = now()
  where id = v_invite.id;

  return v_member;
end;
$$;

grant execute on function public.accept_workspace_invite(text) to authenticated;

-- Public (limited) invite lookup by token so /invite/[token] works before login.
create or replace function public.get_workspace_invite_public(p_token text)
returns table (
  email text,
  role text,
  accepted_at timestamptz,
  workspace_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    i.email,
    i.role,
    i.accepted_at,
    w.name as workspace_name
  from public.workspace_invites i
  join public.workspaces w on w.id = i.workspace_id
  where i.token = p_token
  limit 1;
$$;

grant execute on function public.get_workspace_invite_public(text) to anon, authenticated;

grant select, insert, update, delete on public.workspace_invites to authenticated;
