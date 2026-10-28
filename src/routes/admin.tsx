import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { LayoutDashboard, Inbox, Users, IdCard, CreditCard, CalendarCheck, Settings, LogOut, Menu, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { resolveAdminAccess } from "@/lib/admin-access";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async () => {
    const access = await resolveAdminAccess();
    if (!access) throw redirect({ to: "/login" });
    if (access === "denied") throw redirect({ to: "/login", search: { denied: 1 } });
    return { access };
  },
  head: () => ({
    meta: [
      { title: "Dashboard — Bobby Gym" },
      { name: "description", content: "Bobby Gym owner and staff dashboard." },
      { property: "og:title", content: "Dashboard — Bobby Gym" },
      { property: "og:description", content: "Bobby Gym owner and staff dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

const soon = [
  { section: "payments", label: "Payments", icon: CreditCard },
  { section: "settings", label: "Settings", icon: Settings },
] as const;

function AdminLayout() {
  const { access } = Route.useRouteContext();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();

  async function logout() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await router.invalidate();
    navigate({ to: "/login", replace: true });
  }

  const linkCls = "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent";
  const active = { className: "bg-sidebar-accent text-primary font-semibold" };

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 p-3" onClick={() => setOpen(false)}>
      <Link to="/admin" activeOptions={{ exact: true }} className={linkCls} activeProps={active}>
        <LayoutDashboard className="h-4 w-4" /> Overview
      </Link>
      <Link to="/admin/enquiries" className={linkCls} activeProps={active}>
        <Inbox className="h-4 w-4" /> Enquiries
      </Link>
      <Link to="/admin/members" className={linkCls} activeProps={active}>
        <Users className="h-4 w-4" /> Members
      </Link>
      <Link to="/admin/memberships" className={linkCls} activeProps={active}>
        <IdCard className="h-4 w-4" /> Memberships
      </Link>
      <Link to="/admin/attendance" className={linkCls} activeProps={active}>
        <CalendarCheck className="h-4 w-4" /> Attendance
      </Link>
      {soon.map((s) => (
        <Link key={s.section} to="/admin/$section" params={{ section: s.section }} className={linkCls} activeProps={active}>
          <s.icon className="h-4 w-4" /> {s.label}
          <span className="ml-auto text-[10px] uppercase text-muted-foreground">Next</span>
        </Link>
      ))}
      <button onClick={logout} className={`${linkCls} mt-auto text-left`}>
        <LogOut className="h-4 w-4" /> Logout
      </button>
    </nav>
  );

  return (
    <div className="min-h-screen bg-background md:flex">
      <header className="flex items-center justify-between border-b px-4 py-3 md:hidden">
        <span className="font-display text-xl">Bobby Gym</span>
        <button aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)}>
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>
      <aside className={`${open ? "flex" : "hidden"} flex-col border-r bg-sidebar md:sticky md:top-0 md:flex md:h-screen md:w-60`}>
        <div className="hidden border-b px-5 py-4 md:block">
          <p className="font-display text-xl">Bobby Gym</p>
        </div>
        <p className="px-5 pt-3 text-xs text-muted-foreground break-all">{access.email} · {access.role}</p>
        {nav}
      </aside>
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
