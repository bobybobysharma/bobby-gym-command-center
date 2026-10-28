import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, LoaderCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { QrScanner } from "@/components/qr-scanner";
import { extractChallengeToken, normaliseFallbackCode, parseMemberCheckIn, type MemberCheckInResult } from "@/lib/member-checkin";

export const Route = createFileRoute("/member/check-in")({
  validateSearch: (s: Record<string, unknown>): { t?: string } => (typeof s["t"] === "string" ? { t: s["t"] } : {}),
  component: CheckIn,
});

function CheckIn() {
  const { t } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [result, setResult] = useState<MemberCheckInResult | null>(null);
  const autoRan = useRef(false);

  const m = useMutation({
    mutationFn: async (input: { token?: string; code?: string }) => {
      const { data, error } = await supabase.rpc("member_check_in", { _token: input.token ?? null, _code: input.code ?? null } as never);
      if (error) return parseMemberCheckIn(null);
      return parseMemberCheckIn(data);
    },
    onSuccess: (r) => { setResult(r); if (r.ok) void qc.invalidateQueries({ queryKey: ["member"] }); },
    onError: () => setResult(parseMemberCheckIn(null)),
  });

  // Arrived by pointing the phone's own camera at the reception QR.
  useEffect(() => {
    if (!t || autoRan.current) return;
    autoRan.current = true;
    const token = extractChallengeToken(t);
    navigate({ to: "/member/check-in", search: {}, replace: true });
    if (token) m.mutate({ token });
    else setResult({ ok: false, reason: "invalid_code", message: "That QR code isn't a Bobby Gym check-in code." });
  }, [t]); // eslint-disable-line react-hooks/exhaustive-deps

  function onScan(text: string) {
    if (m.isPending) return;
    const token = extractChallengeToken(text);
    if (!token) { setResult({ ok: false, reason: "invalid_code", message: "That QR code isn't a Bobby Gym check-in code." }); return; }
    m.mutate({ token });
  }

  function onCode() {
    const c = normaliseFallbackCode(code);
    if (!c) { setResult({ ok: false, reason: "invalid_code", message: "Enter the 6-digit code shown at reception." }); return; }
    m.mutate({ code: c });
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Check in</h1>
      {result && (
        <div role="status" aria-live="polite" className={`flex items-start gap-3 rounded-lg border p-4 ${result.ok ? "border-primary/50 bg-primary/10" : "border-destructive/50 bg-destructive/10"}`}>
          {result.ok ? <CheckCircle2 className="h-6 w-6 shrink-0 text-primary" /> : <XCircle className="h-6 w-6 shrink-0 text-destructive" />}
          <div className="text-sm">
            <p className="font-semibold">{result.ok ? "You're checked in" : "Not checked in"}</p>
            <p>{result.message}</p>
            {result.ok && <Link to="/member/dashboard" className="mt-1 inline-block text-primary underline">Back to home</Link>}
          </div>
        </div>
      )}
      {!result?.ok && (
        <>
          {m.isPending && <p className="flex items-center gap-2 text-sm"><LoaderCircle className="h-4 w-4 animate-spin" /> Checking…</p>}
          <QrScanner onToken={onScan} disabled={m.isPending} />
          <div className="rounded-lg border bg-card p-4">
            <label htmlFor="code" className="text-sm font-semibold">Or enter the code on the reception screen</label>
            <div className="mt-2 flex gap-2">
              <input id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} className="field min-w-0 flex-1 text-center text-xl tracking-widest"
                value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" />
              <button onClick={onCode} disabled={m.isPending} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">Check in</button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Codes change every 30 seconds. After 5 wrong codes you'll need to wait 10 minutes.</p>
          </div>
        </>
      )}
    </div>
  );
}
