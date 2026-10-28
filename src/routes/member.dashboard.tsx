import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { QrCode } from "lucide-react";
import { memberOverviewQuery, currentMembership } from "@/lib/member-data";
import { daysRemaining, formatRupees } from "@/lib/member-checkin";
import { dateKeyInZone } from "@/lib/attendance";
import { Card, Empty, ErrorBox, Loading, fmtDate, fmtDateTime } from "@/components/member-ui";

export const Route = createFileRoute("/member/dashboard")({ component: Dashboard });

function Dashboard() {
  const { member } = Route.useRouteContext();
  const q = useQuery(memberOverviewQuery(member.id, member.gym_id));
  if (q.isPending) return <Loading />;
  if (q.isError) return <ErrorBox onRetry={() => q.refetch()} />;
  const o = q.data;
  const cur = currentMembership(o);
  const latest = o.memberships[0];
  const expired = !cur && latest && latest.end_date < o.today;
  const left = cur ? daysRemaining(cur.end_date, o.today) : 0;
  const lastPay = o.payments[0];
  const month = o.today.slice(0, 7);
  const monthVisits = o.visits.filter((v) => dateKeyInZone(v.check_in_at, o.timeZone).startsWith(month)).length;

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Hi, {member.full_name.split(" ")[0]}</h1>
      <Link to="/member/check-in" className="flex items-center justify-center gap-3 rounded-lg bg-primary px-4 py-5 text-lg font-semibold text-primary-foreground">
        <QrCode className="h-6 w-6" /> Check in
      </Link>
      {member.status !== "active" && <p role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">Your member account is {member.status}. Please speak to reception.</p>}
      {expired && <p role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">Your {latest.plan_name} membership ended on {fmtDate(latest.end_date)}. Renew at reception to keep checking in.</p>}

      <Card title="Membership">
        {cur ? (
          <div className="space-y-1 text-sm">
            <p className="text-lg font-semibold">{cur.plan_name} <span className="text-sm font-normal text-primary">· Active</span></p>
            <p>{fmtDate(cur.start_date)} – {fmtDate(cur.end_date)}</p>
            <p>{cur.start_date > o.today ? `Starts ${fmtDate(cur.start_date)}` : `${left} day${left === 1 ? "" : "s"} remaining`}</p>
            <p className="text-muted-foreground">Next payment due {fmtDate(cur.end_date)} (renewal of {formatRupees(cur.fee_paise)}, at the current plan price)</p>
          </div>
        ) : <Empty>No active membership.</Empty>}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="Last payment">
          {lastPay ? (
            <p className="text-sm"><span className="text-lg font-semibold">{formatRupees(lastPay.amount_paise)}</span><br />{fmtDate(lastPay.paid_at)} · <span className="capitalize">{lastPay.status}</span></p>
          ) : <Empty>No payments yet.</Empty>}
        </Card>
        <Card title="Visits this month"><p className="text-3xl font-semibold">{monthVisits}</p></Card>
      </div>

      <Card title="Recent visits">
        {o.visits.length ? (
          <ul className="divide-y text-sm">{o.visits.slice(0, 5).map((v) => <li key={v.id} className="py-2">{fmtDateTime(v.check_in_at, o.timeZone)}</li>)}</ul>
        ) : <Empty>No visits yet.</Empty>}
      </Card>
    </div>
  );
}
