import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { LoaderCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Challenge = { token: string; code: string; expiresAt: number };

const REFRESH_SECONDS = 30;

/**
 * Reception screen: a short-lived check-in QR plus a 6-digit backup code,
 * both issued by the database and rotated every 30 seconds. A rotating code
 * limits reuse but cannot stop someone relaying a live code to a friend.
 */
export function ReceptionCheckIn({
  gymId, gymName, todayCount, onTick,
}: { gymId: string; gymName: string; todayCount: number; onTick: () => void }) {
  const [ch, setCh] = useState<Challenge | null>(null);
  const [left, setLeft] = useState(REFRESH_SECONDS);
  const [error, setError] = useState<string | null>(null);
  const issuedAt = useRef(0);
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  useEffect(() => {
    let alive = true;
    async function issue() {
      const { data, error: e } = await supabase.rpc("issue_checkin_challenge", { _gym: gymId });
      if (!alive) return;
      const d = data as Record<string, unknown> | null;
      if (e || !d || typeof d["token"] !== "string" || typeof d["code"] !== "string") {
        setError("Could not create a check-in code. Retrying…");
        return;
      }
      setError(null);
      issuedAt.current = Date.now();
      setCh({ token: d["token"], code: d["code"], expiresAt: Date.parse(String(d["expires_at"])) });
    }
    void issue();
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - issuedAt.current) / 1000);
      const remaining = REFRESH_SECONDS - elapsed;
      if (remaining <= 0 || !issuedAt.current) {
        issuedAt.current = Date.now();
        void issue();
        onTickRef.current();
        setLeft(REFRESH_SECONDS);
      } else {
        setLeft(remaining);
        if (remaining % 10 === 0) onTickRef.current();
      }
    }, 1000);
    return () => { alive = false; clearInterval(timer); };
  }, [gymId]);

  const url = ch && typeof window !== "undefined" ? `${window.location.origin}/member/check-in?t=${ch.token}` : "";

  return (
    <section className="rounded-lg border bg-card p-4 sm:p-6" aria-labelledby="reception-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="reception-title" className="font-display text-2xl">{gymName} · Check in</h2>
        <p className="text-sm text-muted-foreground">{todayCount} checked in today</p>
      </div>
      <div className="mt-4 flex flex-col items-center gap-4 md:flex-row md:items-center md:justify-center md:gap-10">
        <div className="rounded-lg bg-background p-4">
          {ch ? (
            <QRCodeSVG value={url} size={280} level="M" marginSize={2} className="h-auto w-64 sm:w-72" aria-label="Check-in QR code" />
          ) : (
            <div className="flex h-64 w-64 items-center justify-center"><LoaderCircle className="h-8 w-8 animate-spin" /></div>
          )}
        </div>
        <div className="text-center md:text-left">
          <p className="text-sm text-muted-foreground">Members: open Bobby Gym → Check in → Scan QR</p>
          <p className="mt-4 text-sm text-muted-foreground">No camera? Enter this code:</p>
          <p className="font-display text-5xl tracking-[0.2em]" aria-live="polite">{ch ? ch.code : "······"}</p>
          <p className="mt-3 text-sm" aria-live="off">New code in <strong>{left}s</strong></p>
          <div className="mt-2 h-1.5 w-48 overflow-hidden rounded bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${(left / REFRESH_SECONDS) * 100}%` }} />
          </div>
          {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
        </div>
      </div>
    </section>
  );
}
