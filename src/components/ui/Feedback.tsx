import type { ReactNode } from "react";

export function Spinner({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <div className={`animate-spin rounded-full border-2 border-ink-200 border-t-brand-500 ${className}`} />
  );
}

export function PageSpinner() {
  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <Spinner className="h-8 w-8" />
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-ink-200 py-16 text-center">
      <p className="text-base font-medium text-ink-800">{title}</p>
      {description && <p className="max-w-sm text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>
  );
}
