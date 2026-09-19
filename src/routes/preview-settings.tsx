import { createFileRoute } from "@tanstack/react-router";
import { SettingsBody } from "./settings";

export const Route = createFileRoute("/preview-settings")({
  ssr: false,
  component: () => (
    <div className="min-h-screen bg-[#f1f2f4] px-4 py-6 dark:bg-[#0c0d11]">
      <SettingsBody />
    </div>
  ),
});
