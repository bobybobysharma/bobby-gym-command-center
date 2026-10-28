import { createFileRoute } from "@tanstack/react-router";
import { Card, fmtDate } from "@/components/member-ui";

export const Route = createFileRoute("/member/profile")({ component: Page });

function Page() {
  const { member } = Route.useRouteContext();
  const rows: [string, string][] = [
    ["Name", member.full_name], ["Member code", member.member_code], ["Phone", member.phone],
    ["Email", member.email ?? "—"], ["Member since", fmtDate(member.joined_on)], ["Status", member.status],
  ];
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Profile</h1>
      <Card title="Your details">
        <dl className="divide-y text-sm">{rows.map(([k, v]) => <div key={k} className="flex justify-between py-2"><dt className="text-muted-foreground">{k}</dt><dd className="capitalize-first">{v}</dd></div>)}</dl>
      </Card>
      <p className="text-xs text-muted-foreground">To change your details, please ask reception.</p>
    </div>
  );
}
