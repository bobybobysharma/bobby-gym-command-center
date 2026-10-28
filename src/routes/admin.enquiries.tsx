import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/enquiries")({
  component: EnquiriesPage,
});

const STATUSES = ["new", "contacted", "approved", "rejected", "converted"] as const;
type Status = (typeof STATUSES)[number];

function EnquiriesPage() {
  const { access } = Route.useRouteContext();
  const gym = access.gymId;
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | Status>("all");
  const [notice, setNotice] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["admin", "enquiries", gym],
    queryFn: async () => {
      const [enq, plans] = await Promise.all([
        supabase.from("enquiries")
          .select("id, kind, full_name, phone, email, plan_id, message, status, created_at, reviewed_at")
          .eq("gym_id", gym).order("created_at", { ascending: false }).limit(500),
        supabase.from("membership_plans").select("id, name").eq("gym_id", gym),
      ]);
      if (enq.error) throw enq.error;
      if (plans.error) throw plans.error;
      const planNames = Object.fromEntries((plans.data ?? []).map((p) => [p.id, p.name]));
      return (enq.data ?? []).map((e) => ({ ...e, plan_name: e.plan_id ? planNames[e.plan_id] ?? "Unknown plan" : null }));
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: Status }) => {
      const { data, error } = await supabase.from("enquiries")
        .update({ status: next, reviewed_by: access.userId, reviewed_at: new Date().toISOString() })
        .eq("id", id).eq("gym_id", gym).select("id");
      if (error) throw error;
      // RLS-blocked updates return no error but change zero rows.
      if (!data || data.length === 0) throw new Error("No rows updated");
    },
    onSuccess: () => {
      setNotice("Status updated.");
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: () => setNotice("Could not update status. You may not have permission."),
  });

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    const digits = s.replace(/\D/g, "");
    return (q.data ?? []).filter((e) =>
      (status === "all" || e.status === status) &&
      (!s || [e.full_name, e.phone, e.email, e.message, e.plan_name].some((v) => v?.toLowerCase().includes(s)) ||
        (digits.length >= 3 && !!e.phone?.replace(/\D/g, "").includes(digits))),
    );
  }, [q.data, search, status]);

  return (
    <div>
      <h1 className="font-display text-3xl">Enquiries</h1>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input className="field sm:max-w-xs" placeholder="Search name, phone, email…" value={search}
          onChange={(e) => setSearch(e.target.value)} aria-label="Search enquiries" />
        <select className="field sm:w-44" value={status} onChange={(e) => setStatus(e.target.value as "all" | Status)} aria-label="Filter by status">
          <option value="all">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {notice && <p aria-live="polite" className="mt-3 text-sm text-muted-foreground">{notice}</p>}
      {q.isPending && <p className="mt-6 text-muted-foreground">Loading enquiries…</p>}
      {q.isError && (
        <div role="alert" className="mt-6 rounded-lg border border-destructive/50 p-4">
          <p>Could not load enquiries.</p>
          <button className="mt-2 text-sm text-primary underline" onClick={() => q.refetch()}>Try again</button>
        </div>
      )}
      {q.data && rows.length === 0 && (
        <p className="mt-6 rounded-lg border bg-card p-4 text-muted-foreground">
          {q.data.length === 0 ? "No enquiries yet." : "No enquiries match your search."}
        </p>
      )}
      <ul className="mt-6 space-y-3">
        {rows.map((e) => (
          <li key={e.id} className="rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold break-words">{e.full_name}</p>
                <p className="text-xs uppercase text-muted-foreground">{e.kind} · {new Date(e.created_at).toLocaleString()}
                  {e.reviewed_at && <> · reviewed {new Date(e.reviewed_at).toLocaleString()}</>}</p>
              </div>
              <select className="field w-36" value={e.status} disabled={update.isPending}
                aria-label={`Status for ${e.full_name}`}
                onChange={(ev) => update.mutate({ id: e.id, next: ev.target.value as Status })}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <dl className="mt-3 grid gap-1 text-sm sm:grid-cols-3">
              <div><dt className="text-muted-foreground">Phone</dt><dd>{e.phone ? <a className="text-primary" href={`tel:${e.phone}`}>{e.phone}</a> : "—"}</dd></div>
              <div className="min-w-0"><dt className="text-muted-foreground">Email</dt><dd className="break-all">{e.email ? <a className="text-primary" href={`mailto:${e.email}`}>{e.email}</a> : "—"}</dd></div>
              <div><dt className="text-muted-foreground">Plan</dt><dd>{e.plan_name ?? "—"}</dd></div>
            </dl>
            {e.message && <p className="mt-3 whitespace-pre-wrap break-words text-sm">{e.message}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
