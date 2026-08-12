import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { formatDate, formatMoney, formatPaymentMethod, formatStatus } from "../../../lib/format";
import { Button } from "../../../components/ui/Button";
import { Input, Select } from "../../../components/ui/Input";
import { Modal } from "../../../components/ui/Modal";
import { StatusBadge } from "../../../components/ui/Badge";
import { PageSpinner, ErrorBanner } from "../../../components/ui/Feedback";

type BookingStatus = "pending_payment" | "confirmed" | "checked_in" | "checked_out" | "cancelled" | "no_show";

const TRANSITIONS: Record<BookingStatus, { status: BookingStatus; label: string; variant: "primary" | "danger" }[]> = {
  pending_payment: [{ status: "cancelled", label: "Cancel booking", variant: "danger" }],
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
  const recordPayment = useMutation(api.payments.recordByStaff);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"gcash" | "bank_transfer" | "cash">("cash");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);

  if (detail === undefined) return <PageSpinner />;
  if (detail === null) return <ErrorBanner message="Reservation not found." />;

  const { booking, customer, listing, payments, paidCentavos, balanceCentavos } = detail;
  const canRecordPayment = balanceCentavos > 0 && booking.status !== "cancelled" && booking.status !== "no_show";

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

  function openPaymentModal() {
    setPaymentAmount((balanceCentavos / 100).toFixed(2));
    setPaymentError(null);
    setShowPaymentModal(true);
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    setPaymentError(null);
    const amountCentavos = Math.round(Number(paymentAmount) * 100);
    if (!amountCentavos || amountCentavos <= 0) {
      setPaymentError("Please enter a valid amount.");
      return;
    }
    setRecording(true);
    try {
      await recordPayment({ bookingId: booking._id, amountCentavos, method: paymentMethod });
      setShowPaymentModal(false);
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : "Could not record payment.");
    } finally {
      setRecording(false);
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
          <p className="text-ink-400">Customer</p>
          <p className="font-medium text-ink-900">{customer?.fullName}</p>
          <p className="text-ink-500">{customer?.email}</p>
          <p className="text-ink-500">{customer?.phone}</p>
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
          <p className="mt-1 text-ink-500">Paid {formatMoney(paidCentavos)}</p>
          <p className={balanceCentavos > 0 ? "font-medium text-amber-600" : "text-ink-500"}>
            Balance {formatMoney(balanceCentavos)}
          </p>
        </div>
        {booking.customerNotes && (
          <div className="col-span-2">
            <p className="text-ink-400">Notes</p>
            <p>{booking.customerNotes}</p>
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
                      {formatMoney(p.amountCentavos)} via {formatPaymentMethod(p.method)}
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

      <div className="mt-6 flex flex-wrap gap-3">
        {canRecordPayment && <Button onClick={openPaymentModal}>Record payment</Button>}
        {TRANSITIONS[booking.status as BookingStatus].map((t) => (
          <Button key={t.status} variant={t.variant} isLoading={submitting} onClick={() => void handleTransition(t.status)}>
            {t.label}
          </Button>
        ))}
      </div>

      <Modal open={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Record payment">
        <form onSubmit={handleRecordPayment} className="flex flex-col gap-4">
          <p className="text-sm text-ink-500">
            Balance due: <span className="font-medium text-ink-900">{formatMoney(balanceCentavos)}</span>. Only use
            this once you've verified the payment yourself (cash in hand, or a GCash/bank screenshot from the
            customer). Paying less than the balance keeps the reservation pending; cash can go over the balance to
            cover a tip.
          </p>
          <Select label="Payment method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}>
            <option value="cash">Cash</option>
            <option value="gcash">GCash</option>
            <option value="bank_transfer">Bank transfer</option>
          </Select>
          <Input
            label="Amount received (₱)"
            type="number"
            min="0"
            step="0.01"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            required
          />
          {paymentError && <ErrorBanner message={paymentError} />}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowPaymentModal(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={recording}>
              Confirm payment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
