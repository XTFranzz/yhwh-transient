interface PineTreeProps {
  size?: number;
  className?: string;
}

// Decorative conifer silhouette used around the homepage hero photos.
export function PineTree({ size = 48, className = "" }: PineTreeProps) {
  return (
    <svg viewBox="0 0 48 64" width={size} height={(size * 64) / 48} className={className} aria-hidden="true" fill="currentColor">
      <path d="M24 0 L32 16 L27 16 L35 28 L29 28 L38 42 L27 42 L27 64 L21 64 L21 42 L10 42 L19 28 L13 28 L21 16 L16 16 Z" />
    </svg>
  );
}
