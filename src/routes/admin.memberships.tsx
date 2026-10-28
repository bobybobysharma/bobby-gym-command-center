import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Modal } from "@/components/member-form";
import { AssignMembershipForm, PlanForm, StateChangeForm } from "@/components/membership-forms";
import { daysUntil, membershipView, rupees, todayISO } from "@/lib/memberships";

export const Route = createFileRoute("/admin/memberships")({ component: MembershipsPage });

const PAGE = 25;
const FILTERS = [
  ["all", "All"], ["active", "Active"], ["exp7", "Expiring ≤ 7 days"], ["exp14", "Expiring ≤ 14 days"],
  ["expired", "Expired"], ["paused", "Paused"], ["cancelled", "Cancelled"],
] as const;
type Filter = (typeof FILTERS)[number][0];
type Dialog = { kind: "assign" } | { kind: "renew"; memberId: string } | { kind: "pause" | "cancel" | "resume"; id: string } | null;

function MembershipsPage() {
  const [tab, setTab] = useState<"memberships" | "plans">("memberships");
  return (
    <div>
      <h1 className="font-display text-3xl">Memberships</h1>
      <div className="mt-4 flex gap-2 border-b" role="tablist">
        {(["memberships", "plans"] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm capitalize ${tab === t ? "border-primary font-semibold text-primary" : "border-transparent text-muted-foreground"}`}>
            {t}
          </button>
        ))}
      </div>
      {tab === "memberships" ? <Directory /> : <Plans />}
    </div>
  );
}

function Directory() {
  const { access } = Route.useRouteContext();
  const gym = access.gymId;
  const qc = useQueryClient();
  const today = todayISO();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(0);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["admin", "memberships", gym],
    queryFn: async () => {
      const { data, error } = await supabase.from("memberships")
        .select("id, member_id, plan_name, start_date, end_date, fee_paise, state, cancel_reason, members(full_name, member_code, phone)")
        .eq("gym_id", gym).order("end_date", { ascending: false }).limit(3000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (q.data ?? []).filter((m) => {
      const view = membershipView(m.state, m.end_date, today);
      const d = daysUntil(m.end_date, today);
      const ok = filter === "all" ? true
        : filter === "exp7" ? view === "active" && d <= 7
        : filter === "exp14" ? view === "active" && d <= 14
        : view === filter;
      const mem = m.members as { full_name: string; phone: string } | null;
      return ok && (!s || [mem?.full_name, mem?.phone, m.plan_name].some((x) => x?.toLowerCase().includes(s)));
    });
  }, [q.data, search, filter, today]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const shown = rows.slice(page * PAGE, page * PAGE + PAGE);

  function done(msg: string) {
    setDialog(null); setNotice(msg);
    qc.invalidateQueries({ queryKey: ["admin"] });
  }

  return (
    <div className="mt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input className="field sm:max-w-xs" placeholder="Search member, phone, plan…" value={search} aria-label="Search memberships"
          onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
        <select className="field sm:w-52" value={filter} aria-label="Filter memberships"
          onChange={(e) => { setFilter(e.target.value as Filter); setPage(0); }}>
          {FILTERS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <div className="flex gap-2 sm:ml-auto">
          <button onClick={() => q.refetch()} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
            <RefreshCw className={`h-4 w-4 ${q.isFetching ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button onClick={() => setDialog({ kind: "assign" })} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
            <Plus className="h-4 w-4" /> Assign membership
          </button>
        </div>
      </div>
      {notice && <p aria-live="polite" className="mt-3 text-sm text-muted-foreground">{notice}</p>}
      {q.isPending && <p className="mt-6 text-muted-foreground">Loading memberships…</p>}
      {q.isError && (
        <div role="alert" className="mt-6 rounded-lg border border-destructive/50 p-4">
          <p>Could not load memberships.</p>
          <button className="mt-2 text-sm text-primary underline" onClick={() => q.refetch()}>Try again</button>
        </div>
      )}
      {q.data && rows.length === 0 && (
        <p className="mt-6 rounded-lg border bg-card p-4 text-muted-foreground">
          {q.data.length === 0 ? "No memberships yet. Assign one to a member." : "No memberships match this filter."}
        </p>
      )}
      {shown.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>{["Member", "Plan", "Start", "End", "Fee", "State", ""].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
            </thead>
            <tbody>
              {shown.map((m) => {
                const mem = m.members as { full_name: string; member_code: string; phone: string } | null;
                const view = membershipView(m.state, m.end_date, today);
                const d = daysUntil(m.end_date, today);
                return (
                  <tr key={m.id} className="border-t align-top">
                    <td className="px-4 py-3">
                      <Link to="/admin/members/$memberId" params={{ memberId: m.member_id }} className="font-semibold text-primary">{mem?.full_name ?? "—"}</Link>
                      <p className="text-xs text-muted-foreground whitespace-nowrap">{mem?.member_code} · {mem?.phone}</p>
                    </td>
                    <td className="px-4 py-3">{m.plan_name}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{m.start_date}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{m.end_date}
                      {view === "active" && d <= 14 && <p className="text-xs text-primary">{d === 0 ? "ends today" : `${d} days left`}</p>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{rupees(m.fee_paise)}</td>
                    <td className="px-4 py-3 capitalize">{view}
                      {m.cancel_reason && <p className="text-xs normal-case text-muted-foreground">{m.cancel_reason}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2 text-xs">
                        {m.state !== "cancelled" && <button className="rounded border px-2 py-1" onClick={() => setDialog({ kind: "renew", memberId: m.member_id })}>Renew</button>}
                        {m.state === "active" && <button className="rounded border px-2 py-1" onClick={() => setDialog({ kind: "pause", id: m.id })}>Pause</button>}
                        {m.state === "paused" && <button className="rounded border px-2 py-1" onClick={() => setDialog({ kind: "resume", id: m.id })}>Resume</button>}
                        {m.state !== "cancelled" && <button className="rounded border border-destructive/50 px-2 py-1 text-destructive" onClick={() => setDialog({ kind: "cancel", id: m.id })}>Cancel</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-3 text-sm">
          <button disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded-md border px-3 py-1 disabled:opacity-50">Previous</button>
          <span>Page {page + 1} of {pages}</span>
          <button disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className="rounded-md border px-3 py-1 disabled:opacity-50">Next</button>
        </div>
      )}
      {dialog?.kind === "assign" && (
        <Modal title="Assign membership" onClose={() => setDialog(null)}>
          <AssignMembershipForm gym={gym} onCancel={() => setDialog(null)} onDone={() => done("Membership assigned.")} />
        </Modal>
      )}
      {dialog?.kind === "renew" && (
        <Modal title="Renew membership" onClose={() => setDialog(null)}>
          <AssignMembershipForm gym={gym} memberId={dialog.memberId} renew onCancel={() => setDialog(null)} onDone={() => done("Membership renewed.")} />
        </Modal>
      )}
      {dialog && (dialog.kind === "pause" || dialog.kind === "cancel" || dialog.kind === "resume") && (
        <Modal title={`${dialog.kind.charAt(0).toUpperCase()}${dialog.kind.slice(1)} membership`} onClose={() => setDialog(null)}>
          <StateChangeForm id={dialog.id} action={dialog.kind} onCancel={() => setDialog(null)} onDone={() => done(`Membership ${dialog.kind === "pause" ? "paused" : dialog.kind === "resume" ? "resumed" : "cancelled"}.`)} />
        </Modal>
      )}
    </div>
  );
}

function Plans() {
  const { access } = Route.useRouteContext();
  const gym = access.gymId;
  const qc = useQueryClient();
  const [editing, setEditing] = useState<"new" | string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["admin", "plans", gym, "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("membership_plans")
        .select("id, name, description, price_paise, duration_months, benefits, is_active").eq("gym_id", gym).order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
  const current = q.data?.find((p) => p.id === editing);
  const canEdit = access.role !== "receptionist";

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{canEdit ? "Active plans appear on the website." : "Only the gym owner can add or edit plans."}</p>
        {canEdit && (
          <button onClick={() => setEditing("new")} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
            <Plus className="h-4 w-4" /> Add plan
          </button>
        )}
      </div>
      {notice && <p aria-live="polite" className="mt-3 text-sm text-muted-foreground">{notice}</p>}
      {q.isPending && <p className="mt-6 text-muted-foreground">Loading plans…</p>}
      {q.isError && <div role="alert" className="mt-6 rounded-lg border border-destructive/50 p-4">Could not load plans. <button className="text-primary underline" onClick={() => q.refetch()}>Try again</button></div>}
      {q.data?.length === 0 && <p className="mt-6 rounded-lg border bg-card p-4 text-muted-foreground">No plans yet.</p>}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {q.data?.map((p) => (
          <div key={p.id} className="min-w-0 rounded-lg border bg-card p-5">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold break-words">{p.name}</p>
              <span className={`text-xs uppercase ${p.is_active ? "text-primary" : "text-muted-foreground"}`}>{p.is_active ? "Active" : "Hidden"}</span>
            </div>
            <p className="mt-1 text-lg">{rupees(p.price_paise)} <span className="text-sm text-muted-foreground">/ {p.duration_months} mo</span></p>
            {p.description && <p className="mt-2 text-sm text-muted-foreground break-words">{p.description}</p>}
            {p.benefits.length > 0 && <ul className="mt-2 list-disc pl-5 text-sm">{p.benefits.map((b) => <li key={b}>{b}</li>)}</ul>}
            {canEdit && <button onClick={() => setEditing(p.id)} className="mt-4 rounded-md border px-3 py-1 text-sm">Edit</button>}
          </div>
        ))}
      </div>
      {editing && (
        <Modal title={editing === "new" ? "Add plan" : "Edit plan"} onClose={() => setEditing(null)}>
          <PlanForm gym={gym} initial={current} onCancel={() => setEditing(null)}
            onDone={() => { setEditing(null); setNotice("Plan saved."); qc.invalidateQueries({ queryKey: ["admin"] }); }} />
        </Modal>
      )}
    </div>
  );
}
