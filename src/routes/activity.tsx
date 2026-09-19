import { createFileRoute } from "@tanstack/react-router";
import { ActivityLogPage } from "@/components/ActivityLogSheet";

export const Route = createFileRoute("/activity")({
  head: () => ({ meta: [{ title: "Activity Log — QBLOCK" }] }),
  component: ActivityLogPage,
});
