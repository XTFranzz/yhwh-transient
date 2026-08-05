import type { ReactNode } from "react";

type Tone = "neutral" | "warning" | "success" | "danger" | "info";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-ink-100 text-ink-700",
  warning: "bg-amber-100 text-amber-800",
  success: "bg-teal-100 text-teal-800",
  danger: "bg-red-100 text-red-700",
  info: "bg-sky-100 text-sky-700",
};

const STATUS_TONES: Record<string, Tone> = {
  pending_payment: "warning",
  confirmed: "info",
  checked_in: "success",
  checked_out: "neutral",
  cancelled: "danger",
  no_show: "danger",
  submitted: "warning",
  verified: "success",
  rejected: "danger",
  draft: "neutral",
  active: "success",
  inactive: "neutral",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${TONE_CLASSES[tone]}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return <Badge tone={STATUS_TONES[status] ?? "neutral"}>{label}</Badge>;
}
