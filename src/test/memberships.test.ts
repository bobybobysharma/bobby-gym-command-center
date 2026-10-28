import { describe, expect, it } from "vitest";
import { daysUntil, membershipView } from "@/lib/memberships";

describe("membership state", () => {
  it("active past end date shows expired", () => expect(membershipView("active", "2026-01-09", "2026-01-10")).toBe("expired"));
  it("active ending today is still active", () => expect(membershipView("active", "2026-01-10", "2026-01-10")).toBe("active"));
  it("paused stays paused after end date", () => expect(membershipView("paused", "2026-01-01", "2026-01-10")).toBe("paused"));
  it("counts days left for expiring filter", () => expect(daysUntil("2026-01-17", "2026-01-10")).toBe(7));
});
