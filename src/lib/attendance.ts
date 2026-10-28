import { z } from "zod";

export const CHECK_IN_METHODS = ["qr", "code", "manual"] as const;
export type CheckInMethod = (typeof CHECK_IN_METHODS)[number];

/** Reception must not double-scan: the database blocks re-entry for 60 minutes. */
export const DUPLICATE_WINDOW_MINUTES = 60;

export const checkInTokenSchema = z
  .string()
  .trim()
  .min(8, "Enter the pass code printed on the member's QR pass.")
  .max(200, "That pass code is too long.");

export type FailReason = "invalid_token" | "inactive_member" | "duplicate" | "unknown";

const FAIL_REASONS: readonly FailReason[] = ["invalid_token", "inactive_member", "duplicate"];

export type CheckInOutcome =
  | { ok: true; message: string; memberId?: string; memberName?: string; memberCode?: string; at: string }
  | { ok: false; reason: FailReason; message: string; memberName?: string };

const str = (o: Record<string, unknown>, key: string): string | undefined => {
  const v = o[key];
  return typeof v === "string" ? v : undefined;
};

/**
 * Normalises whatever `record_qr_check_in()` returns into one shape the UI can render.
 * The database owns the rules; this only translates them, and treats a missing or
 * malformed reply as a failed check-in so reception is never shown a false success.
 */
export function parseCheckInResult(raw: unknown): CheckInOutcome {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, reason: "unknown", message: "Check-in could not be recorded. Please try again." };
  }
  const r = raw as Record<string, unknown>;
  const memberRaw = r["member"];
  const member = (memberRaw && typeof memberRaw === "object" ? memberRaw : {}) as Record<string, unknown>;
  const memberName = str(member, "name");
  const memberCode = str(member, "code");
  const message = str(r, "message")?.trim() ?? "";

  if (r["success"] === true) {
    const memberId = str(member, "id");
    return {
      ok: true,
      message: message || "Check-in recorded.",
      ...(memberId !== undefined ? { memberId } : {}),
      ...(memberName !== undefined ? { memberName } : {}),
      ...(memberCode !== undefined ? { memberCode } : {}),
      at: str(r, "checked_in_at") ?? new Date().toISOString(),
    };
  }

  const reported = String(r["reason"]) as FailReason;
  return {
    ok: false,
    reason: FAIL_REASONS.includes(reported) ? reported : "unknown",
    message: message || "Check-in could not be recorded. Please try again.",
    ...(memberName !== undefined ? { memberName } : {}),
  };
}

export function minutesSince(iso: string | null | undefined, nowMs: number = Date.now()): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.floor((nowMs - t) / 60_000);
}

/**
 * The same 60-minute rule the database applies to QR scans, so a receptionist
 * tapping "Check in" for someone who just scanned is told so instead of writing
 * a second row.
 */
export function duplicateCheckInNotice(
  lastCheckInAt: string | null | undefined,
  nowMs: number = Date.now(),
): string | null {
  const mins = minutesSince(lastCheckInAt ?? null, nowMs);
  if (mins === null || mins >= DUPLICATE_WINDOW_MINUTES) return null;
  return `Already checked in ${mins} minute${mins === 1 ? "" : "s"} ago.`;
}

/** Calendar day for an instant, in the gym's own timezone (e.g. "2026-10-28"). */
export function dateKeyInZone(iso: string, timeZone: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch {
    return iso.slice(0, 10);
  }
}

/** Minutes the gym's timezone is ahead of UTC at the given calendar day. */
export function zoneOffsetMinutes(dateISO: string, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = new Map<string, string>();
  for (const p of dtf.formatToParts(new Date(`${dateISO}T00:00:00Z`))) {
    if (p.type !== "literal") parts.set(p.type, p.value);
  }
  const num = (key: string) => Number(parts.get(key) ?? "0");
  const asUTC = Date.UTC(num("year"), num("month") - 1, num("day"), num("hour") % 24, num("minute"), num("second"));
  return Math.round((asUTC - Date.parse(`${dateISO}T00:00:00Z`)) / 60_000);
}

/**
 * The UTC instant that is midnight on `dateISO` in the gym's timezone.
 * Used so "today" means the gym's day, not the browser's or the server's.
 */
export function zoneStartUTCISO(dateISO: string, timeZone: string): string {
  const base = Date.parse(`${dateISO}T00:00:00Z`);
  if (Number.isNaN(base)) return new Date().toISOString();
  return new Date(base - zoneOffsetMinutes(dateISO, timeZone) * 60_000).toISOString();
}

export function shiftDate(dateISO: string, days: number): string {
  const t = Date.parse(`${dateISO}T00:00:00Z`);
  if (Number.isNaN(t)) return dateISO;
  return new Date(t + days * 86_400_000).toISOString().slice(0, 10);
}

export type AttendanceRow = {
  id: string;
  member_id: string;
  check_in_at: string;
  check_in_method: string;
  notes: string | null;
  member: { full_name: string; member_code: string; phone: string | null } | null;
};

export type AttendanceRange = "today" | "7" | "14";

export type AttendanceFilter = {
  search: string;
  method: "all" | CheckInMethod;
  range: AttendanceRange;
  today: string;
  timeZone: string;
};

export function filterAttendance(rows: AttendanceRow[], f: AttendanceFilter): AttendanceRow[] {
  const oldest = f.range === "today" ? f.today : shiftDate(f.today, -(Number(f.range) - 1));
  const s = f.search.trim().toLowerCase();
  const digits = s.replace(/\D/g, "");

  return rows.filter((r) => {
    if (dateKeyInZone(r.check_in_at, f.timeZone) < oldest) return false;
    if (f.method !== "all" && r.check_in_method !== f.method) return false;
    if (!s) return true;
    const m = r.member;
    return (
      [m?.full_name, m?.member_code, m?.phone].some((v) => v?.toLowerCase().includes(s)) ||
      (digits.length >= 3 && !!m?.phone?.replace(/\D/g, "").includes(digits))
    );
  });
}

export type AttendanceSummary = { visits: number; members: number; qr: number; manual: number };

export function summariseAttendance(rows: AttendanceRow[], f: AttendanceFilter): AttendanceSummary {
  const todays = filterAttendance(rows, { ...f, range: "today", search: "", method: "all" });
  const members = new Set<string>();
  let qr = 0;
  let manual = 0;
  for (const r of todays) {
    members.add(r.member_id);
    if (r.check_in_method === "qr") qr += 1;
    else if (r.check_in_method === "manual") manual += 1;
  }
  return { visits: todays.length, members: members.size, qr, manual };
}
