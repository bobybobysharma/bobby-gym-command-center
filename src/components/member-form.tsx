import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { memberSchema, type MemberInput } from "@/lib/members";

type Values = Record<keyof MemberInput, string>;

export function MemberForm({
  initial, submitLabel, onSubmit, onCancel,
}: {
  initial?: Partial<Values>;
  submitLabel: string;
  onSubmit: (v: MemberInput) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [v, setV] = useState<Values>({
    full_name: "", phone: "", email: "", emergency_contact_name: "", emergency_contact_phone: "",
    joined_on: new Date().toISOString().slice(0, 10), ...initial,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const parsed = memberSchema.safeParse(v);
    if (!parsed.success) {
      const errs: typeof errors = {};
      for (const i of parsed.error.issues) errs[i.path[0] as keyof Values] ??= i.message;
      setErrors(errs);
      return;
    }
    setErrors({}); setFailure(null); setBusy(true);
    const err = await onSubmit(parsed.data);
    setBusy(false);
    if (err) setFailure(err);
  }

  const field = (k: keyof Values, label: string, type = "text", req = false) => (
    <label className="block text-sm">
      <span className="text-muted-foreground">{label}{req && " *"}</span>
      <input className="field mt-1 w-full" type={type} value={v[k]} aria-invalid={!!errors[k]}
        onChange={(e) => setV({ ...v, [k]: e.target.value })} />
      {errors[k] && <span className="mt-1 block text-xs text-destructive">{errors[k]}</span>}
    </label>
  );

  return (
    <form onSubmit={submit} noValidate>
      <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
        {field("full_name", "Full name", "text", true)}
        {field("phone", "Phone", "tel", true)}
        {field("email", "Email", "email")}
        {field("joined_on", "Registration date", "date", true)}
        {field("emergency_contact_name", "Emergency contact name")}
        {field("emergency_contact_phone", "Emergency contact phone", "tel")}
      </fieldset>
      {failure && <p role="alert" className="mt-4 text-sm text-destructive">{failure}</p>}
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="rounded-md border px-4 py-2 text-sm">Cancel</button>
        <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {busy && <LoaderCircle className="h-4 w-4 animate-spin" />} {busy ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
        className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-t-xl border bg-card p-5 sm:rounded-xl sm:p-6">
        <h2 className="font-display text-2xl">{title}</h2>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
