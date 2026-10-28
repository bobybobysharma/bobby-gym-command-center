import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MEMBER_STATUSES, memberErrorMessage, type MemberStatus } from "@/lib/members";
import { MemberForm, Modal } from "@/components/member-form";
import { AssignMembershipForm } from "@/components/membership-forms";
import { MemberQrPass } from "@/components/member-qr-pass";


export const Route = createFileRoute("/admin/members_/$memberId")({ component: MemberDetail });

function MemberDetail() {
  const { access } = Route.useRouteContext();
  const { memberId } = Route.useParams();
  const gym = access.gymId;
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const q = useQuery({
    queryKey: ["admin", "member", gym, memberId],
    queryFn: async () => {
      const [m, ms] = await Promise.all([
        supabase.from("members").select("*").eq("id", memberId).eq("gym_id", gym).maybeSingle(),
        supabase.from("memberships").select("id, plan_name, start_date, end_date, fee_paise, cancelled_on, paused_on")
          .eq("member_id", memberId).eq("gym_id", gym).order("start_date", { ascending: false }),
      ]);
      if (m.error) throw m.error;
      return { member: m.data, history: ms.error ? null : ms.data ?? [] };
    },
  });

  async function setStatus(next: MemberStatus) {
    if (next === "archived" && !confirm("Archive this member? They stay in records and can be restored.")) return;
    setBusy(true);
    const { error } = await supabase.from("members").update({ status: next }).eq("id", memberId).eq("gym_id", gym);
    setBusy(false);
    setNotice(error ? memberErrorMessage(error) : `Status set to ${next}.`);
    if (!error) qc.invalidateQueries({ queryKey: ["admin"] });
  }

  const back = <Link to="/admin/members" className="inline-flex items-center gap-1 text-sm text-primary"><ArrowLeft className="h-4 w-4" /> Members</Link>;
  if (q.isPending) return <div>{back}<p className="mt-6 text-muted-foreground">Loading member…</p></div>;
  if (q.isError) return (
    <div>{back}<div role="alert" className="mt-6 rounded-lg border border-destructive/50 p-4"><p>Could not load member.</p>
      <button className="mt-2 text-sm text-primary underline" onClick={() => q.refetch()}>Try again</button></div></div>
  );
  const m = q.data.member;
  if (!m) return <div>{back}<p className="mt-6 rounded-lg border bg-card p-4 text-muted-foreground">Member not found, or you don't have access.</p></div>;

  const info: [string, string | null][] = [
    ["Member ID", m.member_code], ["Phone", m.phone], ["Email", m.email],
    ["Registered", new Date(m.joined_on).toLocaleDateString()],
    ["Emergency contact", m.emergency_contact_name], ["Emergency phone", m.emergency_contact_phone],
  ];

  return (
    <div>
      {back}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl break-words">{m.full_name}</h1>
        <div className="flex flex-wrap gap-2">
          <select className="field w-36" value={m.status} disabled={busy} aria-label="Member status"
            onChange={(e) => setStatus(e.target.value as MemberStatus)}>
            {MEMBER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={() => setAssigning(true)} className="rounded-md border px-4 py-2 text-sm">Assign membership</button>
          <button onClick={() => setEditing(true)} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Edit</button>
        </div>
      </div>
      {notice && <p aria-live="polite" className="mt-3 text-sm text-muted-foreground">{notice}</p>}
      <dl className="mt-6 grid gap-4 rounded-lg border bg-card p-5 sm:grid-cols-2 lg:grid-cols-3">
        {info.map(([k, val]) => <div key={k} className="min-w-0"><dt className="text-xs uppercase text-muted-foreground">{k}</dt><dd className="break-words">{val || "—"}</dd></div>)}
      </dl>
      <h2 className="mt-8 font-display text-2xl">Membership history</h2>
      {q.data.history === null ? <p className="mt-3 text-muted-foreground">Membership history isn't available to your account.</p>
        : q.data.history.length === 0 ? <p className="mt-3 rounded-lg border bg-card p-4 text-muted-foreground">No memberships recorded.</p>
        : (
          <ul className="mt-3 space-y-2">
            {q.data.history.map((h) => (
              <li key={h.id} className="rounded-lg border bg-card p-4 text-sm">
                <p className="font-semibold">{h.plan_name}</p>
                <p className="text-muted-foreground">{h.start_date} → {h.end_date} · ₹{(h.fee_paise / 100).toLocaleString("en-IN")}
                  {h.cancelled_on ? " · cancelled" : h.paused_on ? " · paused" : ""}</p>
              </li>
            ))}
          </ul>
        )}
      <h2 className="mt-8 font-display text-2xl">QR pass</h2>
      <MemberQrPass gym={gym} memberId={memberId} />

      {assigning && (
        <Modal title="Assign membership" onClose={() => setAssigning(false)}>
          <AssignMembershipForm gym={gym} memberId={memberId} onCancel={() => setAssigning(false)}
            onDone={() => { setAssigning(false); setNotice("Membership assigned."); qc.invalidateQueries({ queryKey: ["admin"] }); }} />
        </Modal>
      )}
      {editing && (
        <Modal title="Edit member" onClose={() => setEditing(false)}>
          <MemberForm submitLabel="Save changes" onCancel={() => setEditing(false)}
            initial={{ full_name: m.full_name, phone: m.phone, email: m.email ?? "", joined_on: m.joined_on,
              emergency_contact_name: m.emergency_contact_name ?? "", emergency_contact_phone: m.emergency_contact_phone ?? "" }}
            onSubmit={async (v) => {
              const { error } = await supabase.from("members").update(v).eq("id", memberId).eq("gym_id", gym);
              if (error) return memberErrorMessage(error);
              setEditing(false); setNotice("Member updated.");
              qc.invalidateQueries({ queryKey: ["admin"] });
              return null;
            }} />
        </Modal>
      )}
    </div>
  );
}
