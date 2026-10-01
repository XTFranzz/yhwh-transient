import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { formatDate, formatMoney, formatStatus } from "../../../lib/format";
import { Badge, StatusBadge } from "../../../components/ui/Badge";
import { PageSpinner, EmptyState } from "../../../components/ui/Feedback";
import { Button } from "../../../components/ui/Button";
import { Icon } from "../../../components/ui/Icon";
import { useReservationsFilterStore } from "../../../lib/store";

const FILTERS = [
  { value: null, label: "All" },
  { value: "pending_payment", label: "Pending payment" },
  { value: "confirmed", label: "Confirmed" },
  { value: "checked_in", label: "Checked in" },
  { value: "checked_out", label: "Checked out" },
  { value: "cancelled", label: "Cancelled" },
];

const TYPE_ICON: Record<string, string> = { house: "house-door", vehicle: "truck", tour: "signpost-2" };

export function ReservationsListPage() {
  const status = useReservationsFilterStore((s) => s.status);
  const setStatus = useReservationsFilterStore((s) => s.setStatus);
  const bookings = useQuery(api.bookings.listForAdmin, status ? { status: status as never } : {});

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink-900">Reservations</h1>
        <Link to="/admin/reservations/new">
          <Button>+ New reservation</Button>
        </Link>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => setStatus(f.value)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium ${
              status === f.value ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 text-ink-600 hover:bg-ink-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {bookings === undefined ? (
        <PageSpinner />
      ) : bookings.length === 0 ? (
        <EmptyState title="No reservations found" description="Try a different filter." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-ink-100 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-ink-100 bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Listing</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {bookings.map((b) => (
                <tr key={b._id} className="cursor-pointer hover:bg-ink-50">
                  <td className="px-4 py-3">
                    <Link to={`/admin/reservations/${b._id}`} className="block font-medium text-ink-900">
                      {b.customer?.fullName ?? "—"}
                    </Link>
                    <span className="text-xs text-ink-400">{b.referenceNumber}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <Icon name={b.listing ? TYPE_ICON[b.listing.type] : "question-circle"} className="text-ink-400" />
                      {b.listing?.title ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {formatDate(b.startDate)} → {formatDate(b.endDate)}
                  </td>
                  <td className="px-4 py-3">{formatMoney(b.totalCentavos)}</td>
                  <td className="px-4 py-3">
                    {b.status === "pending_payment" && b.paidCentavos > 0 ? (
                      <Badge tone="info">Down payment: {formatMoney(b.paidCentavos)}</Badge>
                    ) : b.status === "pending_payment" ? (
                      <span className="text-ink-400">Unpaid</span>
                    ) : ["confirmed", "checked_in", "checked_out"].includes(b.status) ? (
                      <span className="text-teal-700">Paid in full</span>
                    ) : (
                      <span className="text-ink-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={b.status} label={formatStatus(b.status)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
