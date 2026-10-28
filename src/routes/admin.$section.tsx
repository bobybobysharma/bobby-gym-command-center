import { createFileRoute, notFound } from "@tanstack/react-router";

const SECTIONS: Record<string, string> = {
  payments: "Payments",
  attendance: "Attendance",
  settings: "Settings",
};

export const Route = createFileRoute("/admin/$section")({
  beforeLoad: ({ params }) => {
    if (!SECTIONS[params.section]) throw notFound();
  },
  component: ComingNext,
});

function ComingNext() {
  const { section } = Route.useParams();
  return (
    <div>
      <h1 className="font-display text-3xl">{SECTIONS[section]}</h1>
      <p className="mt-4 rounded-lg border bg-card p-6 text-muted-foreground">
        Coming next. This section will be added in the next phase.
      </p>
    </div>
  );
}
