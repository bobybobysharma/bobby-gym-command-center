import { describe, expect, it } from "vitest";
import { daysRemaining, extractChallengeToken, normaliseFallbackCode, parseMemberCheckIn } from "@/lib/member-checkin";

const tok = "a".repeat(48);

describe("member check-in helpers", () => {
  it("reads the token from a reception QR link", () => {
    expect(extractChallengeToken(`https://x.app/member/check-in?t=${tok}`)).toBe(tok);
  });
  it("rejects a scanned code that is not a reception challenge", () => {
    expect(extractChallengeToken("https://evil.example/?t=hello")).toBeNull();
  });
  it("fallback code must be exactly 6 digits", () => {
    expect(normaliseFallbackCode("123 456")).toBe("123456");
    expect(normaliseFallbackCode("12345")).toBeNull();
  });
  it("malformed reply is a failure, not a success", () => {
    expect(parseMemberCheckIn(null).ok).toBe(false);
    expect(parseMemberCheckIn({ success: "true" }).ok).toBe(false);
  });
  it("keeps the expired-code reason", () => {
    const r = parseMemberCheckIn({ success: false, reason: "expired_code", message: "expired" });
    expect(r.ok === false && r.reason).toBe("expired_code");
  });
  it("membership ending today has 1 day left; yesterday is expired", () => {
    expect(daysRemaining("2026-10-28", "2026-10-28")).toBe(1);
    expect(daysRemaining("2026-10-27", "2026-10-28")).toBe(0);
  });
});
