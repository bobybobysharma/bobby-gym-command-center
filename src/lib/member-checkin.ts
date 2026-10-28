/** Reception QR codes encode a link like https://site/member/check-in?t=<token>. */
export function extractChallengeToken(scanned: string): string | null {
  const s = scanned.trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    const t = u.searchParams.get("t")?.trim();
    return t && /^[a-f0-9]{32,128}$/i.test(t) ? t : null;
  } catch {
    return /^[a-f0-9]{32,128}$/i.test(s) ? s : null;
  }
}

export function normaliseFallbackCode(input: string): string | null {
  const d = input.replace(/\D/g, "");
  return d.length === 6 ? d : null;
}

export type MemberCheckInReason =
  | "not_signed_in" | "not_member" | "invalid_code" | "expired_code" | "inactive_member"
  | "no_membership" | "duplicate" | "rate_limited" | "unknown";

const REASONS: readonly MemberCheckInReason[] = [
  "not_signed_in", "not_member", "invalid_code", "expired_code", "inactive_member",
  "no_membership", "duplicate", "rate_limited",
];

export type MemberCheckInResult =
  | { ok: true; message: string; at: string }
  | { ok: false; reason: MemberCheckInReason; message: string };

/** Translates member_check_in(); anything unexpected is a failure, never a false success. */
export function parseMemberCheckIn(raw: unknown): MemberCheckInResult {
  const fallback = "Check-in could not be recorded. Please try again or ask reception.";
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, reason: "unknown", message: fallback };
  const r = raw as Record<string, unknown>;
  const message = typeof r["message"] === "string" && r["message"].trim() ? r["message"] : "";
  if (r["success"] === true) {
    const at = typeof r["checked_in_at"] === "string" ? r["checked_in_at"] : new Date().toISOString();
    return { ok: true, message: message || "Checked in.", at };
  }
  const reason = String(r["reason"]) as MemberCheckInReason;
  return { ok: false, reason: REASONS.includes(reason) ? reason : "unknown", message: message || fallback };
}

/** Whole days left including today; negative when expired. */
export function daysRemaining(endDate: string, today: string): number {
  const e = Date.parse(`${endDate}T00:00:00Z`);
  const t = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(e) || Number.isNaN(t)) return 0;
  return Math.round((e - t) / 86_400_000) + 1;
}

export function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}
