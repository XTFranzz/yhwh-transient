import { formatStatus } from "../../../../lib/format";

const STATUS_ORDER = ["pending_payment", "confirmed", "checked_in", "checked_out", "cancelled", "no_show"] as const;

export function BookingsStatusChart({ counts }: { counts: Record<string, number> }) {
  const max = Math.max(1, ...STATUS_ORDER.map((s) => counts[s] ?? 0));

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-ink-800">Bookings by status</p>
      <div className="flex flex-col gap-2.5">
        {STATUS_ORDER.map((status) => {
          const value = counts[status] ?? 0;
          const widthPct = Math.max(2, (value / max) * 100);
          return (
            <div key={status} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-xs text-ink-500">{formatStatus(status)}</span>
              <div className="h-6 flex-1 rounded bg-ink-50">
                <div
                  className="h-6 rounded-r bg-brand-500"
                  style={{ width: `${widthPct}%`, borderTopLeftRadius: 4, borderBottomLeftRadius: 4 }}
                />
              </div>
              <span className="w-6 shrink-0 text-right text-xs font-medium text-ink-700">{value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
