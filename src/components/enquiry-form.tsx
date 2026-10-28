import { useRef, useState } from "react";
import { z } from "zod";
import { CheckCircle2, LoaderCircle, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const enquirySchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name (at least 2 characters).").max(120, "Keep your name under 120 characters."),
  phone: z.string().trim().regex(/^\+?[0-9 \-]{10,18}$/, "Enter a valid phone number, including your area code."),
  email: z.string().trim().email("Enter a valid email address.").max(255).optional().or(z.literal("")),
  plan_id: z.string().uuid("Choose a plan from the list.").optional().or(z.literal("")),
  message: z.string().trim().max(2000, "Keep your message under 2,000 characters.").optional(),
});

type Field = keyof z.infer<typeof enquirySchema>;

export function EnquiryForm({ gymId, plans }: { gymId: string; plans: { id: string; name: string }[] }) {
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [planId, setPlanId] = useState("");
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting.current) return;
    const form = e.currentTarget;
    const parsed = enquirySchema.safeParse(Object.fromEntries(new FormData(form)));
    setStatus("idle");
    if (!parsed.success) {
      const nextErrors: Partial<Record<Field, string>> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as Field;
        nextErrors[field] ??= issue.message;
      }
      setErrors(nextErrors);
      const firstField = parsed.error.issues[0]?.path[0];
      if (typeof firstField === "string") {
        const input = form.elements.namedItem(firstField);
        if (input instanceof HTMLElement) input.focus();
      }
      return;
    }
    setErrors({});
    const v = parsed.data;
    submitting.current = true;
    setBusy(true);
    try {
      // Anonymous visitors can insert enquiries, but cannot read returned rows.
      const { error } = await supabase.from("enquiries").insert({
        gym_id: gymId,
        kind: "join",
        full_name: v.full_name,
        phone: v.phone,
        email: v.email || null,
        plan_id: v.plan_id || null,
        message: v.message || null,
      });
      if (error) throw error;
      setStatus("success");
      form.reset();
      setPlanId("");
    } catch {
      setStatus("error");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  const fieldProps = (field: Field) => ({
    id: `enquiry-${field}`,
    name: field,
    "aria-invalid": Boolean(errors[field]),
    "aria-describedby": errors[field] ? `enquiry-${field}-error` : undefined,
  });
  const fieldError = (field: Field) => errors[field] ? (
    <p id={`enquiry-${field}-error`} className="mt-2 text-sm text-destructive">{errors[field]}</p>
  ) : null;

  return (
    <form onSubmit={onSubmit} noValidate aria-label="Gym enquiry" aria-busy={busy} className="min-w-0">
      <fieldset disabled={busy} className="space-y-5 disabled:opacity-70">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="enquiry-full_name" className="mb-2 block text-sm font-semibold">Full name <span className="text-primary">*</span></label>
            <Input {...fieldProps("full_name")} autoComplete="name" required maxLength={120} className="h-12 text-base" />
            {fieldError("full_name")}
          </div>
          <div>
            <label htmlFor="enquiry-phone" className="mb-2 block text-sm font-semibold">Phone <span className="text-primary">*</span></label>
            <Input {...fieldProps("phone")} type="tel" inputMode="tel" autoComplete="tel" required maxLength={18} className="h-12 text-base" />
            {fieldError("phone")}
          </div>
        </div>
        <div>
          <label htmlFor="enquiry-email" className="mb-2 block text-sm font-semibold">Email <span className="font-normal text-muted-foreground">(optional)</span></label>
          <Input {...fieldProps("email")} type="email" autoComplete="email" maxLength={255} className="h-12 text-base" />
          {fieldError("email")}
        </div>
        <div>
          <label htmlFor="enquiry-plan_id" className="mb-2 block text-sm font-semibold">Interested plan <span className="font-normal text-muted-foreground">(optional)</span></label>
          <select {...fieldProps("plan_id")} value={planId} onChange={(e) => setPlanId(e.target.value)} className="h-12 w-full min-w-0 rounded-md border bg-background px-3 text-base focus-visible:outline-2 focus-visible:outline-ring">
            <option value="">Select a plan</option>
            {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {fieldError("plan_id")}
        </div>
        <div>
          <label htmlFor="enquiry-message" className="mb-2 block text-sm font-semibold">Message <span className="font-normal text-muted-foreground">(optional)</span></label>
          <Textarea {...fieldProps("message")} maxLength={2000} rows={4} className="min-h-28 text-base" />
          {fieldError("message")}
        </div>
        <Button type="submit" disabled={busy} className="h-12 w-full text-base">
          {busy ? <LoaderCircle className="motion-safe:animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
          {busy ? "Sending enquiry…" : "Send enquiry"}
        </Button>
      </fieldset>
      <div aria-live="polite" aria-atomic="true" className="mt-4">
        {busy && <p className="text-sm text-muted-foreground">Sending your enquiry…</p>}
        {status === "success" && <p className="flex items-start gap-2 text-sm text-success"><CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />Thank you. Your enquiry has been sent to Bobby Gym.</p>}
      </div>
      {status === "error" && <p role="alert" className="mt-4 text-sm text-destructive">Your enquiry could not be sent. Your details are still here — please try again.</p>}
    </form>
  );
}