import { HtmlLoadingScreen } from "./ui/HtmlLoadingScreen";

type QBlockLoadingMenuProps = {
  onDone?: () => void;
  speedMs?: number;
  fadeOutOnDone?: boolean;
  className?: string;
};

export function QBlockLoadingMenu({
  onDone,
  speedMs = 20,
  fadeOutOnDone = true,
  className = "",
}: QBlockLoadingMenuProps) {
  return (
    <HtmlLoadingScreen
      onDone={onDone}
      speedMs={speedMs}
      fadeOutOnDone={fadeOutOnDone}
      className={className}
    />
  );
}
