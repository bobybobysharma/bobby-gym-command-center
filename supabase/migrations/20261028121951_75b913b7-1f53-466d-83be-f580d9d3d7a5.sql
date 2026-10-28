-- 1. Manual check-in: atomic, DB-enforced 60-minute rule (same lock key as member_check_in)
CREATE OR REPLACE FUNCTION public.record_manual_check_in(_gym uuid, _member uuid, _notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
declare v_m record; v_last timestamptz; v_log uuid;
begin
  if auth.uid() is null or not public.can_manage_gym(_gym) then
    raise exception 'Not authorised to record attendance';
  end if;
  select id, full_name, member_code, status into v_m from public.members where id = _member and gym_id = _gym;
  if not found then
    return jsonb_build_object('success',false,'reason','invalid_member','message','Member not found in this gym.');
  end if;
  if v_m.status <> 'active' then
    return jsonb_build_object('success',false,'reason','inactive_member','message','Member account is inactive or archived.');
  end if;
  perform pg_advisory_xact_lock(hashtext('checkin:' || v_m.id::text));
  select check_in_at into v_last from public.attendance_logs
   where member_id = v_m.id and gym_id = _gym order by check_in_at desc limit 1;
  if v_last is not null and now() - v_last < interval '60 minutes' then
    return jsonb_build_object('success',false,'reason','duplicate',
      'message', v_m.full_name || ' already checked in ' || floor(extract(epoch from now() - v_last)/60)::int || ' minutes ago.',
      'member', jsonb_build_object('id',v_m.id,'name',v_m.full_name,'code',v_m.member_code));
  end if;
  insert into public.attendance_logs(gym_id, member_id, check_in_method, checked_in_by, notes)
  values (_gym, v_m.id, 'manual', auth.uid(), nullif(trim(coalesce(_notes,'')), ''))
  returning id into v_log;
  return jsonb_build_object('success',true,'message','Checked in ' || v_m.full_name || '.','log_id',v_log,
    'member', jsonb_build_object('id',v_m.id,'name',v_m.full_name,'code',v_m.member_code),'checked_in_at',now());
end $$;

-- 2. Staff pass scan: owners/receptionists only, same atomic lock
CREATE OR REPLACE FUNCTION public.record_qr_check_in(_gym uuid, _qr_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
declare v_member record; v_last_checkin timestamptz; v_log_id uuid;
begin
  if auth.uid() is null or not public.can_manage_gym(_gym) then
    raise exception 'Not authorised to record attendance';
  end if;
  select m.id, m.full_name, m.member_code, m.status, m.photo_url, q.is_active into v_member
  from public.member_qr_passes q join public.members m on m.id = q.member_id
  where q.qr_token = trim(_qr_token) and q.gym_id = _gym;
  if not found then
    return jsonb_build_object('success', false, 'reason', 'invalid_token', 'message', 'Invalid or unrecognized QR pass');
  end if;
  if not v_member.is_active or v_member.status <> 'active' then
    return jsonb_build_object('success', false, 'reason', 'inactive_member', 'message', 'Member account is inactive or suspended');
  end if;
  perform pg_advisory_xact_lock(hashtext('checkin:' || v_member.id::text));
  select check_in_at into v_last_checkin from public.attendance_logs
  where gym_id = _gym and member_id = v_member.id order by check_in_at desc limit 1;
  if v_last_checkin is not null and (now() - v_last_checkin) < interval '60 minutes' then
    return jsonb_build_object('success', false, 'reason', 'duplicate',
      'message', 'Member already checked in ' || floor(extract(epoch from now() - v_last_checkin)/60)::int || ' minutes ago',
      'member', jsonb_build_object('name', v_member.full_name, 'code', v_member.member_code));
  end if;
  insert into public.attendance_logs (gym_id, member_id, check_in_method, checked_in_by)
  values (_gym, v_member.id, 'qr', auth.uid()) returning id into v_log_id;
  return jsonb_build_object('success', true, 'message', 'Check-in recorded successfully', 'log_id', v_log_id,
    'member', jsonb_build_object('id', v_member.id, 'name', v_member.full_name, 'code', v_member.member_code, 'photo_url', v_member.photo_url),
    'checked_in_at', now());
end $$;

-- 3. Reception challenges: owners/receptionists only (was any staff incl. trainers)
CREATE OR REPLACE FUNCTION public.issue_checkin_challenge(_gym uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions' AS $$
declare v_token text; v_code text; v_exp timestamptz;
begin
  if auth.uid() is null or not public.can_manage_gym(_gym) then raise exception 'Not authorised'; end if;
  delete from public.checkin_challenges where expires_at < now() - interval '10 minutes';
  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  v_code := lpad((abs(('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::int) % 1000000)::text, 6, '0');
  v_exp := now() + interval '40 seconds';
  insert into public.checkin_challenges(gym_id, token_hash, code_hash, expires_at, created_by)
  values (_gym, encode(extensions.digest(v_token, 'sha256'), 'hex'),
          encode(extensions.digest(_gym::text || ':' || v_code, 'sha256'), 'hex'), v_exp, auth.uid());
  return jsonb_build_object('token', v_token, 'code', v_code, 'expires_at', v_exp, 'refresh_seconds', 30);
end $$;

-- 4. Execute rights: signed-in only
REVOKE EXECUTE ON FUNCTION public.record_manual_check_in(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.record_qr_check_in(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.issue_checkin_challenge(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_manual_check_in(uuid, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_qr_check_in(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.issue_checkin_challenge(uuid) TO authenticated, service_role;

-- 5. Attendance table: no direct inserts (all go through the functions above);
--    staff (incl. trainers) may read; only owners/receptionists may correct/undo.
DROP POLICY IF EXISTS "staff manage attendance" ON public.attendance_logs;
CREATE POLICY "staff read attendance" ON public.attendance_logs FOR SELECT TO authenticated USING (public.is_gym_staff(gym_id));
CREATE POLICY "managers edit attendance" ON public.attendance_logs FOR UPDATE TO authenticated USING (public.can_manage_gym(gym_id)) WITH CHECK (public.can_manage_gym(gym_id));
CREATE POLICY "managers undo attendance" ON public.attendance_logs FOR DELETE TO authenticated USING (public.can_manage_gym(gym_id));