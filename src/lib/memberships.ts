export type MembershipView = "active" | "paused" | "cancelled" | "expired";

/** Display state: an "active" row whose end_date has passed is shown as expired. */
export function membershipView(state: string, endDate: string, today: string): MembershipView {
  if (state === "paused" || state === "cancelled") return state;
  return endDate < today ? "expired" : "active";
}

export function daysUntil(endDate: string, today: string): number {
  return Math.round((Date.parse(endDate) - Date.parse(today)) / 86_400_000);
}

export function todayISO(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;
