create type public.app_role as enum ('platform_admin','owner','receptionist','trainer','member');
create type public.member_status as enum ('active','inactive','archived');
create type public.membership_state as enum ('active','paused','cancelled');
create type public.enquiry_status as enum ('new','contacted','approved','rejected','converted');
create type public.enquiry_kind as enum ('join','contact','renewal');

create table public.gyms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  name text not null check (length(trim(name)) between 2 and 80),
  is_demo boolean not null default false,
  is_default boolean not null default false,
  timezone text not null default 'Asia/Kolkata',
  created_at timestamptz not null default now()
);
create unique index gyms_single_default on public.gyms(is_default) where is_default;
grant select on public.gyms to anon, authenticated;
grant update on public.gyms to authenticated;
grant all on public.gyms to service_role;
alter table public.gyms enable row level security;

create table public.gym_counters (
  gym_id uuid primary key references public.gyms(id) on delete cascade,
  member_seq integer not null default 0
);
grant all on public.gym_counters to service_role;
alter table public.gym_counters enable row level security;

create table public.gym_settings (
  gym_id uuid primary key references public.gyms(id) on delete cascade,
  tagline text,
  logo_url text,
  favicon_url text,
  theme jsonb not null default '{}'::jsonb,
  hero jsonb not null default '{}'::jsonb,
  content jsonb not null default '{}'::jsonb,
  gallery jsonb not null default '[]'::jsonb,
  contact jsonb not null default '{}'::jsonb,
  opening_hours jsonb not null default '[]'::jsonb,
  social jsonb not null default '{}'::jsonb,
  enquiries_enabled boolean not null default true,
  payment_message text not null default 'Please contact reception to complete your payment.',
  reminder_days integer not null default 7 check (reminder_days between 1 and 60),
  grace_days integer not null default 3 check (grace_days between 0 and 60),
  updated_at timestamptz not null default now()
);
grant select on public.gym_settings to anon, authenticated;
grant update on public.gym_settings to authenticated;
grant all on public.gym_settings to service_role;
alter table public.gym_settings enable row level security;

create table public.gym_domains (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  hostname text not null unique check (hostname ~ '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$'),
  status text not null default 'pending' check (status in ('pending','verified','failed')),
  verification_token text not null default encode(gen_random_bytes(16),'hex'),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.gym_domains(gym_id);
grant select, insert, update, delete on public.gym_domains to authenticated;
grant all on public.gym_domains to service_role;
alter table public.gym_domains enable row level security;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  gym_id uuid references public.gyms(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique nulls not distinct (user_id, gym_id, role),
  check ((role = 'platform_admin') = (gym_id is null))
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_gym_role(_gym uuid, _roles public.app_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and (role = 'platform_admin' or (gym_id = _gym and role = any(_roles)))
  )
$$;
create or replace function public.is_gym_owner(_gym uuid) returns boolean language sql stable security definer set search_path = public as $$
  select public.has_gym_role(_gym, array['owner']::public.app_role[]) $$;
create or replace function public.can_manage_gym(_gym uuid) returns boolean language sql stable security definer set search_path = public as $$
  select public.has_gym_role(_gym, array['owner','receptionist']::public.app_role[]) $$;
create or replace function public.is_gym_staff(_gym uuid) returns boolean language sql stable security definer set search_path = public as $$
  select public.has_gym_role(_gym, array['owner','receptionist','trainer']::public.app_role[]) $$;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.members (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete restrict,
  member_code text not null,
  full_name text not null check (length(trim(full_name)) between 2 and 120),
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text not null check (phone ~ '^\+?[0-9]{10,15}$'),
  emergency_contact_name text,
  emergency_contact_phone text,
  photo_url text,
  status public.member_status not null default 'active',
  joined_on date not null default ((now() at time zone 'Asia/Kolkata')::date),
  user_id uuid unique,
  is_demo boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (gym_id, member_code),
  unique (gym_id, phone),
  unique (id, gym_id)
);
create index on public.members(gym_id, status);
create index on public.members(gym_id, lower(full_name));
grant select, insert, update on public.members to authenticated;
grant all on public.members to service_role;
alter table public.members enable row level security;

create or replace function public.members_before_write() returns trigger language plpgsql security definer set search_path = public as $$
declare seq integer;
begin
  new.phone := regexp_replace(coalesce(new.phone,''), '[\s\-\(\)]', '', 'g');
  if new.email is not null then new.email := nullif(lower(trim(new.email)), ''); end if;
  new.full_name := trim(new.full_name);
  new.updated_at := now();
  if tg_op = 'INSERT' then
    insert into public.gym_counters(gym_id, member_seq) values (new.gym_id, 1)
      on conflict (gym_id) do update set member_seq = public.gym_counters.member_seq + 1
      returning member_seq into seq;
    new.member_code := 'M' || lpad(seq::text, 5, '0');
    new.created_by := auth.uid();
  else
    new.member_code := old.member_code;
    new.gym_id := old.gym_id;
    new.is_demo := old.is_demo;
  end if;
  return new;
end $$;
create trigger members_before_write before insert or update on public.members for each row execute function public.members_before_write();

create table public.member_notes (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null,
  member_id uuid not null,
  body text not null check (length(body) between 1 and 2000),
  author_id uuid default auth.uid(),
  created_at timestamptz not null default now(),
  foreign key (member_id, gym_id) references public.members(id, gym_id) on delete cascade
);
create index on public.member_notes(member_id);
grant select, insert, delete on public.member_notes to authenticated;
grant all on public.member_notes to service_role;
alter table public.member_notes enable row level security;

create table public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  name text not null check (length(trim(name)) between 2 and 60),
  description text,
  price_paise integer not null check (price_paise >= 0),
  duration_months integer not null check (duration_months between 1 and 60),
  benefits text[] not null default '{}',
  promo_label text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, gym_id)
);
create index on public.membership_plans(gym_id, sort_order);
grant select on public.membership_plans to anon;
grant select, insert, update, delete on public.membership_plans to authenticated;
grant all on public.membership_plans to service_role;
alter table public.membership_plans enable row level security;

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null,
  member_id uuid not null,
  plan_id uuid,
  plan_name text not null,
  fee_paise integer not null check (fee_paise >= 0),
  duration_months integer not null check (duration_months between 1 and 60),
  start_date date not null,
  end_date date not null,
  state public.membership_state not null default 'active',
  paused_on date,
  cancelled_on date,
  cancel_reason text,
  renewed_from uuid references public.memberships(id),
  notes text,
  is_demo boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now(),
  check (end_date >= start_date),
  foreign key (member_id, gym_id) references public.members(id, gym_id),
  foreign key (plan_id, gym_id) references public.membership_plans(id, gym_id)
);
create index on public.memberships(gym_id, end_date);
create index on public.memberships(member_id);
grant select, insert, update on public.memberships to authenticated;
grant all on public.memberships to service_role;
alter table public.memberships enable row level security;

create or replace function public.memberships_before_insert() returns trigger language plpgsql security definer set search_path = public as $$
declare p record;
begin
  if new.plan_id is not null then
    select * into p from public.membership_plans where id = new.plan_id and gym_id = new.gym_id;
    if not found then raise exception 'Plan does not belong to this gym'; end if;
    new.plan_name := coalesce(new.plan_name, p.name);
    new.fee_paise := coalesce(new.fee_paise, p.price_paise);
    new.duration_months := coalesce(new.duration_months, p.duration_months);
  end if;
  if new.duration_months is null then raise exception 'Duration is required'; end if;
  new.end_date := coalesce(new.end_date, (new.start_date + make_interval(months => new.duration_months) - interval '1 day')::date);
  new.created_by := auth.uid();
  return new;
end $$;
create trigger memberships_before_insert before insert on public.memberships for each row execute function public.memberships_before_insert();

create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  kind public.enquiry_kind not null default 'contact',
  full_name text not null check (length(trim(full_name)) between 2 and 120),
  phone text check (phone is null or phone ~ '^\+?[0-9 \-]{10,18}$'),
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  plan_id uuid,
  message text check (message is null or length(message) <= 2000),
  status public.enquiry_status not null default 'new',
  member_id uuid,
  reviewed_by uuid,
  reviewed_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  check (phone is not null or email is not null),
  foreign key (plan_id, gym_id) references public.membership_plans(id, gym_id)
);
create index on public.enquiries(gym_id, status, created_at desc);
grant insert on public.enquiries to anon;
grant select, insert, update on public.enquiries to authenticated;
grant all on public.enquiries to service_role;
alter table public.enquiries enable row level security;

create table public.trainers (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  name text not null, specialty text, bio text, experience_years integer check (experience_years between 0 and 60),
  image_url text, is_active boolean not null default true, sort_order integer not null default 0,
  is_demo boolean not null default false, created_at timestamptz not null default now()
);
create table public.facilities (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  name text not null, description text, image_url text,
  is_active boolean not null default true, sort_order integer not null default 0,
  is_demo boolean not null default false, created_at timestamptz not null default now()
);
create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  author_name text not null, quote text not null check (length(quote) <= 600),
  rating integer check (rating between 1 and 5),
  is_active boolean not null default true, sort_order integer not null default 0,
  is_demo boolean not null default false, created_at timestamptz not null default now()
);
grant select on public.trainers, public.facilities, public.testimonials to anon;
grant select, insert, update, delete on public.trainers, public.facilities, public.testimonials to authenticated;
grant all on public.trainers, public.facilities, public.testimonials to service_role;
alter table public.trainers enable row level security;
alter table public.facilities enable row level security;
alter table public.testimonials enable row level security;

create table public.audit_logs (
  id bigint generated always as identity primary key,
  gym_id uuid,
  actor_id uuid,
  action text not null,
  target_table text not null,
  target_id text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index on public.audit_logs(gym_id, created_at desc);
grant select on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;

create or replace function public.audit_row() returns trigger language plpgsql security definer set search_path = public as $$
declare n jsonb; o jsonb; changed text[]; r jsonb;
begin
  n := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  o := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  r := coalesce(n, o);
  if tg_op = 'UPDATE' then
    select array_agg(k) into changed from jsonb_object_keys(n) k where n->k is distinct from o->k and k <> 'updated_at';
    if changed is null then return new; end if;
  end if;
  insert into public.audit_logs(gym_id, actor_id, action, target_table, target_id, meta)
  values ((r->>'gym_id')::uuid, auth.uid(), lower(tg_op), tg_table_name,
          coalesce(r->>'id', r->>'gym_id'),
          jsonb_build_object('fields', to_jsonb(coalesce(changed, '{}'::text[]))));
  return coalesce(new, old);
end $$;
create trigger audit after insert or update or delete on public.members for each row execute function public.audit_row();
create trigger audit after insert or update or delete on public.memberships for each row execute function public.audit_row();
create trigger audit after insert or update or delete on public.membership_plans for each row execute function public.audit_row();
create trigger audit after insert or update or delete on public.gym_settings for each row execute function public.audit_row();
create trigger audit after insert or update or delete on public.enquiries for each row execute function public.audit_row();
create trigger audit after insert or update or delete on public.user_roles for each row execute function public.audit_row();
create trigger audit after insert or update or delete on public.gym_domains for each row execute function public.audit_row();

create policy "public read gyms" on public.gyms for select to anon, authenticated using (true);
create policy "owner updates gym" on public.gyms for update to authenticated using (public.is_gym_owner(id)) with check (public.is_gym_owner(id));
create policy "public read settings" on public.gym_settings for select to anon, authenticated using (true);
create policy "owner updates settings" on public.gym_settings for update to authenticated using (public.is_gym_owner(gym_id)) with check (public.is_gym_owner(gym_id));
create policy "owner reads domains" on public.gym_domains for select to authenticated using (public.is_gym_owner(gym_id));
create policy "owner adds domains" on public.gym_domains for insert to authenticated with check (public.is_gym_owner(gym_id) and status = 'pending' and verified_at is null);
create policy "owner removes domains" on public.gym_domains for delete to authenticated using (public.is_gym_owner(gym_id));
create policy "platform admin verifies domains" on public.gym_domains for update to authenticated
  using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'platform_admin'))
  with check (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'platform_admin'));
create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "read own or managed roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or (gym_id is not null and public.is_gym_owner(gym_id)));
create policy "staff or self read members" on public.members for select to authenticated using (public.is_gym_staff(gym_id) or user_id = auth.uid());
create policy "managers add members" on public.members for insert to authenticated with check (public.can_manage_gym(gym_id) and user_id is null);
create policy "managers edit members" on public.members for update to authenticated using (public.can_manage_gym(gym_id)) with check (public.can_manage_gym(gym_id));
create policy "managers read notes" on public.member_notes for select to authenticated using (public.can_manage_gym(gym_id));
create policy "managers add notes" on public.member_notes for insert to authenticated with check (public.can_manage_gym(gym_id) and author_id = auth.uid());
create policy "owner deletes notes" on public.member_notes for delete to authenticated using (public.is_gym_owner(gym_id));
create policy "public reads active plans" on public.membership_plans for select to anon, authenticated using (is_active or public.is_gym_staff(gym_id));
create policy "owner inserts plans" on public.membership_plans for insert to authenticated with check (public.is_gym_owner(gym_id));
create policy "owner updates plans" on public.membership_plans for update to authenticated using (public.is_gym_owner(gym_id)) with check (public.is_gym_owner(gym_id));
create policy "owner deletes plans" on public.membership_plans for delete to authenticated using (public.is_gym_owner(gym_id));
create policy "staff or own memberships" on public.memberships for select to authenticated using (
  public.is_gym_staff(gym_id) or exists (select 1 from public.members m where m.id = member_id and m.user_id = auth.uid()));
create policy "managers add memberships" on public.memberships for insert to authenticated with check (public.can_manage_gym(gym_id));
create policy "managers edit memberships" on public.memberships for update to authenticated using (public.can_manage_gym(gym_id)) with check (public.can_manage_gym(gym_id));
create policy "anyone submits enquiry" on public.enquiries for insert to anon, authenticated with check (
  status = 'new' and member_id is null and reviewed_by is null and is_demo = false
  and exists (select 1 from public.gym_settings s where s.gym_id = enquiries.gym_id and s.enquiries_enabled));
create policy "managers read enquiries" on public.enquiries for select to authenticated using (public.can_manage_gym(gym_id));
create policy "managers update enquiries" on public.enquiries for update to authenticated using (public.can_manage_gym(gym_id)) with check (public.can_manage_gym(gym_id));
create policy "public reads trainers" on public.trainers for select to anon, authenticated using (is_active or public.is_gym_staff(gym_id));
create policy "owner writes trainers" on public.trainers for all to authenticated using (public.is_gym_owner(gym_id)) with check (public.is_gym_owner(gym_id));
create policy "public reads facilities" on public.facilities for select to anon, authenticated using (is_active or public.is_gym_staff(gym_id));
create policy "owner writes facilities" on public.facilities for all to authenticated using (public.is_gym_owner(gym_id)) with check (public.is_gym_owner(gym_id));
create policy "public reads testimonials" on public.testimonials for select to anon, authenticated using (is_active or public.is_gym_staff(gym_id));
create policy "owner writes testimonials" on public.testimonials for all to authenticated using (public.is_gym_owner(gym_id)) with check (public.is_gym_owner(gym_id));
create policy "owner reads audit" on public.audit_logs for select to authenticated using (gym_id is not null and public.is_gym_owner(gym_id));

create or replace function public.resolve_gym_by_host(_host text) returns uuid language sql stable security definer set search_path = public as $$
  select gym_id from public.gym_domains where hostname = lower(_host) and status = 'verified' limit 1
$$;
create or replace function public.default_gym_id() returns uuid language sql stable security definer set search_path = public as $$
  select id from public.gyms where is_default limit 1
$$;
grant execute on function public.resolve_gym_by_host(text), public.default_gym_id() to anon, authenticated;

create or replace function public.gym_today(_gym uuid) returns date language sql stable security definer set search_path = public as $$
  select (now() at time zone coalesce((select timezone from public.gyms where id = _gym), 'Asia/Kolkata'))::date
$$;

create or replace function public.my_access() returns table(gym_id uuid, role public.app_role) language sql stable security definer set search_path = public as $$
  select gym_id, role from public.user_roles where user_id = auth.uid()
$$;

create or replace function public.convert_enquiry(_enquiry uuid, _plan uuid default null, _start date default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare e record; mid uuid; norm text;
begin
  select * into e from public.enquiries where id = _enquiry for update;
  if not found then raise exception 'Enquiry not found'; end if;
  if not public.can_manage_gym(e.gym_id) then raise exception 'Not authorised'; end if;
  if e.status = 'converted' then raise exception 'Enquiry already converted'; end if;
  if e.phone is null then raise exception 'A phone number is required to create a member'; end if;
  norm := regexp_replace(e.phone, '[\s\-\(\)]', '', 'g');
  select id into mid from public.members where gym_id = e.gym_id and phone = norm;
  if mid is null then
    insert into public.members(gym_id, full_name, email, phone) values (e.gym_id, e.full_name, e.email, norm) returning id into mid;
  end if;
  if coalesce(_plan, e.plan_id) is not null then
    insert into public.memberships(gym_id, member_id, plan_id, start_date)
    values (e.gym_id, mid, coalesce(_plan, e.plan_id), coalesce(_start, public.gym_today(e.gym_id)));
  end if;
  update public.enquiries set status = 'converted', member_id = mid, reviewed_by = auth.uid(), reviewed_at = now() where id = _enquiry;
  return mid;
end $$;

create or replace function public.renew_membership(_member uuid, _plan uuid, _start date default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare m record; last_end date; last_id uuid; sid date; nid uuid; today date;
begin
  select * into m from public.members where id = _member;
  if not found or not public.can_manage_gym(m.gym_id) then raise exception 'Not authorised'; end if;
  today := public.gym_today(m.gym_id);
  select id, end_date into last_id, last_end from public.memberships where member_id = _member and state <> 'cancelled' order by end_date desc limit 1;
  sid := coalesce(_start, greatest(today, coalesce(last_end + 1, today)));
  insert into public.memberships(gym_id, member_id, plan_id, start_date, renewed_from)
  values (m.gym_id, _member, _plan, sid, last_id) returning id into nid;
  return nid;
end $$;

create or replace function public.change_membership_state(_id uuid, _action text, _reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare ms record; today date;
begin
  select * into ms from public.memberships where id = _id for update;
  if not found or not public.can_manage_gym(ms.gym_id) then raise exception 'Not authorised'; end if;
  today := public.gym_today(ms.gym_id);
  if _action = 'pause' then
    if ms.state <> 'active' then raise exception 'Only active memberships can be paused'; end if;
    update public.memberships set state = 'paused', paused_on = today where id = _id;
  elsif _action = 'resume' then
    if ms.state <> 'paused' then raise exception 'Membership is not paused'; end if;
    update public.memberships set state = 'active', end_date = end_date + (today - paused_on), paused_on = null where id = _id;
  elsif _action = 'cancel' then
    if ms.state = 'cancelled' then raise exception 'Already cancelled'; end if;
    update public.memberships set state = 'cancelled', cancelled_on = today, cancel_reason = _reason where id = _id;
  else raise exception 'Unknown action'; end if;
end $$;

create or replace function public.load_demo_members(_gym uuid) returns integer language plpgsql security definer set search_path = public as $$
declare g record; names text[] := array['Demo Arjun Mehta','Demo Priya Nair','Demo Rohan Kapoor','Demo Sneha Iyer','Demo Vikram Rao','Demo Ananya Das'];
  i int; mid uuid; pid uuid; cnt int := 0;
begin
  select * into g from public.gyms where id = _gym;
  if not found or not g.is_demo then raise exception 'Demo records can only be loaded into a demo gym'; end if;
  if not public.is_gym_owner(_gym) then raise exception 'Not authorised'; end if;
  for i in 1..array_length(names,1) loop
    if not exists (select 1 from public.members where gym_id = _gym and phone = '+9100000000' || i) then
      insert into public.members(gym_id, full_name, phone, email, is_demo)
      values (_gym, names[i], '+9100000000' || i, 'demo' || i || '@example.com', true) returning id into mid;
      select id into pid from public.membership_plans where gym_id = _gym order by sort_order offset (i % 4) limit 1;
      insert into public.memberships(gym_id, member_id, plan_id, start_date, is_demo)
      values (_gym, mid, pid, public.gym_today(_gym) - (i * 25), true);
      cnt := cnt + 1;
    end if;
  end loop;
  insert into public.enquiries(gym_id, kind, full_name, phone, email, message, is_demo)
  values (_gym, 'join', 'Demo Kabir Singh', '+919000000099', 'demo.enquiry@example.com', 'Demo enquiry: interested in morning batches.', true);
  return cnt;
end $$;

create or replace function public.clear_demo_members(_gym uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.gyms where id = _gym and is_demo) then raise exception 'Not a demo gym'; end if;
  if not public.is_gym_owner(_gym) then raise exception 'Not authorised'; end if;
  delete from public.memberships where gym_id = _gym and is_demo;
  delete from public.member_notes where member_id in (select id from public.members where gym_id = _gym and is_demo);
  update public.enquiries set member_id = null where gym_id = _gym and member_id in (select id from public.members where gym_id = _gym and is_demo);
  delete from public.members where gym_id = _gym and is_demo;
  delete from public.enquiries where gym_id = _gym and is_demo;
end $$;

revoke execute on function public.convert_enquiry(uuid,uuid,date), public.renew_membership(uuid,uuid,date),
  public.change_membership_state(uuid,text,text), public.load_demo_members(uuid), public.clear_demo_members(uuid), public.my_access() from anon, public;
grant execute on function public.convert_enquiry(uuid,uuid,date), public.renew_membership(uuid,uuid,date),
  public.change_membership_state(uuid,text,text), public.load_demo_members(uuid), public.clear_demo_members(uuid), public.my_access() to authenticated;

insert into public.gyms(id, slug, name, is_demo, is_default) values ('00000000-0000-4000-8000-000000000001','bobby-gym','Bobby Gym', true, true);
insert into public.gym_counters(gym_id) values ('00000000-0000-4000-8000-000000000001');
insert into public.gym_settings(gym_id, tagline, theme, hero, content, contact, opening_hours, social, payment_message) values (
 '00000000-0000-4000-8000-000000000001',
 'Strength. Discipline. Results.',
 '{"background":"#0B0D0B","surface":"#151915","accent":"#B6FF35","text":"#FFFFFF","muted":"#A7ADA4","border":"#262B25","headingFont":"Anton","bodyFont":"Manrope"}',
 '{"headline":"YOUR FITNESS. YOUR STRENGTH. YOUR JOURNEY.","subtext":"Train smarter, get stronger, and become the best version of yourself with Bobby Gym.","image":"asset:hero"}',
 '{"aboutTitle":"Built for people who show up","aboutBody":"Bobby Gym is a 9,000 sq ft training floor for lifters, athletes and beginners alike. Coaches who care, equipment that works, and a room full of people pushing in the same direction.","philosophy":"Progress over perfection. We programme around strength, conditioning and mobility, and we track it so you can see it.","whyUs":["Certified coaches on the floor every shift","Commercial-grade strength and cardio equipment","Clean locker rooms and hot showers","Plans that fit students, professionals and families"],"aboutImage":"asset:strength"}',
 '{"phone":"+91 98765 43210","email":"hello@bobbygym.example","address":"2nd Floor, Demo Plaza, MG Road, Bengaluru 560001","mapUrl":"https://maps.google.com/?q=MG+Road+Bengaluru"}',
 '[{"label":"Monday – Saturday","hours":"5:30 AM – 10:30 PM"},{"label":"Sunday","hours":"7:00 AM – 1:00 PM"}]',
 '{"instagram":"https://instagram.com","facebook":"https://facebook.com","youtube":"https://youtube.com"}',
 'Please contact Bobby Gym reception to complete your payment.'
);
insert into public.membership_plans(gym_id, name, description, price_paise, duration_months, benefits, promo_label, sort_order) values
 ('00000000-0000-4000-8000-000000000001','Monthly Plan','Try the floor with no long commitment.',120000,1,'{"Full gym access","Locker room & showers","Fitness assessment"}',null,1),
 ('00000000-0000-4000-8000-000000000001','Quarterly Plan','Three months to build a real habit.',300000,3,'{"Full gym access","Locker room & showers","Monthly progress check-in"}',null,2),
 ('00000000-0000-4000-8000-000000000001','Half-Yearly Plan','Our most popular plan for steady progress.',550000,6,'{"Full gym access","2 personal training sessions","Diet consultation"}','Most popular',3),
 ('00000000-0000-4000-8000-000000000001','Annual Plan','Best value for committed members.',1000000,12,'{"Full gym access","4 personal training sessions","Diet consultation","Guest passes"}','Best value',4);
insert into public.facilities(gym_id, name, description, image_url, sort_order, is_demo) values
 ('00000000-0000-4000-8000-000000000001','Strength Training','Power racks, platforms and calibrated plates.','asset:strength',1,true),
 ('00000000-0000-4000-8000-000000000001','Cardio Zone','Treadmills, rowers, bikes and air runners.','asset:cardio',2,true),
 ('00000000-0000-4000-8000-000000000001','Functional Training','Turf lane, sleds, kettlebells and rigs.','asset:functional',3,true),
 ('00000000-0000-4000-8000-000000000001','Free Weights','Dumbbells from 2.5 to 50 kg.','asset:strength',4,true),
 ('00000000-0000-4000-8000-000000000001','Locker Rooms','Secure lockers for every member.','asset:locker',5,true),
 ('00000000-0000-4000-8000-000000000001','Showers','Clean, hot showers open all day.','asset:locker',6,true);
insert into public.trainers(gym_id, name, specialty, bio, experience_years, image_url, sort_order, is_demo) values
 ('00000000-0000-4000-8000-000000000001','Demo Coach Rahul','Strength & Powerlifting','Demo profile. Helps members build their first real squat, bench and deadlift.',8,'asset:trainer',1,true),
 ('00000000-0000-4000-8000-000000000001','Demo Coach Meera','Conditioning & Fat Loss','Demo profile. Runs high-energy conditioning blocks and habit coaching.',6,'asset:trainer',2,true),
 ('00000000-0000-4000-8000-000000000001','Demo Coach Imran','Mobility & Rehab','Demo profile. Focuses on moving well, posture and injury-aware training.',10,'asset:trainer',3,true);
insert into public.testimonials(gym_id, author_name, quote, rating, sort_order, is_demo) values
 ('00000000-0000-4000-8000-000000000001','Demo member','Sample testimonial: the coaches actually watch your form.',5,1,true),
 ('00000000-0000-4000-8000-000000000001','Demo member','Sample testimonial: clean, never too crowded, great music.',5,2,true),
 ('00000000-0000-4000-8000-000000000001','Demo member','Sample testimonial: I finally stuck with training for a full year.',5,3,true);