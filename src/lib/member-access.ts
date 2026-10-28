import { supabase } from "@/integrations/supabase/client";

export type MemberRecord = {
  id: string; gym_id: string; full_name: string; member_code: string;
  email: string | null; phone: string; status: string; joined_on: string;
};

/**
 * Resolves the signed-in person's own member record. The account is linked only
 * by the database (claim_member_account) when the confirmed login email matches
 * the email reception saved — signing up alone never grants member access.
 * Returns null when signed out, "unlinked" when signed in without a member record.
 */
export async function resolveMemberAccess(): Promise<MemberRecord | "unlinked" | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  await supabase.rpc("claim_member_account");
  const { data } = await supabase
    .from("members")
    .select("id, gym_id, full_name, member_code, email, phone, status, joined_on")
    .eq("user_id", u.user.id)
    .neq("status", "archived")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? "unlinked";
}
