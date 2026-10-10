/**
 * Custom QBlock reaction icons.
 *
 * Rendered as inline SVGs with fill="currentColor" or vibrant gradients,
 * crisp, and tintable with standard Tailwind text colors.
 */

/** Heart reaction using heart-svgrepo-com.svg path with vibrant orange gradient */
export function OrangeHeartIcon({ className = "h-4 w-4" }: { className?: string }) {
  const gradientId = "qb-heart-orange-grad";
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff7a52" />
          <stop offset="50%" stopColor="#fa4616" />
          <stop offset="100%" stopColor="#d93800" />
        </linearGradient>
      </defs>
      <path
        d="M2 9.1371C2 14 6.01943 16.5914 8.96173 18.9109C10 19.7294 11 20.5 12 20.5C13 20.5 14 19.7294 15.0383 18.9109C17.9806 16.5914 22 14 22 9.1371C22 4.27416 16.4998 0.825464 12 5.50063C7.50016 0.825464 2 4.27416 2 9.1371Z"
        fill={`url(#${gradientId})`}
      />
    </svg>
  );
}

/** Replaced Clap reaction with the requested Orange Heart icon */
export function ClapIcon({ className }: { className?: string | undefined }) {
  return <OrangeHeartIcon className={className ?? "h-4 w-4"} />;
}

/** Heart / "love" reaction. */
export function HeartAngleIcon({ className }: { className?: string | undefined }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className ?? "h-4 w-4"}
      aria-hidden="true"
      style={{ display: "inline-block", verticalAlign: "middle" }}
    >
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}
