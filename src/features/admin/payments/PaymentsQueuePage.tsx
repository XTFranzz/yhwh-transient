import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { formatDate, formatMoney, formatPaymentMethod } from "../../../lib/format";
import { Button } from "../../../components/ui/Button";
import { Textarea } from "../../../components/ui/Input";
import { Modal } from "../../../components/ui/Modal";
import { PageSpinner, EmptyState, ErrorBanner } from "../../../components/ui/Feedback";

export function PaymentsQueuePage() {
  const payments = useQuery(api.payments.listQueue, { status: "submitted" });
  const verify = useMutation(api.payments.verify);
  const reject = useMutation(api.payments.reject);

  const [rejectingId, setRejectingId] = useState<Id<"payments"> | null>(null);
  const [reason, setReason] = useState("");
  const [busyId, setBusyId] = useState<Id<"payments"> | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (payments === undefined) return <PageSpinner />;

  async function handleVerify(id: Id<"payments">) {
    setError(null);
    setBusyId(id);
    try {
      await verify({ paymentId: id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify payment.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject() {
    if (!rejectingId) return;
    setError(null);
    setBusyId(rejectingId);
    try {
      await reject({ paymentId: rejectingId, reason: reason.trim() || "Payment could not be verified." });
      setRejectingId(null);
      setReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reject payment.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-ink-900">Payments to verify</h1>
      {error && <ErrorBanner message={error} />}

      {payments.length === 0 ? (
        <EmptyState title="No payments waiting for review" description="New payment submissions will show up here." />
      ) : (
        <div className="flex flex-col gap-4">
          {payments.map((p) => (
            <div key={p._id} className="flex flex-col gap-4 rounded-2xl border border-ink-100 p-5 sm:flex-row sm:items-center">
              {p.receiptUrl && (
                <a href={p.receiptUrl} target="_blank" rel="noreferrer" className="shrink-0">
                  <img src={p.receiptUrl} alt="Receipt" className="h-24 w-24 rounded-xl object-cover" />
                </a>
              )}
              <div className="flex-1">
                <p className="font-medium text-ink-900">{p.guest?.fullName ?? "—"}</p>
                <p className="text-sm text-ink-500">
                  {p.booking ? `${formatDate(p.booking.startDate)} → ${formatDate(p.booking.endDate)}` : ""} · Ref{" "}
                  {p.booking?.referenceNumber}
                </p>
                <p className="mt-1 text-sm">
                  {formatMoney(p.amountCentavos)} via {formatPaymentMethod(p.method)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" isLoading={busyId === p._id} onClick={() => setRejectingId(p._id)}>
                  Reject
                </Button>
                <Button isLoading={busyId === p._id} onClick={() => void handleVerify(p._id)}>
                  Verify
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={rejectingId !== null} onClose={() => setRejectingId(null)} title="Reject payment">
        <Textarea
          label="Reason (shown to guest)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Amount doesn't match the total due"
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setRejectingId(null)}>
            Cancel
          </Button>
          <Button variant="danger" isLoading={busyId === rejectingId} onClick={() => void handleReject()}>
            Reject payment
          </Button>
        </div>
      </Modal>
    </div>
  );
}
