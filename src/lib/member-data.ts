import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** All reads go through RLS: members only ever see their own rows. */
export const memberOverviewQuery = (memberId: string, gymId: string) =>
  queryOptions({
    queryKey: ["member", "overview", memberId],
    queryFn: async () => {
      const [today, gym, ms, pays, visits] = await Promise.all([
        supabase.rpc("gym_today", { _gym: gymId }),
        supabase.from("gyms").select("name, timezone").eq("id", gymId).maybeSingle(),
        supabase.from("memberships").select("id, plan_name, fee_paise, duration_months, start_date, end_date, state")
          .eq("member_id", memberId).order("end_date", { ascending: false }).limit(20),
        supabase.from("payments").select("id, receipt_number, amount_paise, payment_method, status, paid_at, membership_id")
          .eq("member_id", memberId).order("paid_at", { ascending: false }).limit(50),
        supabase.from("attendance_logs").select("id, check_in_at, check_in_method")
          .eq("member_id", memberId).order("check_in_at", { ascending: false }).limit(200),
      ]);
      const err = ms.error ?? pays.error ?? visits.error ?? today.error;
      if (err) throw new Error(err.message);
      return {
        today: (today.data as string | null) ?? new Date().toISOString().slice(0, 10),
        gymName: gym.data?.name ?? "Bobby Gym",
        timeZone: gym.data?.timezone ?? "Asia/Kolkata",
        memberships: ms.data ?? [],
        payments: pays.data ?? [],
        visits: visits.data ?? [],
      };
    },
  });

export type MemberOverview = Awaited<ReturnType<NonNullable<ReturnType<typeof memberOverviewQuery>["queryFn"]>>>;

export function currentMembership(o: Pick<MemberOverview, "memberships" | "today">) {
  return o.memberships.find((m) => m.state === "active" && m.start_date <= o.today && m.end_date >= o.today)
    ?? o.memberships.find((m) => m.state === "active" && m.start_date > o.today)
    ?? null;
}
