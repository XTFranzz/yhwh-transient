import { useMemo, useState } from "react";
import { Icon } from "../../../../components/ui/Icon";

interface BlockedRange {
  startDate: string;
  endDate: string;
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isBlocked(dateString: string, blocks: BlockedRange[]): boolean {
  return blocks.some((b) => dateString >= b.startDate && dateString < b.endDate);
}

function buildMonthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(Date.UTC(year, month, 1));
  const startDay = first.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (Date | null)[] = Array(startDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(Date.UTC(year, month, d)));
  return cells;
}

export function AvailabilityCalendar({ blockedRanges }: { blockedRanges: BlockedRange[] }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const today = toDateString(new Date());

  const months = useMemo(() => {
    const base = new Date();
    return [0, 1].map((offset) => {
      const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + monthOffset + offset, 1));
      return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
    });
  }, [monthOffset]);

  return (
    <div className="rounded-2xl border border-ink-100 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-ink-800">Availability</p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setMonthOffset((m) => Math.max(0, m - 1))}
            className="rounded-full px-2 py-1 text-sm text-ink-500 hover:bg-ink-100"
            aria-label="Previous month"
          >
            <Icon name="chevron-left" />
          </button>
          <button
            type="button"
            onClick={() => setMonthOffset((m) => m + 1)}
            className="rounded-full px-2 py-1 text-sm text-ink-500 hover:bg-ink-100"
            aria-label="Next month"
          >
            <Icon name="chevron-right" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {months.map(({ year, month }) => (
          <div key={`${year}-${month}`}>
            <p className="mb-2 text-center text-xs font-medium text-ink-500">
              {new Date(Date.UTC(year, month, 1)).toLocaleDateString("en-PH", { month: "long", year: "numeric" })}
            </p>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-ink-400">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {buildMonthGrid(year, month).map((date, i) => {
                if (!date) return <span key={i} />;
                const dateString = toDateString(date);
                const blocked = isBlocked(dateString, blockedRanges);
                const past = dateString < today;
                return (
                  <span
                    key={i}
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${
                      past || blocked ? "text-ink-300 line-through" : "text-ink-700"
                    }`}
                  >
                    {date.getUTCDate()}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-ink-400">Dates shown with a strikethrough are already booked or unavailable.</p>
    </div>
  );
}
