-- SplitFlow initial schema
-- Extensions
create extension if not exists pgcrypto;

-- ID generators
create or replace function public.generate_splitflow_user_id()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  charset constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  generated text;
  i integer;
begin
  loop
    generated := 'SF-';
    for i in 1..6 loop
      generated := generated || substr(charset, 1 + floor(random() * length(charset))::int, 1);
    end loop;

    exit when not exists (
      select 1
      from public.profiles p
      where p.unique_id = generated
    );
  end loop;

  return generated;
end;
$$;

create or replace function public.generate_splitflow_group_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  charset constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  generated text;
  i integer;
begin
  loop
    generated := 'GRP-';
    for i in 1..6 loop
      generated := generated || substr(charset, 1 + floor(random() * length(charset))::int, 1);
    end loop;

    exit when not exists (
      select 1
      from public.groups g
      where g.group_code = generated
    );
  end loop;

  return generated;
end;
$$;

-- Core tables
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  unique_id text not null unique default public.generate_splitflow_user_id(),
  username text not null unique,
  full_name text not null,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  group_code text not null unique default public.generate_splitflow_group_code(),
  name text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default timezone('utc', now()),
  unique (group_id, user_id)
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  title text not null,
  amount numeric(12, 2) not null check (amount > 0),
  paid_by uuid not null references auth.users(id) on delete cascade,
  notes text,
  receipt_url text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12, 2) not null check (amount >= 0),
  unique (expense_id, user_id)
);

create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  payer_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  status text not null check (status in ('pending', 'settled')),
  created_at timestamptz not null default timezone('utc', now()),
  check (payer_id <> receiver_id)
);

-- Helper auth predicates for RLS
create or replace function public.is_group_member(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = target_group_id
      and gm.user_id = auth.uid()
  );
$$;

create or replace function public.is_expense_visible(target_expense_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.expenses e
    join public.group_members gm on gm.group_id = e.group_id
    where e.id = target_expense_id
      and gm.user_id = auth.uid()
  );
$$;

-- Profile bootstrap on signup
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  metadata jsonb;
  candidate_username text;
  candidate_full_name text;
begin
  metadata := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  candidate_username := trim(coalesce(metadata ->> 'username', ''));
  candidate_full_name := trim(coalesce(metadata ->> 'full_name', ''));

  if candidate_username = '' then
    candidate_username := 'user_' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;

  if candidate_full_name = '' then
    candidate_full_name := split_part(new.email, '@', 1);
  end if;

  insert into public.profiles (user_id, username, full_name)
  values (new.id, lower(candidate_username), candidate_full_name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user_profile();

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_splits enable row level security;
alter table public.settlements enable row level security;

-- Profiles policies
create policy "profiles_select_authenticated"
on public.profiles
for select
to authenticated
using (true);

create policy "profiles_insert_self"
on public.profiles
for insert
to authenticated
with check (user_id = auth.uid());

create policy "profiles_update_self"
on public.profiles
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "profiles_delete_self"
on public.profiles
for delete
to authenticated
using (user_id = auth.uid());

-- Groups policies
create policy "groups_select_members"
on public.groups
for select
to authenticated
using (
  created_by = auth.uid() or public.is_group_member(id)
);

create policy "groups_insert_creator"
on public.groups
for insert
to authenticated
with check (created_by = auth.uid());

create policy "groups_update_creator"
on public.groups
for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

create policy "groups_delete_creator"
on public.groups
for delete
to authenticated
using (created_by = auth.uid());

-- Group members policies
create policy "group_members_select_group_members"
on public.group_members
for select
to authenticated
using (public.is_group_member(group_id));

create policy "group_members_insert_self_or_member"
on public.group_members
for insert
to authenticated
with check (
  user_id = auth.uid()
  or exists (
    select 1
    from public.group_members gm
    where gm.group_id = group_members.group_id
      and gm.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.groups g
    where g.id = group_members.group_id
      and g.created_by = auth.uid()
  )
);

create policy "group_members_update_self"
on public.group_members
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "group_members_delete_self_or_owner"
on public.group_members
for delete
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.groups g
    where g.id = group_members.group_id
      and g.created_by = auth.uid()
  )
);

-- Expenses policies
create policy "expenses_select_group_members"
on public.expenses
for select
to authenticated
using (public.is_group_member(group_id));

create policy "expenses_insert_group_members"
on public.expenses
for insert
to authenticated
with check (
  public.is_group_member(group_id)
  and exists (
    select 1
    from public.group_members gm
    where gm.group_id = expenses.group_id
      and gm.user_id = expenses.paid_by
  )
);

create policy "expenses_update_owner"
on public.expenses
for update
to authenticated
using (paid_by = auth.uid())
with check (
  paid_by = auth.uid()
  and public.is_group_member(group_id)
);

create policy "expenses_delete_owner"
on public.expenses
for delete
to authenticated
using (paid_by = auth.uid());

-- Expense splits policies
create policy "expense_splits_select_group_members"
on public.expense_splits
for select
to authenticated
using (public.is_expense_visible(expense_id));

create policy "expense_splits_insert_expense_owner"
on public.expense_splits
for insert
to authenticated
with check (
  exists (
    select 1
    from public.expenses e
    where e.id = expense_splits.expense_id
      and e.paid_by = auth.uid()
  )
);

create policy "expense_splits_update_expense_owner"
on public.expense_splits
for update
to authenticated
using (
  exists (
    select 1
    from public.expenses e
    where e.id = expense_splits.expense_id
      and e.paid_by = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.expenses e
    where e.id = expense_splits.expense_id
      and e.paid_by = auth.uid()
  )
);

create policy "expense_splits_delete_expense_owner"
on public.expense_splits
for delete
to authenticated
using (
  exists (
    select 1
    from public.expenses e
    where e.id = expense_splits.expense_id
      and e.paid_by = auth.uid()
  )
);

-- Settlements policies
create policy "settlements_select_participants"
on public.settlements
for select
to authenticated
using (payer_id = auth.uid() or receiver_id = auth.uid());

create policy "settlements_insert_payer_only"
on public.settlements
for insert
to authenticated
with check (payer_id = auth.uid());

create policy "settlements_update_participants"
on public.settlements
for update
to authenticated
using (payer_id = auth.uid() or receiver_id = auth.uid())
with check (payer_id = auth.uid() or receiver_id = auth.uid());

create policy "settlements_delete_payer_only"
on public.settlements
for delete
to authenticated
using (payer_id = auth.uid());

-- Storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  false,
  8388608,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "receipt_upload_authenticated_own_folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "receipt_read_authenticated_own_folder"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "receipt_update_authenticated_own_folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "receipt_delete_authenticated_own_folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] = auth.uid()::text
);
