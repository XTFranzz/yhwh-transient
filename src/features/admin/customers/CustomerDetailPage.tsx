import { Link, useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { formatDate, formatMoney, formatStatus } from "../../../lib/format";
import { Button } from "../../../components/ui/Button";
import { StatusBadge } from "../../../components/ui/Badge";
import { Icon } from "../../../components/ui/Icon";
import { PageSpinner, EmptyState, ErrorBanner } from "../../../components/ui/Feedback";

const TYPE_ICON: Record<string, string> = { house: "house-door", vehicle: "truck", tour: "signpost-2" };

export function CustomerDetailPage() {
  const { customerId = "" } = useParams();
  const detail = useQuery(api.customers.get, { customerId: customerId as Id<"customers"> });

  if (detail === undefined) return <PageSpinner />;
  if (detail === null) return <ErrorBanner message="Customer not found." />;

  const { customer, bookingHistory, bookingCount, lifetimeCentavos } = detail;

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/admin/customers" className="text-sm text-ink-500 hover:text-ink-800">
        ← Back to customers
      </Link>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">{customer.fullName}</h1>
          <p className="text-sm text-ink-500">
            {customer.email} · {customer.phone}
          </p>
        </div>
        <Link to={`/admin/reservations/new?customerId=${customer._id}`}>
          <Button>New reservation</Button>
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 rounded-2xl border border-ink-100 p-5 text-sm">
        <div>
          <p className="text-ink-400">Bookings</p>
          <p className="font-medium text-ink-900">{bookingCount}</p>
        </div>
        <div>
          <p className="text-ink-400">Lifetime value</p>
          <p className="font-medium text-ink-900">{formatMoney(lifetimeCentavos)}</p>
        </div>
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold text-ink-800">Booking history</h2>
      {bookingHistory.length === 0 ? (
        <EmptyState title="No bookings yet" description="Reservations for this customer will show up here." />
      ) : (
        <div className="flex flex-col gap-3">
          {bookingHistory.map((b) => (
            <Link
              key={b._id}
              to={`/admin/reservations/${b._id}`}
              className="flex items-center justify-between rounded-2xl border border-ink-100 p-4 text-sm hover:bg-ink-50"
            >
              <div>
                <span className="flex items-center gap-2 font-medium text-ink-900">
                  <Icon name={b.listing ? TYPE_ICON[b.listing.type] : "question-circle"} className="text-ink-400" />
                  {b.listing?.title ?? "—"}
                </span>
                <p className="mt-1 text-ink-500">
                  {formatDate(b.startDate)} → {formatDate(b.endDate)} · Ref {b.referenceNumber}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <StatusBadge status={b.status} label={formatStatus(b.status)} />
                <span className="text-xs text-ink-500">
                  {formatMoney(b.totalCentavos)}
                  {b.balanceCentavos > 0 && ` · ${formatMoney(b.balanceCentavos)} due`}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
