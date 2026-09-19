/**
 * Custom QBlock reaction icons.
 *
 * The uploaded SVGs ship with baked-in fills, so they are rendered through a
 * CSS mask instead of an <img>. That keeps them tintable with `currentColor`
 * exactly like the lucide icons they sit next to.
 */
function MaskIcon({
  src,
  className,
  filled = true,
}: {
  src: string;
  className?: string | undefined;
  filled?: boolean | undefined;
}) {
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        display: "inline-block",
        backgroundColor: "currentColor",
        opacity: filled ? 1 : 0.85,
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
    />
  );
}

/** Clap / "like" reaction. */
export function ClapIcon({ className }: { className?: string | undefined }) {
  return <MaskIcon src="/icons/clap.svg" className={className} />;
}

/** Heart / "love" reaction. */
export function HeartAngleIcon({ className }: { className?: string | undefined }) {
  return <MaskIcon src="/icons/heart.svg" className={className} />;
}
