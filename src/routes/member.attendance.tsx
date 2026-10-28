import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { memberOverviewQuery } from "@/lib/member-data";
import { Empty, ErrorBox, Loading, fmtDateTime } from "@/components/member-ui";

export const Route = createFileRoute("/member/attendance")({ component: Page });

const METHOD: Record<string, string> = { qr: "QR", code: "Code", manual: "Reception", staff: "Reception" };

function Page() {
  const { member } = Route.useRouteContext();
  const q = useQuery(memberOverviewQuery(member.id, member.gym_id));
  if (q.isPending) return <Loading />;
  if (q.isError) return <ErrorBox onRetry={() => q.refetch()} />;
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">My visits</h1>
      {q.data.visits.length === 0 ? <Empty>No visits yet.</Empty> : (
        <ul className="divide-y rounded-lg border bg-card text-sm">
          {q.data.visits.map((v) => (
            <li key={v.id} className="flex justify-between p-3"><span>{fmtDateTime(v.check_in_at, q.data.timeZone)}</span><span className="text-muted-foreground">{METHOD[v.check_in_method] ?? v.check_in_method}</span></li>
          ))}
        </ul>
      )}
    </div>
  );
}
