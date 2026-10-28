alter table public.attendance_logs drop constraint if exists attendance_logs_check_in_method_check;
alter table public.attendance_logs add constraint attendance_logs_check_in_method_check
  check (check_in_method = any (array['qr','manual','staff','code']));

create table if not exists public.checkin_challenges (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  token_hash text not null unique,
  code_hash text not null,
  expires_at timestamptz not null,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists checkin_challenges_gym_exp on public.checkin_challenges(gym_id, expires_at);
grant all on public.checkin_challenges to service_role;
alter table public.checkin_challenges enable row level security;

create table if not exists public.checkin_attempts (
  id bigserial primary key,
  user_id uuid not null,
  success boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists checkin_attempts_user_time on public.checkin_attempts(user_id, created_at);
grant all on public.checkin_attempts to service_role;
alter table public.checkin_attempts enable row level security;

create or replace function public.issue_checkin_challenge(_gym uuid)
returns jsonb language plpgsql volatile security definer set search_path = public, extensions as $$
declare v_token text; v_code text; v_exp timestamptz;
begin
  if not public.is_gym_staff(_gym) then raise exception 'Not authorised'; end if;
  delete from public.checkin_challenges where expires_at < now() - interval '10 minutes';
  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  v_code := lpad((abs(('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::int) % 1000000)::text, 6, '0');
  v_exp := now() + interval '40 seconds';
  insert into public.checkin_challenges(gym_id, token_hash, code_hash, expires_at, created_by)
  values (_gym, encode(extensions.digest(v_token, 'sha256'), 'hex'),
          encode(extensions.digest(_gym::text || ':' || v_code, 'sha256'), 'hex'), v_exp, auth.uid());
  return jsonb_build_object('token', v_token, 'code', v_code, 'expires_at', v_exp, 'refresh_seconds', 30);
end $$;

create or replace function public.member_check_in(_token text default null, _code text default null)
returns jsonb language plpgsql volatile security definer set search_path = public, extensions as $$
declare
  v_uid uuid := auth.uid(); v_ch record; v_m record; v_last timestamptz; v_fails int; v_log uuid; v_ms record;
begin
  if v_uid is null then return jsonb_build_object('success',false,'reason','not_signed_in','message','Please sign in first.'); end if;
  if not exists (select 1 from public.members where user_id = v_uid) then
    return jsonb_build_object('success',false,'reason','not_member','message','Your account is not linked to a gym membership.');
  end if;

  if coalesce(trim(_token),'') <> '' then
    select * into v_ch from public.checkin_challenges
     where token_hash = encode(extensions.digest(trim(_token),'sha256'),'hex');
  elsif coalesce(trim(_code),'') <> '' then
    select count(*) into v_fails from public.checkin_attempts
     where user_id = v_uid and not success and created_at > now() - interval '10 minutes';
    if v_fails >= 5 then
      return jsonb_build_object('success',false,'reason','rate_limited','message','Too many incorrect codes. Try again in 10 minutes or ask reception.');
    end if;
    select c.* into v_ch from public.checkin_challenges c
      join public.members m on m.gym_id = c.gym_id and m.user_id = v_uid
     where c.code_hash = encode(extensions.digest(c.gym_id::text || ':' || trim(_code),'sha256'),'hex')
       and c.expires_at > now()
     order by c.created_at desc limit 1;
  else
    return jsonb_build_object('success',false,'reason','invalid_code','message','Scan the reception QR or enter the code.');
  end if;

  if v_ch.id is null then
    insert into public.checkin_attempts(user_id, success) values (v_uid, false);
    return jsonb_build_object('success',false,'reason','invalid_code','message','That code is not valid. Check the reception screen and try again.');
  end if;
  if v_ch.expires_at <= now() then
    return jsonb_build_object('success',false,'reason','expired_code','message','That QR code has expired. Scan the new one on the reception screen.');
  end if;

  select * into v_m from public.members where user_id = v_uid and gym_id = v_ch.gym_id limit 1;
  if v_m.id is null then
    insert into public.checkin_attempts(user_id, success) values (v_uid, false);
    return jsonb_build_object('success',false,'reason','invalid_code','message','This code belongs to a different gym.');
  end if;
  if v_m.status <> 'active' then
    return jsonb_build_object('success',false,'reason','inactive_member','message','Your member account is not active. Please speak to reception.');
  end if;

  select * into v_ms from public.memberships
   where member_id = v_m.id and gym_id = v_m.gym_id and state = 'active'
     and public.gym_today(v_m.gym_id) between start_date and end_date
   order by end_date desc limit 1;
  if v_ms.id is null then
    return jsonb_build_object('success',false,'reason','no_membership','message','You have no active membership today. Please renew at reception.');
  end if;

  perform pg_advisory_xact_lock(hashtext('checkin:' || v_m.id::text));
  select check_in_at into v_last from public.attendance_logs
   where member_id = v_m.id and gym_id = v_m.gym_id order by check_in_at desc limit 1;
  if v_last is not null and now() - v_last < interval '60 minutes' then
    return jsonb_build_object('success',false,'reason','duplicate',
      'message','You already checked in ' || floor(extract(epoch from now() - v_last)/60)::int || ' minutes ago.');
  end if;

  insert into public.attendance_logs(gym_id, member_id, check_in_method, checked_in_by, notes)
  values (v_m.gym_id, v_m.id, case when coalesce(trim(_token),'') <> '' then 'qr' else 'code' end, v_uid, 'Self check-in')
  returning id into v_log;
  insert into public.checkin_attempts(user_id, success) values (v_uid, true);
  return jsonb_build_object('success',true,'message','Checked in. Have a great workout!','log_id',v_log,
    'member', jsonb_build_object('id',v_m.id,'name',v_m.full_name,'code',v_m.member_code),'checked_in_at',now());
end $$;

create or replace function public.claim_member_account()
returns integer language plpgsql volatile security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_email text; n int;
begin
  if v_uid is null then return 0; end if;
  select lower(email) into v_email from auth.users where id = v_uid and email_confirmed_at is not null;
  if v_email is null then return 0; end if;
  update public.members set user_id = v_uid
   where user_id is null and status <> 'archived' and lower(email) = v_email;
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.issue_checkin_challenge(uuid) from public, anon;
revoke all on function public.member_check_in(text, text) from public, anon;
revoke all on function public.claim_member_account() from public, anon;
grant execute on function public.issue_checkin_challenge(uuid) to authenticated;
grant execute on function public.member_check_in(text, text) to authenticated;
grant execute on function public.claim_member_account() to authenticated;