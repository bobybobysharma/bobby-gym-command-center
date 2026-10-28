import { z } from "zod";

export const MEMBER_STATUSES = ["active", "inactive", "archived"] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

const opt = (s: z.ZodString) => z.union([s, z.literal("")]).transform((v) => (v === "" ? null : v));

/** Only fields that exist on public.members. member_code is set by the DB trigger. */
export const memberSchema = z.object({
  full_name: z.string().trim().min(2, "Enter the full name").max(120),
  phone: z.string().trim().regex(/^\+?[0-9 \-()]{10,18}$/, "Enter a valid phone number"),
  email: opt(z.string().trim().email("Enter a valid email").max(255)),
  joined_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  emergency_contact_name: opt(z.string().trim().max(120)),
  emergency_contact_phone: opt(z.string().trim().regex(/^\+?[0-9 \-()]{10,18}$/, "Enter a valid phone number")),
});
export type MemberInput = z.output<typeof memberSchema>;

export function memberErrorMessage(err: { code?: string; message?: string } | null | undefined): string {
  if (!err) return "Something went wrong.";
  if (err.code === "23505") return "A member with this phone number already exists.";
  if (err.code === "42501" || /row-level security|permission/i.test(err.message ?? ""))
    return "You don't have permission to do this.";
  return "Could not save. Please try again.";
}
