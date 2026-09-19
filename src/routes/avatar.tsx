import { createFileRoute } from "@tanstack/react-router";
import { AvatarShowcase } from "@/components/AvatarShowcase";

export const Route = createFileRoute("/avatar")({
  head: () => ({
    meta: [
      { title: "Avatar — QBLOCK" },
      { name: "description", content: "View and customize your 3D QBLOCK character." },
      { property: "og:title", content: "Avatar — QBLOCK" },
      {
        property: "og:description",
        content: "Dress up your 3D QBLOCK character with skins, faces and remodels.",
      },
    ],
  }),
  component: AvatarPage,
});

function AvatarPage() {
  return <AvatarShowcase />;
}
