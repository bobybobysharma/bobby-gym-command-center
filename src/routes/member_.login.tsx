import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { LoaderCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { resolveMemberAccess } from "@/lib/member-access";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/member_/login")({
  validateSearch: (s: Record<string, unknown>): { unlinked?: number } =>
    s["unlinked"] === 1 || s["unlinked"] === "1" ? { unlinked: 1 } : {},
  head: () => ({
    meta: [
      { title: "Member login — Bobby Gym" },
      { name: "description", content: "Sign in to check in, see your membership, payments and visits at Bobby Gym." },
      { property: "og:title", content: "Member login — Bobby Gym" },
      { property: "og:description", content: "Sign in to check in, see your membership, payments and visits." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MemberLogin,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const UNLINKED = "This email isn't linked to a membership yet. Ask reception to add this exact email to your member profile, then sign in again.";

function MemberLogin() {
  const navigate = useNavigate();
  const { unlinked } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ kind: "error" | "info"; text: string } | null>(unlinked ? { kind: "error", text: UNLINKED } : null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (unlinked) return;
    resolveMemberAccess().then((m) => { if (m && m !== "unlinked") navigate({ to: "/member/dashboard", replace: true }); }).catch(() => {});
  }, [unlinked, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const p = schema.safeParse({ email, password });
    if (!p.success) { setMsg({ kind: "error", text: p.error.issues[0]?.message ?? "Check your details." }); return; }
    setBusy(true); setMsg(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ ...p.data, options: { emailRedirectTo: `${window.location.origin}/member/login` } });
        if (error) { setMsg({ kind: "error", text: error.message }); return; }
        setMsg({ kind: "info", text: "Check your email and click the confirmation link, then sign in here." });
        setMode("signin");
        return;
      }
      const { error } = await supabase.auth.signInWithPassword(p.data);
      if (error) { setMsg({ kind: "error", text: error.message === "Invalid login credentials" ? "Incorrect email or password." : error.message }); return; }
      const m = await resolveMemberAccess();
      if (m && m !== "unlinked") navigate({ to: "/member/dashboard", replace: true });
      else { await supabase.auth.signOut(); setMsg({ kind: "error", text: UNLINKED }); }
    } catch {
      setMsg({ kind: "error", text: "Could not reach the gym. Check your connection and try again." });
    } finally { setBusy(false); }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm rounded-lg border bg-card p-6 sm:p-8">
        <Link to="/" className="font-display text-2xl text-foreground">Bobby Gym</Link>
        <p className="eyebrow mt-4">Members</p>
        <h1 className="font-display mt-1 text-3xl">{mode === "signin" ? "Sign in" : "Create your login"}</h1>
        <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
          <div>
            <label htmlFor="m-email" className="text-sm font-medium">Email (the one you gave reception)</label>
            <input id="m-email" type="email" autoComplete="email" className="field mt-1" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label htmlFor="m-pw" className="text-sm font-medium">Password</label>
            <input id="m-pw" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} className="field mt-1" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {msg && (
            <p role="alert" className={`rounded-md border p-3 text-sm ${msg.kind === "error" ? "border-destructive/50 bg-destructive/10" : "border-primary/40 bg-primary/10"}`}>{msg.text}</p>
          )}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : mode === "signin" ? "Sign in" : "Create login"}
          </Button>
        </form>
        <button type="button" className="mt-4 text-sm text-primary" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMsg(null); }}>
          {mode === "signin" ? "First time? Create a login" : "Have a login? Sign in"}
        </button>
        <p className="mt-4 text-xs text-muted-foreground">Your login only opens your membership once your confirmed email matches the one on your member profile. Staff sign in <Link to="/login" className="underline">here</Link>.</p>
      </div>
    </main>
  );
}
