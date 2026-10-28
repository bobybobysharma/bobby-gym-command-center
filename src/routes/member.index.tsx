import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/member/")({
  beforeLoad: () => { throw redirect({ to: "/member/dashboard" }); },
});
