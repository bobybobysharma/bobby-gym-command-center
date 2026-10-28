import { supabase } from "@/integrations/supabase/client";

export type AdminAccess = {
  userId: string;
  email: string | null;
  gymId: string;
  role: string;
};

const MANAGER_ROLES = ["owner", "receptionist", "platform_admin"];

/**
 * Resolves dashboard access from the database only: the signed-in user's own
 * user_roles rows (RLS: own rows) confirmed by the can_manage_gym() function.
 * Returns null when signed out, "denied" when signed in without manager rights.
 */
export async function resolveAdminAccess(): Promise<AdminAccess | "denied" | null> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return null;
  const user = userData.user;

  const { data: roles, error } = await supabase
    .from("user_roles")
    .select("gym_id, role")
    .eq("user_id", user.id);
  if (error) throw error;

  const candidates = (roles ?? []).filter((r) => MANAGER_ROLES.includes(r.role));
  for (const r of candidates) {
    let gymId = r.gym_id as string | null;
    if (!gymId) {
      const { data } = await supabase.rpc("default_gym_id");
      gymId = (data as string | null) ?? null;
    }
    if (!gymId) continue;
    const { data: ok, error: rpcError } = await supabase.rpc("can_manage_gym", { _gym: gymId });
    if (rpcError) throw rpcError;
    if (ok) return { userId: user.id, email: user.email ?? null, gymId, role: r.role };
  }
  return "denied";
}
