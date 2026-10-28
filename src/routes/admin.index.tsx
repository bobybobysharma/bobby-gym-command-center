import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { zoneStartUTCISO } from "@/lib/attendance";


export const Route = createFileRoute("/admin/")({
  component: Overview,
});

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function Overview() {
  const { access } = Route.useRouteContext();
  const gym = access.gymId;

  const q = useQuery({
    queryKey: ["admin", "overview", gym],
    queryFn: async () => {
      // "Today" is the gym's own day, so a 6am check-in is counted on the right date.
      const [todayRes, gymRes] = await Promise.all([
        supabase.rpc("gym_today", { _gym: gym }),
        supabase.from("gyms").select("timezone").eq("id", gym).maybeSingle(),
      ]);
      const today = (todayRes.data as string | null) ?? isoDate(new Date());
      const timeZone = gymRes.data?.timezone ?? "Asia/Kolkata";
      const soon = isoDate(new Date(Date.parse(`${today}T00:00:00Z`) + 7 * 86400000));
      const [members, active, expiring, recent, checkedIn] = await Promise.all([
        supabase.from("members").select("id", { count: "exact", head: true }).eq("gym_id", gym).neq("status", "archived"),
        supabase.from("memberships").select("id", { count: "exact", head: true }).eq("gym_id", gym).eq("state", "active").gte("end_date", today),
        supabase.from("memberships").select("id", { count: "exact", head: true }).eq("gym_id", gym).eq("state", "active").gte("end_date", today).lte("end_date", soon),
        supabase.from("enquiries").select("id, full_name, phone, email, status, created_at").eq("gym_id", gym).order("created_at", { ascending: false }).limit(5),
        supabase.from("attendance_logs").select("id", { count: "exact", head: true }).eq("gym_id", gym).gte("check_in_at", zoneStartUTCISO(today, timeZone)),
      ]);
      const err = members.error || active.error || expiring.error || recent.error || checkedIn.error;
      if (err) throw err;
      return { members: members.count ?? 0, active: active.count ?? 0, expiring: expiring.count ?? 0, checkedIn: checkedIn.count ?? 0, recent: recent.data ?? [] };
    },
  });


  return (
    <div>
      <h1 className="font-display text-3xl">Overview</h1>
      {q.isPending && <p className="mt-6 text-muted-foreground">Loading dashboard…</p>}
      {q.isError && (
        <div role="alert" className="mt-6 rounded-lg border border-destructive/50 p-4">
          <p>Could not load dashboard data.</p>
          <button className="mt-2 text-sm text-primary underline" onClick={() => q.refetch()}>Try again</button>
        </div>
      )}
      {q.data && (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Total members" value={q.data.members} />
            <Stat label="Active memberships" value={q.data.active} />
            <Stat label="Expiring in 7 days" value={q.data.expiring} />
            <Stat label="Checked in today" value={q.data.checkedIn} />
          </div>

          <section className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent enquiries</h2>
              <Link to="/admin/enquiries" className="text-sm text-primary">View all</Link>
            </div>
            {q.data.recent.length === 0 ? (
              <p className="mt-3 rounded-lg border bg-card p-4 text-muted-foreground">No enquiries yet.</p>
            ) : (
              <ul className="mt-3 divide-y rounded-lg border bg-card">
                {q.data.recent.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
                    <div className="min-w-0">
                      <p className="font-medium break-words">{e.full_name}</p>
                      <p className="text-sm text-muted-foreground break-all">{e.phone ?? e.email}</p>
                    </div>
                    <div className="text-right text-sm">
                      <span className="rounded bg-accent px-2 py-0.5 capitalize">{e.status}</span>
                      <p className="mt-1 text-muted-foreground">{new Date(e.created_at).toLocaleDateString()}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-display mt-2 text-4xl text-primary">{value}</p>
    </div>
  );
}
