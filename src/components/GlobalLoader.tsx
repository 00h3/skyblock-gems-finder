import React from "react";
import { HtmlLoadingScreen } from "./ui/HtmlLoadingScreen";

export function GlobalLoader() {
  return <HtmlLoadingScreen fadeOutOnDone={false} speedMs={15} />;
}
