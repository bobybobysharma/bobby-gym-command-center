-- Trigger-only functions: never callable through the API (triggers still fire).
revoke execute on function public.audit_row() from public, anon, authenticated;
revoke execute on function public.ensure_member_qr_pass() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.members_before_write() from public, anon, authenticated;
revoke execute on function public.memberships_before_insert() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- Role helpers: signed-in only (used by staff RLS policies and the app).
revoke execute on function public.has_gym_role(uuid, public.app_role[]) from public, anon;
grant execute on function public.has_gym_role(uuid, public.app_role[]) to authenticated, service_role;
revoke execute on function public.can_manage_gym(uuid) from public, anon;
grant execute on function public.can_manage_gym(uuid) to authenticated, service_role;
revoke execute on function public.is_gym_owner(uuid) from public, anon;
grant execute on function public.is_gym_owner(uuid) to authenticated, service_role;
revoke execute on function public.gym_today(uuid) from public, anon;
grant execute on function public.gym_today(uuid) to authenticated, service_role;
-- is_gym_staff stays callable by anon: public website read policies reference it.