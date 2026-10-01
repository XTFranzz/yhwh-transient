import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { formatMoney } from "../../../lib/format";
import { StatTile, Card } from "../../../components/ui/Card";
import { PageSpinner } from "../../../components/ui/Feedback";
import { BookingsStatusChart } from "./components/BookingsStatusChart";
import { BookingsCalendar } from "./components/BookingsCalendar";

export function DashboardPage() {
  const summary = useQuery(api.dashboard.summary, {});
  const bookings = useQuery(api.bookings.listForAdmin, {});

  if (summary === undefined || bookings === undefined) return <PageSpinner />;

  const statusCounts = bookings.reduce<Record<string, number>>((acc, b) => {
    acc[b.status] = (acc[b.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Dashboard</h1>
        <p className="text-sm text-ink-500">
          Showing data for {summary.from} to {summary.to}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Revenue" value={formatMoney(summary.revenueCentavos)} hint="Verified payments" />
        <StatTile label="Occupancy rate" value={`${Math.round(summary.occupancyRate * 100)}%`} />
        <StatTile label="Total bookings" value={summary.totalBookings} />
        <StatTile label="Pending bookings" value={summary.pendingBookings} />
        <StatTile label="Check-ins today" value={summary.todayCheckIns} />
        <StatTile label="Check-outs today" value={summary.todayCheckOuts} />
      </div>

      <Card className="p-5">
        <BookingsStatusChart counts={statusCounts} />
      </Card>

      <BookingsCalendar bookings={bookings} />
    </div>
  );
}
