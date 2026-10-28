import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { LoaderCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { resolveAdminAccess } from "@/lib/admin-access";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): { denied?: number } =>
    s["denied"] === 1 || s["denied"] === "1" ? { denied: 1 } : {},
  head: () => ({
    meta: [
      { title: "Staff login — Bobby Gym" },
      { name: "description", content: "Sign in to the Bobby Gym owner and staff dashboard." },
      { property: "og:title", content: "Staff login — Bobby Gym" },
      { property: "og:description", content: "Sign in to the Bobby Gym owner and staff dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

function LoginPage() {
  const navigate = useNavigate();
  const { denied } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [message, setMessage] = useState<string | null>(
    denied ? "Your account does not have access to the dashboard." : null,
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (denied) return;
    resolveAdminAccess()
      .then((a) => {
        if (a && a !== "denied") navigate({ to: "/admin", replace: true });
      })
      .catch(() => {});
  }, [denied, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      setErrors({ ...(f.email?.[0] ? { email: f.email[0] } : {}), ...(f.password?.[0] ? { password: f.password[0] } : {}) });
      return;
    }
    setErrors({});
    setMessage(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword(parsed.data);
      if (error) {
        setMessage(error.message === "Invalid login credentials" ? "Incorrect email or password." : error.message);
        return;
      }
      const access = await resolveAdminAccess();
      if (access && access !== "denied") {
        navigate({ to: "/admin", replace: true });
      } else {
        await supabase.auth.signOut();
        setMessage("Signed in, but this account does not have dashboard access.");
      }
    } catch {
      setMessage("Could not sign in. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm rounded-lg border bg-card p-6 sm:p-8">
        <Link to="/" className="font-display text-2xl text-foreground">Bobby Gym</Link>
        <p className="eyebrow mt-4">Staff login</p>
        <h1 className="font-display mt-1 text-3xl text-foreground">Sign in</h1>
        <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <input id="email" type="email" autoComplete="email" className="field mt-1" value={email}
              onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-err" : undefined} />
            {errors.email && <p id="email-err" className="mt-1 text-sm text-destructive">{errors.email}</p>}
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium">Password</label>
            <input id="password" type="password" autoComplete="current-password" className="field mt-1" value={password}
              onChange={(e) => setPassword(e.target.value)} aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "pw-err" : undefined} />
            {errors.password && <p id="pw-err" className="mt-1 text-sm text-destructive">{errors.password}</p>}
          </div>
          {message && (
            <p role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-foreground">
              {message}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? (<><LoaderCircle className="mr-2 h-4 w-4 animate-spin" />Signing in…</>) : "Sign in"}
          </Button>
        </form>
        <p className="mt-6 text-xs text-muted-foreground">Accounts are created by the gym owner. No public sign-up.</p>
      </div>
    </main>
  );
}
