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

      {/* Small cross-pane windows on each gable — without these the three
          peaks read as a mountain range instead of a row of houses. */}
      <g className={ring} strokeWidth="1.3" fill="none">
        <rect x="23" y="40" width="8" height="8" />
        <line x1="27" y1="40" x2="27" y2="48" />
        <line x1="23" y1="44" x2="31" y2="44" />
        <rect x="46" y="40" width="8" height="8" />
        <line x1="50" y1="40" x2="50" y2="48" />
        <line x1="46" y1="44" x2="54" y2="44" />
        <rect x="69" y="40" width="8" height="8" />
        <line x1="73" y1="40" x2="73" y2="48" />
        <line x1="69" y1="44" x2="77" y2="44" />
      </g>

      <line x1="5" y1="52" x2="95" y2="52" className={line} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="5" cy="52" r="2.5" className={fill} />
      <circle cx="95" cy="52" r="2.5" className={fill} />
    </svg>
  );
}

interface LogoWordmarkProps {
  size?: number;
  className?: string;
  tone?: "dark" | "light";
  tagline?: string;
}

// Full lockup (mark + stacked name/tagline) for the header and footer — a
// small-caps serif wordmark with a tracked tagline beneath it.
export function LogoWordmark({ size = 34, className = "", tone = "light", tagline = "Staycation Houses" }: LogoWordmarkProps) {
  const nameColor = tone === "dark" ? "text-ink-900" : "text-white";
  const taglineColor = tone === "dark" ? "text-ink-500" : "text-ink-300";

  return (
    <span className={`flex items-center gap-3 ${className}`}>
      <LogoMark size={size} tone={tone} />
      <span className="flex flex-col leading-none">
        <span className={`font-serif text-lg font-semibold tracking-wide ${nameColor}`}>YHWH Transient</span>
        <span className={`mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${taglineColor}`}>{tagline}</span>
      </span>
    </span>
  );
}
