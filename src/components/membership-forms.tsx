import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { memberErrorMessage } from "@/lib/members";
import { rupees, todayISO } from "@/lib/memberships";

function Actions({ busy, label, onCancel }: { busy: boolean; label: string; onCancel: () => void }) {
  return (
    <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <button type="button" onClick={onCancel} className="rounded-md border px-4 py-2 text-sm">Cancel</button>
      <button disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
        {busy && <LoaderCircle className="h-4 w-4 animate-spin" />} {label}
      </button>
    </div>
  );
}

export function useActivePlans(gym: string) {
  return useQuery({
    queryKey: ["admin", "plans", gym, "active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("membership_plans")
        .select("id, name, price_paise, duration_months").eq("gym_id", gym).eq("is_active", true).order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Assign (new) or renew. Plan name, fee, duration and end date are filled in by the database. */
export function AssignMembershipForm({ gym, memberId, renew, onDone, onCancel }: {
  gym: string; memberId?: string; renew?: boolean; onDone: () => void; onCancel: () => void;
}) {
  const plans = useActivePlans(gym);
  const members = useQuery({
    enabled: !memberId,
    queryKey: ["admin", "members", gym, "picker"],
    queryFn: async () => {
      const { data, error } = await supabase.from("members").select("id, full_name, member_code, phone")
        .eq("gym_id", gym).neq("status", "archived").order("full_name").limit(2000);
      if (error) throw error;
      return data ?? [];
    },
  });
  const [member, setMember] = useState(memberId ?? "");
  const [plan, setPlan] = useState("");
  const [start, setStart] = useState(renew ? "" : todayISO());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!member || !plan) return setErr("Choose a member and a plan.");
    if (!renew && !/^\d{4}-\d{2}-\d{2}$/.test(start)) return setErr("Pick a start date.");
    setBusy(true); setErr(null);
    const { error } = renew
      ? await supabase.rpc("renew_membership", { _member: member, _plan: plan, ...(start ? { _start: start } : {}) })
      // Trigger memberships_before_insert fills plan_name, fee_paise, duration_months and end_date.
      : await supabase.from("memberships").insert({ gym_id: gym, member_id: member, plan_id: plan, start_date: start } as never);
    setBusy(false);
    if (error) return setErr(memberErrorMessage(error) === "Could not save. Please try again." ? error.message : memberErrorMessage(error));
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {!memberId && (
        <label className="block text-sm">Member
          <select className="field mt-1" value={member} onChange={(e) => setMember(e.target.value)} disabled={members.isPending}>
            <option value="">{members.isPending ? "Loading…" : "Select member"}</option>
            {members.data?.map((m) => <option key={m.id} value={m.id}>{m.full_name} · {m.member_code} · {m.phone}</option>)}
          </select>
        </label>
      )}
      <label className="block text-sm">Plan
        <select className="field mt-1" value={plan} onChange={(e) => setPlan(e.target.value)} disabled={plans.isPending}>
          <option value="">{plans.isPending ? "Loading…" : "Select plan"}</option>
          {plans.data?.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.duration_months} mo · {rupees(p.price_paise)}</option>)}
        </select>
      </label>
      <label className="block text-sm">Start date{renew && " (leave empty to start after the current end date)"}
        <input type="date" className="field mt-1" value={start} onChange={(e) => setStart(e.target.value)} />
      </label>
      {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
      <Actions busy={busy} label={renew ? "Renew" : "Assign membership"} onCancel={onCancel} />
    </form>
  );
}

export function StateChangeForm({ id, action, onDone, onCancel }: {
  id: string; action: "pause" | "cancel" | "resume"; onDone: () => void; onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (action === "cancel" && reason.trim().length < 3) return setErr("Enter a reason.");
    setBusy(true); setErr(null);
    const { error } = await supabase.rpc("change_membership_state", { _id: id, _action: action, ...(reason.trim() ? { _reason: reason.trim() } : {}) });
    setBusy(false);
    if (error) return setErr(error.message);
    onDone();
  }
  return (
    <form onSubmit={submit}>
      <p className="text-sm text-muted-foreground">
        {action === "pause" ? "The membership pauses today. Resuming later extends the end date by the paused days."
          : action === "resume" ? "Resume today; the end date is extended by the paused days."
          : "The membership is cancelled today. The record is kept."}
      </p>
      {action !== "resume" && (
        <label className="mt-4 block text-sm">Reason{action === "pause" && " (optional)"}
          <textarea className="field mt-1" rows={3} value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
        </label>
      )}
      {err && <p role="alert" className="mt-3 text-sm text-destructive">{err}</p>}
      <Actions busy={busy} label={action === "pause" ? "Pause" : action === "resume" ? "Resume" : "Cancel membership"} onCancel={onCancel} />
    </form>
  );
}

type Plan = { id?: string; name: string; description: string | null; price_paise: number; duration_months: number; benefits: string[]; is_active: boolean };

export function PlanForm({ gym, initial, onDone, onCancel }: { gym: string; initial?: Plan | undefined; onDone: () => void; onCancel: () => void }) {
  const [v, setV] = useState({
    name: initial?.name ?? "", description: initial?.description ?? "",
    price: initial ? String(initial.price_paise / 100) : "", months: String(initial?.duration_months ?? 1),
    benefits: (initial?.benefits ?? []).join("\n"), active: initial?.is_active ?? true,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const price = Number(v.price), months = Number(v.months);
    if (v.name.trim().length < 2) return setErr("Enter a plan name.");
    if (!Number.isFinite(price) || price < 0) return setErr("Enter a valid price.");
    if (!Number.isInteger(months) || months < 1 || months > 60) return setErr("Duration must be 1–60 months.");
    const row = {
      name: v.name.trim(), description: v.description.trim() || null, price_paise: Math.round(price * 100),
      duration_months: months, benefits: v.benefits.split("\n").map((b) => b.trim()).filter(Boolean), is_active: v.active,
    };
    setBusy(true); setErr(null);
    const { error } = initial?.id
      ? await supabase.from("membership_plans").update(row).eq("id", initial.id).eq("gym_id", gym)
      : await supabase.from("membership_plans").insert({ ...row, gym_id: gym });
    setBusy(false);
    if (error) return setErr(/row-level security|permission/i.test(error.message) ? "Only the gym owner can change plans." : error.message);
    onDone();
  }
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });
  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <label className="block text-sm sm:col-span-2">Name<input className="field mt-1" value={v.name} onChange={set("name")} maxLength={80} /></label>
      <label className="block text-sm">Price (₹)<input className="field mt-1" inputMode="decimal" value={v.price} onChange={set("price")} /></label>
      <label className="block text-sm">Duration (months)<input className="field mt-1" inputMode="numeric" value={v.months} onChange={set("months")} /></label>
      <label className="block text-sm sm:col-span-2">Description<textarea className="field mt-1" rows={2} value={v.description} onChange={set("description")} /></label>
      <label className="block text-sm sm:col-span-2">Benefits (one per line)<textarea className="field mt-1" rows={4} value={v.benefits} onChange={set("benefits")} /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.active} onChange={(e) => setV({ ...v, active: e.target.checked })} /> Active (shown on website)</label>
      {err && <p role="alert" className="text-sm text-destructive sm:col-span-2">{err}</p>}
      <div className="sm:col-span-2"><Actions busy={busy} label={initial?.id ? "Save plan" : "Add plan"} onCancel={onCancel} /></div>
    </form>
  );
}
