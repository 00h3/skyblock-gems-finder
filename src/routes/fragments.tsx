import { createFileRoute } from "@tanstack/react-router";
import { FragmentsPage } from "@/components/FragmentsPage";

export const Route = createFileRoute("/fragments")({
  head: () => ({
    meta: [
      { title: "Fragments — QBLOCK" },
      {
        name: "description",
        content:
          "Collect QBLOCK fragments and spend them on faces, wearables, emotes, worlds and boosts.",
      },
      { property: "og:title", content: "Fragments — QBLOCK" },
      {
        property: "og:description",
        content: "Collect fragments and unlock QBLOCK drops across every tag.",
      },
    ],
  }),
  component: FragmentsRoute,
});

function FragmentsRoute() {
  return <FragmentsPage />;
}
