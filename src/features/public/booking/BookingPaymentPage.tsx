import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { formatMoney } from "../../../lib/format";
import { Button } from "../../../components/ui/Button";
import { Input, Select } from "../../../components/ui/Input";
import { ErrorBanner } from "../../../components/ui/Feedback";

interface LocationState {
  bookingId: Id<"bookings">;
  referenceNumber: string;
  totalCentavos: number;
}

export function BookingPaymentPage() {
  const { reference = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;

  const generateUploadUrl = useMutation(api.payments.generateReceiptUploadUrl);
  const submitReceipt = useMutation(api.payments.submitReceipt);

  const [method, setMethod] = useState<"gcash" | "bank_transfer">("gcash");
  const [amount, setAmount] = useState(state ? (state.totalCentavos / 100).toFixed(2) : "");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!state) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-ink-700">
          We lost track of your booking session (reference <strong>{reference}</strong>). You can still submit your
          payment proof by looking up your booking.
        </p>
        <Link to="/my-booking" className="mt-4 inline-block text-brand-600 underline">
          Manage my booking
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) {
      setError("Please attach a screenshot or photo of your payment receipt.");
      return;
    }
    const amountCentavos = Math.round(Number(amount) * 100);
    if (!amountCentavos || amountCentavos <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    setSubmitting(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      if (!res.ok) throw new Error("Upload failed, please try again.");
      const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };

      await submitReceipt({
        bookingId: state!.bookingId,
        referenceNumber: state!.referenceNumber,
        storageId,
        amountCentavos,
        method,
      });

      navigate(`/book/${state!.referenceNumber}/confirmation`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-ink-900">Submit your payment</h1>
      <p className="mt-2 text-sm text-ink-500">
        Booking reference <strong className="text-ink-800">{state.referenceNumber}</strong> — total due{" "}
        <strong className="text-ink-800">{formatMoney(state.totalCentavos)}</strong>
      </p>

      <div className="mt-6 rounded-2xl border border-ink-100 bg-ink-50 p-4 text-sm text-ink-700">
        <p className="font-medium text-ink-900">Payment details</p>
        <p className="mt-1">GCash: 0917-123-4567 (Y. Owner)</p>
        <p>Bank transfer: BDO 0012-3456-7890 (YHWH Transient)</p>
        <p className="mt-2 text-ink-500">
          Pay the total amount above, then upload a screenshot of your receipt below. We'll verify it and confirm
          your booking within a few hours.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <Select label="Payment method" value={method} onChange={(e) => setMethod(e.target.value as typeof method)}>
          <option value="gcash">GCash</option>
          <option value="bank_transfer">Bank transfer</option>
        </Select>
        <Input
          label="Amount paid (₱)"
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-800">Payment receipt</span>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm text-ink-600 file:mr-3 file:rounded-full file:border-0 file:bg-ink-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-ink-700 hover:file:bg-ink-200"
          />
        </label>
        {error && <ErrorBanner message={error} />}
        <Button type="submit" size="lg" isLoading={submitting}>
          Submit payment
        </Button>
      </form>
    </div>
  );
}
