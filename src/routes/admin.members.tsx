import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MEMBER_STATUSES, memberErrorMessage, type MemberStatus } from "@/lib/members";
import { MemberForm, Modal } from "@/components/member-form";

export const Route = createFileRoute("/admin/members")({ component: MembersPage });

const PAGE = 25;

function MembersPage() {
  const { access } = Route.useRouteContext();
  const gym = access.gymId;
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | MemberStatus>("all");
  const [page, setPage] = useState(0);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["admin", "members", gym],
    queryFn: async () => {
      const { data, error } = await supabase.from("members")
        .select("id, member_code, full_name, phone, email, joined_on, status")
        .eq("gym_id", gym).order("created_at", { ascending: false }).limit(2000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (q.data ?? []).filter((m) =>
      (status === "all" ? m.status !== "archived" : m.status === status) &&
      (!s || [m.full_name, m.phone, m.email, m.member_code].some((x) => x?.toLowerCase().includes(s))));
  }, [q.data, search, status]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const shown = rows.slice(page * PAGE, page * PAGE + PAGE);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Members</h1>
        <div className="flex gap-2">
          <button onClick={() => q.refetch()} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm" aria-label="Refresh">
            <RefreshCw className={`h-4 w-4 ${q.isFetching ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button onClick={() => setAdding(true)} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
            <Plus className="h-4 w-4" /> Add member
          </button>
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input className="field sm:max-w-xs" placeholder="Search name, phone, email, ID…" value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }} aria-label="Search members" />
        <select className="field sm:w-44" value={status} aria-label="Filter by status"
          onChange={(e) => { setStatus(e.target.value as "all" | MemberStatus); setPage(0); }}>
          <option value="all">All (not archived)</option>
          {MEMBER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {notice && <p aria-live="polite" className="mt-3 text-sm text-muted-foreground">{notice}</p>}
      {q.isPending && <p className="mt-6 text-muted-foreground">Loading members…</p>}
      {q.isError && (
        <div role="alert" className="mt-6 rounded-lg border border-destructive/50 p-4">
          <p>Could not load members.</p>
          <button className="mt-2 text-sm text-primary underline" onClick={() => q.refetch()}>Try again</button>
        </div>
      )}
      {q.data && rows.length === 0 && (
        <p className="mt-6 rounded-lg border bg-card p-4 text-muted-foreground">
          {q.data.length === 0 ? "No members yet. Add your first member." : "No members match your search."}
        </p>
      )}
      {shown.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>{["Member ID", "Name", "Phone", "Email", "Registered", "Status"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
            </thead>
            <tbody>
              {shown.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="px-4 py-3 font-mono">{m.member_code}</td>
                  <td className="px-4 py-3"><Link to="/admin/members/$memberId" params={{ memberId: m.id }} className="font-semibold text-primary">{m.full_name}</Link></td>
                  <td className="px-4 py-3 whitespace-nowrap">{m.phone}</td>
                  <td className="px-4 py-3 break-all">{m.email ?? "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(m.joined_on).toLocaleDateString()}</td>
                  <td className="px-4 py-3 capitalize">{m.status}</td>
                </tr>
              ))}
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
      {adding && (
        <Modal title="Add member" onClose={() => setAdding(false)}>
          <MemberForm submitLabel="Add member" onCancel={() => setAdding(false)} onSubmit={async (v) => {
            // gym_id comes from the verified access context; RLS (can_manage_gym) re-checks it.
            // member_code is overwritten by the members_before_write trigger.
            const { error } = await supabase.from("members").insert({ ...v, gym_id: gym, member_code: "" });
            if (error) return memberErrorMessage(error);
            setAdding(false); setNotice("Member added.");
            qc.invalidateQueries({ queryKey: ["admin"] });
            return null;
          }} />
        </Modal>
      )}
    </div>
  );
}
