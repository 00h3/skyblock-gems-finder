import { createFileRoute } from "@tanstack/react-router";
import { AvatarShowcase } from "@/components/AvatarShowcase";

export const Route = createFileRoute("/wearables")({
  head: () => ({ meta: [{ title: "Avatar Studio — QBLOCK" }] }),
  component: WearablesRoute,
});

function WearablesRoute() {
  return <AvatarShowcase />;
}
