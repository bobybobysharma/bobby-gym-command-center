import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, RotateCcw } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";

/**
 * The member's entry pass. The QR encodes the pass code verbatim, which is what
 * `record_qr_check_in()` looks up, so a printed or on-screen pass scans the same way.
 *
 * Rotating issues a fresh code (the database generates it) and instantly invalidates
 * the printed one — used when a pass is shared or a member leaves.
 */
export function MemberQrPass({ gym, memberId }: { gym: string; memberId: string }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["admin", "qr-pass", gym, memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("member_qr_passes")
        .select("qr_token, is_active, rotated_at")
        .eq("member_id", memberId)
        .eq("gym_id", gym)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  async function run(action: () => Promise<{ error: { message: string } | null }>, done: string) {
    setBusy(true);
    setNotice(null);
    const { error } = await action();
    setBusy(false);
    if (error) {
      setNotice(/row-level security|permission/i.test(error.message) ? "Only the gym owner or reception can change QR passes." : "Could not change the QR pass.");
      return;
    }
    setNotice(done);
    qc.invalidateQueries({ queryKey: ["admin", "qr-pass", gym, memberId] });
  }

  if (q.isPending) return <p className="mt-3 text-muted-foreground">Loading QR pass…</p>;
  if (q.isError)
    return (
      <div role="alert" className="mt-3 rounded-lg border border-destructive/50 p-4">
        <p>Could not load QR pass.</p>
        <button className="mt-2 text-sm text-primary underline" onClick={() => q.refetch()}>
          Try again
        </button>
      </div>
    );

  const pass = q.data;
  if (!pass)
    return (
      <div className="mt-3 rounded-lg border bg-card p-4">
        <p className="text-sm text-muted-foreground">This member has no QR pass yet.</p>
        <button
          disabled={busy}
          onClick={() =>
            run(async () => await supabase.from("member_qr_passes").insert({ member_id: memberId, gym_id: gym }), "QR pass created.")
          }
          className="mt-3 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy ? "Creating…" : "Create QR pass"}
        </button>
        {notice && <p aria-live="polite" className="mt-3 text-sm">{notice}</p>}
      </div>
    );

  return (
    <div className="mt-3 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-start gap-5">
        <div className="rounded-md border bg-white p-3">
          <QRCodeSVG value={pass.qr_token} size={168} aria-label="Member QR pass" />
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase text-muted-foreground">Pass code</p>
          <p className="mt-1 font-mono text-sm break-all">{pass.qr_token}</p>
          <p className="mt-3 text-sm">
            <span className={pass.is_active ? "text-success" : "text-destructive"}>{pass.is_active ? "Active" : "Deactivated"}</span>
            <span className="text-muted-foreground"> · issued {new Date(pass.rotated_at).toLocaleDateString()}</span>
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              disabled={busy}
              onClick={() =>
                run(async () => {
                  // Unique on member_id: drop the row, then insert lets the database mint a new code.
                  const del = await supabase.from("member_qr_passes").delete().eq("member_id", memberId).eq("gym_id", gym);
                  if (del.error) return del;
                  return await supabase.from("member_qr_passes").insert({ member_id: memberId, gym_id: gym });
                }, "New pass code issued.")
              }
              className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm disabled:opacity-60"
            >
              {busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RotateCcw className="h-4 w-4" aria-hidden="true" />}
              Rotate code
            </button>
            <button
              disabled={busy}
              onClick={() =>
                run(
                  async () => await supabase.from("member_qr_passes").update({ is_active: !pass.is_active }).eq("member_id", memberId).eq("gym_id", gym),
                  pass.is_active ? "Pass deactivated." : "Pass activated.",
                )
              }
              className="rounded-md border px-4 py-2 text-sm disabled:opacity-60"
            >
              {pass.is_active ? "Deactivate" : "Activate"}
            </button>
          </div>
        </div>
      </div>
      {notice && <p aria-live="polite" className="mt-3 text-sm">{notice}</p>}
    </div>
  );
}
