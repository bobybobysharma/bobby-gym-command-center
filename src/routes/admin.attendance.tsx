import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { LoaderCircle, QrCode, RefreshCw, Trash2, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { QrScanner } from "@/components/qr-scanner";
import { ReceptionCheckIn } from "@/components/reception-checkin";
import {
  CHECK_IN_METHODS,
  checkInTokenSchema,
  filterAttendance,
  parseCheckInResult,
  duplicateCheckInNotice,
  summariseAttendance,
  type AttendanceRange,
  type AttendanceRow,
  type CheckInOutcome,
  type CheckInMethod,
} from "@/lib/attendance";

export const Route = createFileRoute("/admin/attendance")({ component: AttendancePage });

const RANGE_LABELS: Record<AttendanceRange, string> = { today: "Today", "7": "Last 7 days", "14": "Last 14 days" };

type Member = { id: string; full_name: string; member_code: string; phone: string | null; status: string };

function AttendancePage() {
  const { access } = Route.useRouteContext();
  const gym = access.gymId;
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [method, setMethod] = useState<"all" | CheckInMethod>("all");
  const [range, setRange] = useState<AttendanceRange>("today");
  const [token, setToken] = useState("");
  const [member, setMember] = useState("");
  const [note, setNote] = useState("");
  const [result, setResult] = useState<CheckInOutcome | null>(null);

  const q = useQuery({
    queryKey: ["admin", "attendance", gym],
    queryFn: async () => {
      const [todayRes, gymRes] = await Promise.all([
        supabase.rpc("gym_today", { _gym: gym }),
        supabase.from("gyms").select("timezone, name").eq("id", gym).maybeSingle(),
      ]);
      const today: string = (todayRes.data as string | null) ?? new Date().toISOString().slice(0, 10);
      const timeZone: string = gymRes.data?.timezone ?? "Asia/Kolkata";
      const gymName: string = gymRes.data?.name ?? "Bobby Gym";

      const [logs, people] = await Promise.all([
        supabase
          .from("attendance_logs")
          .select("id, member_id, check_in_at, check_in_method, notes")
          .eq("gym_id", gym)
          .gte("check_in_at", new Date(Date.now() - 14 * 86_400_000).toISOString())
          .order("check_in_at", { ascending: false })
          .limit(1000),
        supabase
          .from("members")
          .select("id, full_name, member_code, phone, status")
          .eq("gym_id", gym)
          .neq("status", "archived")
          .order("full_name")
          .limit(2000),
      ]);
      const err = logs.error || people.error;
      if (err) throw err;

      const byId = new Map<string, Member>((people.data ?? []).map((m) => [m.id, m]));
      const rows: AttendanceRow[] = (logs.data ?? []).map((l) => ({
        ...l,
        member: byId.get(l.member_id) ?? null,
      }));
      return { today, timeZone, gymName, rows, members: people.data ?? [] };
    },
  });

  const today = q.data?.today ?? new Date().toISOString().slice(0, 10);
  const timeZone = q.data?.timeZone ?? "Asia/Kolkata";
  const rows = q.data?.rows ?? [];

  const filter = { search, method, range, today, timeZone };
  const shown = useMemo(() => filterAttendance(rows, filter), [rows, search, method, range, today, timeZone]);
  const summary = useMemo(() => summariseAttendance(rows, filter), [rows, today, timeZone]);

  // Most recent check-in per member, so the manual form can warn the way a QR re-scan would.
  const lastByMember = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) if (!m.has(r.member_id)) m.set(r.member_id, r.check_in_at);
    return m;
  }, [rows]);

  function record(outcome: CheckInOutcome) {
    setResult(outcome);
    if (outcome.ok) qc.invalidateQueries({ queryKey: ["admin"] });
  }

  const scan = useMutation({
    mutationFn: async (raw: string) => {
      const parsed = checkInTokenSchema.safeParse(raw);
      if (!parsed.success) {
        return { ok: false as const, reason: "unknown" as const, message: parsed.error.issues[0]?.message ?? "Enter the pass code from the member's QR pass." };
      }
      // The database decides: staff-only, pass must be active, member must be active,
      // and a second scan inside 60 minutes is refused.
      const { data, error } = await supabase.rpc("record_qr_check_in", { _gym: gym, _qr_token: parsed.data });
      return parseCheckInResult(error ? null : data);
    },
    onMutate: () => setResult(null),
    onSuccess: record,
  });

  const manual = useMutation({
    mutationFn: async () => {
      if (!member) return { ok: false as const, reason: "unknown" as const, message: "Choose a member to check in." };
      // Early hint only; the database (record_manual_check_in) enforces the 60-minute rule atomically.
      const warning = duplicateCheckInNotice(lastByMember.get(member) ?? null);
      if (warning) return { ok: false as const, reason: "duplicate" as const, message: warning };
      const { data, error } = await supabase.rpc("record_manual_check_in" as never, {
        _gym: gym, _member: member, _notes: note.trim() || null,
      } as never);
      if (error) {
        return {
          ok: false as const,
          reason: "unknown" as const,
          message: /not authorised|permission/i.test(error.message)
            ? "You don't have permission to record attendance."
            : "Check-in could not be recorded. Please try again.",
        };
      }
      return parseCheckInResult(data);
    },
    onMutate: () => setResult(null),
    onSuccess: (outcome) => {
      record(outcome);
      if (outcome.ok) {
        setMember("");
        setNote("");
      }
    },
  });

  const undo = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from("attendance_logs").delete().eq("id", id).eq("gym_id", gym).select("id");
      if (error) throw error;
      // RLS-blocked deletes return no error but remove zero rows.
      if (!data || data.length === 0) throw new Error("No rows removed");
    },
    onSuccess: () => {
      setResult({ ok: true, message: "Check-in removed.", at: new Date().toISOString() });
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: () => setResult({ ok: false, reason: "unknown", message: "Could not remove that check-in." }),
  });

  const busy = scan.isPending || manual.isPending;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Attendance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {today} · {timeZone}
          </p>
        </div>
        <button
          onClick={() => q.refetch()}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
          aria-label="Refresh attendance"
        >
          <RefreshCw className={`h-4 w-4 ${q.isFetching ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Check-ins today" value={summary.visits} />
        <Stat label="Members in today" value={summary.members} />
        <Stat label="QR / manual today" value={`${summary.qr} / ${summary.manual}`} />
      </div>

      <div className="mt-6">
        <ReceptionCheckIn gymId={gym} gymName={q.data?.gymName ?? "Bobby Gym"} todayCount={summary.visits} onTick={() => void q.refetch()} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          <QrScanner onToken={(t) => { setToken(t); scan.mutate(t); }} disabled={busy} />

          <div className="rounded-lg border bg-card p-4">
            <label htmlFor="qr-token" className="text-sm font-semibold">
              Or type a pass code
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="qr-token"
                className="field min-w-0 flex-1"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Pass code from the QR pass"
                aria-describedby="qr-token-help"
              />
              <button
                type="button"
                onClick={() => scan.mutate(token)}
                disabled={busy || !token.trim()}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {scan.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <QrCode className="h-4 w-4" aria-hidden="true" />}
                Check in
              </button>
            </div>
            <p id="qr-token-help" className="mt-2 text-xs text-muted-foreground">
              Found on the member's page under “QR pass”.
            </p>
          </div>
        </section>

        <section className="rounded-lg border bg-card p-4">
          <p className="text-sm font-semibold">Manual check-in</p>
          <p className="mt-1 text-xs text-muted-foreground">For members without their phone or pass.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              manual.mutate();
            }}
            className="mt-4 space-y-4"
          >
            <label className="block text-sm">
              <span className="text-muted-foreground">Member *</span>
              <select
                className="field mt-1"
                value={member}
                onChange={(e) => setMember(e.target.value)}
                aria-label="Member to check in"
                disabled={busy || q.isPending}
              >
                <option value="">{q.isPending ? "Loading…" : "Select member"}</option>
                {(q.data?.members ?? [])
                  .filter((m) => m.status === "active")
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} · {m.member_code}
                      {lastByMember.has(m.id) ? " · already in" : ""}
                    </option>
                  ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Note (optional)</span>
              <input
                className="field mt-1"
                value={note}
                maxLength={200}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. forgot phone"
              />
            </label>
            <button
              type="submit"
              disabled={busy || !member}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {manual.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <UserCheck className="h-4 w-4" aria-hidden="true" />}
              {manual.isPending ? "Checking in…" : "Check in"}
            </button>
          </form>
        </section>
      </div>

      <div aria-live="polite" aria-atomic="true" className="mt-6">
        {busy && <p className="text-sm text-muted-foreground">Recording check-in…</p>}
        {result?.ok && (
          <p className="rounded-lg border border-success/40 bg-success/10 p-3 text-sm">
            {result.message}
            {result.memberName && <span className="font-semibold"> {result.memberName}</span>}
            {result.memberCode && <span className="text-muted-foreground"> · {result.memberCode}</span>}
          </p>
        )}
        {result && !result.ok && (
          <p role="alert" className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm">
            {result.message}
            {result.memberName && <span className="font-semibold"> {result.memberName}</span>}
          </p>
        )}
      </div>

      <h2 className="mt-10 font-display text-2xl">Check-in log</h2>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          className="field sm:max-w-xs"
          placeholder="Search name, ID, phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search check-ins"
        />
        <select className="field sm:w-40" value={method} aria-label="Filter by method" onChange={(e) => setMethod(e.target.value as "all" | CheckInMethod)}>
          <option value="all">All methods</option>
          {CHECK_IN_METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select className="field sm:w-44" value={range} aria-label="Filter by period" onChange={(e) => setRange(e.target.value as AttendanceRange)}>
          {(Object.keys(RANGE_LABELS) as AttendanceRange[]).map((r) => (
            <option key={r} value={r}>
              {RANGE_LABELS[r]}
            </option>
          ))}
        </select>
      </div>

      {q.isPending && <p className="mt-6 text-muted-foreground">Loading attendance…</p>}
      {q.isError && (
        <div role="alert" className="mt-6 rounded-lg border border-destructive/50 p-4">
          <p>Could not load attendance.</p>
          <button className="mt-2 text-sm text-primary underline" onClick={() => q.refetch()}>
            Try again
          </button>
        </div>
      )}
      {q.data && shown.length === 0 && (
        <p className="mt-6 rounded-lg border bg-card p-4 text-muted-foreground">
          {rows.length === 0 ? "No check-ins yet." : "No check-ins match your filters."}
        </p>
      )}

      {shown.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                {["Time", "Member ID", "Name", "Phone", "Method", "Note", ""].map((h) => (
                  <th key={h} className="px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(r.check_in_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                  <td className="px-4 py-3 font-mono">{r.member?.member_code ?? "—"}</td>
                  <td className="px-4 py-3 break-words">{r.member?.full_name ?? "Removed member"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{r.member?.phone ?? "—"}</td>
                  <td className="px-4 py-3 capitalize">{r.check_in_method}</td>
                  <td className="px-4 py-3 break-words">{r.notes ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        if (confirm("Remove this check-in?")) undo.mutate(r.id);
                      }}
                      disabled={undo.isPending}
                      aria-label={`Remove check-in for ${r.member?.full_name ?? "member"}`}
                      className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Undo
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-display mt-2 text-4xl text-primary">{value}</p>
    </div>
  );
}
