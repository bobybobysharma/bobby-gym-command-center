import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { memberOverviewQuery } from "@/lib/member-data";
import { formatRupees } from "@/lib/member-checkin";
import { Empty, ErrorBox, Loading, fmtDate } from "@/components/member-ui";

export const Route = createFileRoute("/member/payments")({ component: Page });

function Page() {
  const { member } = Route.useRouteContext();
  const q = useQuery(memberOverviewQuery(member.id, member.gym_id));
  if (q.isPending) return <Loading />;
  if (q.isError) return <ErrorBox onRetry={() => q.refetch()} />;
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Payments</h1>
      {q.data.payments.length === 0 ? <Empty>No payments on record.</Empty> : (
        <ul className="divide-y rounded-lg border bg-card text-sm">
          {q.data.payments.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 p-4">
              <div><p className="font-semibold">{formatRupees(p.amount_paise)}</p><p className="text-muted-foreground">{fmtDate(p.paid_at)} · {p.payment_method.replace("_", " ")} · #{p.receipt_number}</p></div>
              <span className="capitalize">{p.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
