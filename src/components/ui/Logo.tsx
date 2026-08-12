interface LogoMarkProps {
  size?: number;
  className?: string;
  /** "dark" for navy-on-light use (default); "light" for placement on a navy/dark field. */
  tone?: "dark" | "light";
}

// Custom crest mark for YHWH Transient: a circular badge framing a three-roof
// skyline, split by a ribbon divider — the site's own identity instead of a
// generic icon-font glyph.
export function LogoMark({ size = 32, className = "", tone = "dark" }: LogoMarkProps) {
  const line = tone === "dark" ? "stroke-ink-900" : "stroke-white";
  const fill = tone === "dark" ? "fill-ink-900" : "fill-white";
  const ring = tone === "dark" ? "stroke-brand-500" : "stroke-brand-300";

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} aria-hidden="true">
      <circle cx="50" cy="50" r="45" className={line} strokeWidth="3" fill="none" />
      <circle cx="50" cy="50" r="38" className={ring} strokeWidth="2" fill="none" />

      <path d="M12,52 L27,30 L42,52 Z" className={fill} />
      <path d="M58,52 L73,30 L88,52 Z" className={fill} />

      <path d="M30,52 L50,15 L70,52" className={line} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" fill="none" />
      <path d="M35,52 L50,23 L65,52" className={line} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" fill="none" />

      <line x1="5" y1="52" x2="95" y2="52" className={line} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="5" cy="52" r="2.5" className={fill} />
      <circle cx="95" cy="52" r="2.5" className={fill} />
    </svg>
  );
}
