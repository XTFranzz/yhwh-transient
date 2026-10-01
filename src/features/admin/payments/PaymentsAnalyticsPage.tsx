import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { formatDate, formatMoney, formatPaymentMethod } from "../../../lib/format";
import { Card, StatTile } from "../../../components/ui/Card";
import { PageSpinner, EmptyState } from "../../../components/ui/Feedback";

const METHOD_ORDER = ["cash", "gcash", "bank_transfer"] as const;

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const widthPct = value > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-xs text-ink-500">{label}</span>
      <div className="h-6 flex-1 rounded bg-ink-50">
        <div className="h-6 rounded-r bg-brand-500" style={{ width: `${widthPct}%` }} />
      </div>
      <span className="w-24 shrink-0 text-right text-xs font-medium text-ink-700">{formatMoney(value)}</span>
    </div>
  );
}

function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-PH", { month: "short", year: "numeric" });
}

export function PaymentsAnalyticsPage() {
  const analytics = useQuery(api.payments.analytics, {});
  const recent = useQuery(api.payments.listAll, { status: "verified" });

  if (analytics === undefined || recent === undefined) return <PageSpinner />;

  const thisMonthKey = new Date().toISOString().slice(0, 7);
  const thisMonthCentavos = analytics.byMonth.find((m) => m.month === thisMonthKey)?.amountCentavos ?? 0;
  const methodMax = Math.max(1, ...METHOD_ORDER.map((m) => analytics.byMethod[m].amountCentavos));
  const monthMax = Math.max(1, ...analytics.byMonth.map((m) => m.amountCentavos));
  const recentPayments = recent.slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-ink-900">Payments</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Total revenue" value={formatMoney(analytics.totalCentavos)} hint="Verified payments" />
        <StatTile label="This month" value={formatMoney(thisMonthCentavos)} />
        <StatTile label="Payments recorded" value={analytics.count} />
        <StatTile label="Average payment" value={formatMoney(analytics.averageCentavos)} />
      </div>

      {analytics.count === 0 ? (
        <EmptyState title="No payments yet" description="Revenue analytics will appear once staff record payments." />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="flex flex-col gap-3 p-5">
            <p className="text-sm font-semibold text-ink-800">Revenue by method</p>
            {METHOD_ORDER.map((m) => (
              <BarRow key={m} label={formatPaymentMethod(m)} value={analytics.byMethod[m].amountCentavos} max={methodMax} />
            ))}
          </Card>

          <Card className="flex flex-col gap-3 p-5">
            <p className="text-sm font-semibold text-ink-800">Revenue by month</p>
            {analytics.byMonth.map((m) => (
              <BarRow key={m.month} label={formatMonth(m.month)} value={m.amountCentavos} max={monthMax} />
            ))}
          </Card>
        </div>
      )}

      <div>
        <p className="mb-3 text-sm font-semibold text-ink-800">Recent payments</p>
        {recentPayments.length === 0 ? (
          <EmptyState title="No payments yet" description="Payments recorded by staff will show up here." />
        ) : (
          <div className="flex flex-col gap-3">
            {recentPayments.map((p) => (
              <div key={p._id} className="flex flex-col gap-2 rounded-2xl border border-ink-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-ink-900">{p.customer?.fullName ?? "—"}</p>
                  <p className="text-sm text-ink-500">
                    {p.booking ? `${formatDate(p.booking.startDate)} → ${formatDate(p.booking.endDate)}` : ""} · Ref{" "}
                    {p.booking?.referenceNumber}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm">
                    {formatMoney(p.amountCentavos)} via {formatPaymentMethod(p.method)}
                    {p.transactionRef && <span className="text-ink-400"> (txn: {p.transactionRef})</span>}
                  </span>
                  {p.booking && (
                    <Link to={`/admin/reservations/${p.booking._id}`} className="text-xs font-medium text-brand-600 hover:text-brand-700">
                      View reservation
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
