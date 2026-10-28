import { describe, expect, it } from "vitest";
import {
  duplicateCheckInNotice,
  filterAttendance,
  parseCheckInResult,
  summariseAttendance,
  zoneStartUTCISO,
  type AttendanceRow,
} from "@/lib/attendance";

const row = (over: Partial<AttendanceRow> & { member_id: string }): AttendanceRow => ({
  id: over.id ?? `log-${over.member_id}`,
  member_id: over.member_id,
  check_in_at: over.check_in_at ?? "2026-10-28T08:00:00Z",
  check_in_method: over.check_in_method ?? "qr",
  notes: over.notes ?? null,
  member: over.member ?? { full_name: "Asha Rao", member_code: "BG-0001", phone: "9876543210" },
});

const TODAY = "2026-10-28";
const TZ = "Asia/Kolkata";
const base = { search: "", method: "all", range: "today", today: TODAY, timeZone: TZ } as const;

describe("QR check-in results", () => {
  it("reports a success returned by the database", () => {
    const out = parseCheckInResult({
      success: true,
      message: "Check-in recorded successfully",
      log_id: "l1",
      member: { id: "m1", name: "Asha Rao", code: "BG-0001", photo_url: null },
      checked_in_at: "2026-10-28T03:20:00Z",
    });
    expect(out).toMatchObject({ ok: true, memberId: "m1", memberName: "Asha Rao", memberCode: "BG-0001" });
  });

  it("passes the duplicate reason through so reception sees who was refused", () => {
    const out = parseCheckInResult({
      success: false,
      reason: "duplicate",
      message: "Member already checked in 12 minutes ago",
      member: { name: "Asha Rao", code: "BG-0001" },
    });
    expect(out).toMatchObject({ ok: false, reason: "duplicate", message: "Member already checked in 12 minutes ago", memberName: "Asha Rao" });
  });

  it("treats a missing or malformed reply as a failed check-in, never a success", () => {
    expect(parseCheckInResult(null).ok).toBe(false);
    expect(parseCheckInResult(undefined).ok).toBe(false);
    expect(parseCheckInResult("boom").ok).toBe(false);
    expect(parseCheckInResult({ success: "yes" }).ok).toBe(false);
    expect(parseCheckInResult({ success: true }).ok).toBe(true);
  });
});

describe("Duplicate check-in window", () => {
  const now = Date.parse("2026-10-28T09:00:00Z");

  it("refuses a second check-in inside 60 minutes", () => {
    expect(duplicateCheckInNotice("2026-10-28T08:41:00Z", now)).toBe("Already checked in 19 minutes ago.");
    expect(duplicateCheckInNotice("2026-10-28T08:59:00Z", now)).toBe("Already checked in 1 minute ago.");
  });

  it("allows a check-in once the 60 minutes have passed", () => {
    expect(duplicateCheckInNotice("2026-10-28T08:00:00Z", now)).toBeNull();
    expect(duplicateCheckInNotice(null, now)).toBeNull();
    expect(duplicateCheckInNotice("not a date", now)).toBeNull();
  });
});

describe("Gym-timezone day boundary", () => {
  it("starts the gym's day at 18:30Z the previous evening for Asia/Kolkata", () => {
    // Asia/Kolkata is UTC+5:30 year-round, so midnight there is 18:30Z the day before.
    expect(zoneStartUTCISO(TODAY, TZ)).toBe("2026-10-27T18:30:00.000Z");
  });

  it("uses UTC midnight for a UTC timezone", () => {
    expect(zoneStartUTCISO(TODAY, "UTC")).toBe("2026-10-28T00:00:00.000Z");
  });

  it("counts a 00:10 IST check-in as the next gym day, not the browser's", () => {
    // 2026-10-28T00:10+05:30 == 2026-10-27T18:40Z, which belongs to gym day 2026-10-28.
    const rows = [row({ member_id: "m1", check_in_at: "2026-10-27T18:40:00Z" })];
    expect(summariseAttendance(rows, base)).toMatchObject({ visits: 1, members: 1, qr: 1, manual: 0 });
  });
});

describe("Check-in log filters", () => {
  const rows = [
    row({ member_id: "m1", check_in_at: "2026-10-28T02:00:00Z", check_in_method: "qr" }),
    row({ member_id: "m2", check_in_at: "2026-10-28T04:00:00Z", check_in_method: "manual", member: { full_name: "Ravi Kumar", member_code: "BG-0002", phone: "9123456780" } }),
    row({ member_id: "m3", check_in_at: "2026-10-26T02:00:00Z", check_in_method: "qr", member: { full_name: "Neha S", member_code: "BG-0003", phone: "9000000000" } }),
  ];

  it("shows only today's check-ins by default", () => {
    expect(filterAttendance(rows, base).map((r) => r.member_id)).toEqual(["m1", "m2"]);
  });

  it("filters by method and by name", () => {
    expect(filterAttendance(rows, { ...base, method: "manual" }).map((r) => r.member_id)).toEqual(["m2"]);
    expect(filterAttendance(rows, { ...base, search: "ravi" }).map((r) => r.member_id)).toEqual(["m2"]);
  });

  it("matches a phone search on digits only", () => {
    expect(filterAttendance(rows, { ...base, search: "98765" }).map((r) => r.member_id)).toEqual(["m1"]);
    expect(filterAttendance(rows, { ...base, search: "98 76 5" }).map((r) => r.member_id)).toEqual(["m1"]);
  });

  it("widens to the last 7 days", () => {
    expect(filterAttendance(rows, { ...base, range: "7" }).map((r) => r.member_id)).toEqual(["m1", "m2", "m3"]);
  });

  it("summarises today's visits, distinct members and method split", () => {
    expect(summariseAttendance(rows, base)).toEqual({ visits: 2, members: 2, qr: 1, manual: 1 });
  });
});
