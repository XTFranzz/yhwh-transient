import type { HTMLAttributes, ReactNode } from "react";

export function Card({ className = "", children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`rounded-2xl border border-ink-100 bg-white shadow-card ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-2 p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink-500">{label}</span>
        {icon && <span className="text-ink-400">{icon}</span>}
      </div>
      <span className="text-2xl font-semibold text-ink-900">{value}</span>
      {hint && <span className="text-xs text-ink-500">{hint}</span>}
    </Card>
  );
}
