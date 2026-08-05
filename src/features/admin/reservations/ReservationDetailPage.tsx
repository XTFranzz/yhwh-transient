import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { formatDate, formatMoney, formatStatus } from "../../../lib/format";
import { Button } from "../../../components/ui/Button";
import { StatusBadge } from "../../../components/ui/Badge";
import { PageSpinner, ErrorBanner } from "../../../components/ui/Feedback";

type BookingStatus = "pending_payment" | "confirmed" | "checked_in" | "checked_out" | "cancelled" | "no_show";

const TRANSITIONS: Record<BookingStatus, { status: BookingStatus; label: string; variant: "primary" | "danger" }[]> = {
  pending_payment: [
    { status: "confirmed", label: "Mark confirmed", variant: "primary" },
    { status: "cancelled", label: "Cancel booking", variant: "danger" },
  ],
  confirmed: [
    { status: "checked_in", label: "Check in", variant: "primary" },
    { status: "cancelled", label: "Cancel booking", variant: "danger" },
    { status: "no_show", label: "Mark no-show", variant: "danger" },
  ],
  checked_in: [{ status: "checked_out", label: "Check out", variant: "primary" }],
  checked_out: [],
  cancelled: [],
  no_show: [],
};

export function ReservationDetailPage() {
  const { bookingId = "" } = useParams();
  const detail = useQuery(api.bookings.getDetail, { bookingId: bookingId as Id<"bookings"> });
  const updateStatus = useMutation(api.bookings.updateStatus);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (detail === undefined) return <PageSpinner />;
  if (detail === null) return <ErrorBanner message="Reservation not found." />;

  const { booking, guest, listing, payments } = detail;

  async function handleTransition(newStatus: BookingStatus) {
    setError(null);
    setSubmitting(true);
    try {
      await updateStatus({ bookingId: booking._id, newStatus });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update status.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/admin/reservations" className="text-sm text-ink-500 hover:text-ink-800">
        ← Back to reservations
      </Link>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">{listing?.title}</h1>
          <p className="text-sm text-ink-500">Ref: {booking.referenceNumber}</p>
        </div>
        <StatusBadge status={booking.status} label={formatStatus(booking.status)} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 rounded-2xl border border-ink-100 p-5 text-sm">
        <div>
          <p className="text-ink-400">Guest</p>
          <p className="font-medium text-ink-900">{guest?.fullName}</p>
          <p className="text-ink-500">{guest?.email}</p>
          <p className="text-ink-500">{guest?.phone}</p>
        </div>
        <div>
          <p className="text-ink-400">Stay</p>
          <p>
            {formatDate(booking.startDate)} → {formatDate(booking.endDate)}
          </p>
          <p className="text-ink-500">{booking.guestCount} guests</p>
        </div>
        <div>
          <p className="text-ink-400">Total</p>
          <p className="font-medium text-ink-900">{formatMoney(booking.totalCentavos)}</p>
        </div>
        {booking.guestNotes && (
          <div className="col-span-2">
            <p className="text-ink-400">Notes</p>
            <p>{booking.guestNotes}</p>
          </div>
        )}
      </div>

      {payments.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-ink-800">Payments</h2>
          <div className="flex flex-col gap-3">
            {payments.map((p) => (
              <div key={p._id} className="flex items-center justify-between rounded-xl border border-ink-100 p-3 text-sm">
                <div className="flex items-center gap-3">
                  {p.receiptUrl && (
                    <a href={p.receiptUrl} target="_blank" rel="noreferrer">
                      <img src={p.receiptUrl} alt="Receipt" className="h-12 w-12 rounded-lg object-cover" />
                    </a>
                  )}
                  <div>
                    <p>
                      {formatMoney(p.amountCentavos)} via {p.method === "gcash" ? "GCash" : "Bank transfer"}
                    </p>
                    {p.rejectionReason && <p className="text-xs text-red-600">{p.rejectionReason}</p>}
                  </div>
                </div>
                <StatusBadge status={p.status} label={formatStatus(p.status)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4">
          <ErrorBanner message={error} />
        </div>
      )}

      {TRANSITIONS[booking.status as BookingStatus].length > 0 && (
        <div className="mt-6 flex gap-3">
          {TRANSITIONS[booking.status as BookingStatus].map((t) => (
            <Button key={t.status} variant={t.variant} isLoading={submitting} onClick={() => void handleTransition(t.status)}>
              {t.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
