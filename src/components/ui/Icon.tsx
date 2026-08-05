interface IconProps {
  name: string;
  className?: string;
}

// Thin wrapper around Bootstrap Icons (imported globally in index.css) so call
// sites read as <Icon name="house-door" /> instead of raw <i> class strings.
export function Icon({ name, className = "" }: IconProps) {
  return <i className={`bi bi-${name} ${className}`} aria-hidden="true" />;
}
