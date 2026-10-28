import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { memberOverviewQuery } from "@/lib/member-data";
import { formatRupees } from "@/lib/member-checkin";
import { Empty, ErrorBox, Loading, fmtDate } from "@/components/member-ui";

export const Route = createFileRoute("/member/membership")({ component: Page });

function Page() {
  const { member } = Route.useRouteContext();
  const q = useQuery(memberOverviewQuery(member.id, member.gym_id));
  if (q.isPending) return <Loading />;
  if (q.isError) return <ErrorBox onRetry={() => q.refetch()} />;
  const { memberships, today } = q.data;
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">My plan</h1>
      {memberships.length === 0 ? <Empty>No memberships on record.</Empty> : (
        <ul className="space-y-3">
          {memberships.map((m) => {
            const label = m.state !== "active" ? m.state : m.end_date < today ? "expired" : m.start_date > today ? "upcoming" : "active";
            return (
              <li key={m.id} className="rounded-lg border bg-card p-4 text-sm">
                <p className="flex justify-between font-semibold"><span>{m.plan_name}</span><span className="capitalize text-primary">{label}</span></p>
                <p>{fmtDate(m.start_date)} – {fmtDate(m.end_date)} · {m.duration_months} month{m.duration_months === 1 ? "" : "s"} · {formatRupees(m.fee_paise)}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
