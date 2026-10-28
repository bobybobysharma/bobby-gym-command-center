import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, CreditCard, Home, IdCard, LogOut, QrCode, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { resolveMemberAccess } from "@/lib/member-access";

export const Route = createFileRoute("/member")({
  ssr: false,
  beforeLoad: async () => {
    const m = await resolveMemberAccess();
    if (!m) throw redirect({ to: "/member/login" });
    if (m === "unlinked") throw redirect({ to: "/member/login", search: { unlinked: 1 } });
    return { member: m };
  },
  head: () => ({
    meta: [
      { title: "My membership — Bobby Gym" },
      { name: "description", content: "Your Bobby Gym membership, payments, visits and check-in." },
      { property: "og:title", content: "My membership — Bobby Gym" },
      { property: "og:description", content: "Your Bobby Gym membership, payments, visits and check-in." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MemberLayout,
});

const links = [
  { to: "/member/dashboard", label: "Home", icon: Home },
  { to: "/member/check-in", label: "Check in", icon: QrCode },
  { to: "/member/membership", label: "Plan", icon: IdCard },
  { to: "/member/payments", label: "Payments", icon: CreditCard },
  { to: "/member/attendance", label: "Visits", icon: CalendarCheck },
  { to: "/member/profile", label: "Profile", icon: User },
] as const;

function MemberLayout() {
  const { member } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  async function logout() {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/member/login", replace: true });
  }
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <Link to="/member/dashboard" className="font-display text-xl">Bobby Gym</Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-muted-foreground sm:inline">{member.full_name}</span>
          <button onClick={logout} className="inline-flex items-center gap-1 text-primary"><LogOut className="h-4 w-4" /> Logout</button>
        </div>
      </header>
      <nav className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-6 border-t bg-card md:static md:flex md:gap-2 md:border-b md:border-t-0 md:px-4">
        {links.map((l) => (
          <Link key={l.to} to={l.to} className="flex flex-col items-center gap-0.5 px-1 py-2 text-[11px] text-muted-foreground md:flex-row md:gap-2 md:text-sm"
            activeProps={{ className: "text-primary font-semibold" }}>
            <l.icon className="h-5 w-5 md:h-4 md:w-4" /> {l.label}
          </Link>
        ))}
      </nav>
      <main className="mx-auto max-w-3xl px-4 py-6"><Outlet /></main>
    </div>
  );
}
