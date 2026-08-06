import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { formatDate, formatMoney, formatPaymentMethod, formatStatus } from "../../../lib/format";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { StatusBadge } from "../../../components/ui/Badge";
import { PageSpinner, ErrorBanner } from "../../../components/ui/Feedback";

export function BookingLookupPage() {
  const [referenceNumber, setReferenceNumber] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState<{ referenceNumber: string; email: string } | null>(null);

  const result = useQuery(api.bookings.lookupByReferenceAndEmail, submitted ?? "skip");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted({ referenceNumber: referenceNumber.trim(), email: email.trim() });
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-ink-900">Manage my booking</h1>
      <p className="mt-2 text-sm text-ink-500">Enter your booking reference and the email you booked with.</p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <Input
          label="Booking reference"
          placeholder="YHWH-XXXXXX"
          value={referenceNumber}
          onChange={(e) => setReferenceNumber(e.target.value)}
          required
        />
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Button type="submit">Look up booking</Button>
      </form>

      {submitted && result === undefined && <PageSpinner />}
      {submitted && result === null && (
        <div className="mt-6">
          <ErrorBanner message="We couldn't find a booking with that reference and email. Please double-check and try again." />
        </div>
      )}
      {result && (
        <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-ink-100 p-5 shadow-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-lg font-semibold text-ink-900">{result.listing?.title}</p>
              <p className="text-sm text-ink-500">Ref: {result.booking.referenceNumber}</p>
            </div>
            <StatusBadge status={result.booking.status} label={formatStatus(result.booking.status)} />
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm text-ink-600">
            <div>
              <p className="text-ink-400">Check-in</p>
              <p>{formatDate(result.booking.startDate)}</p>
            </div>
            <div>
              <p className="text-ink-400">Check-out</p>
              <p>{formatDate(result.booking.endDate)}</p>
            </div>
            <div>
              <p className="text-ink-400">Guests</p>
              <p>{result.booking.guestCount}</p>
            </div>
            <div>
              <p className="text-ink-400">Total</p>
              <p className="font-medium text-ink-900">{formatMoney(result.booking.totalCentavos)}</p>
            </div>
          </div>

          {result.payments.length > 0 && (
            <div className="border-t border-ink-100 pt-3">
              <p className="mb-2 text-sm font-medium text-ink-800">Payment history</p>
              <ul className="flex flex-col gap-2">
                {result.payments.map((p) => (
                  <li key={p._id} className="flex items-center justify-between text-sm text-ink-600">
                    <span>
                      {formatMoney(p.amountCentavos)} via {formatPaymentMethod(p.method)}
                    </span>
                    <StatusBadge status={p.status} label={formatStatus(p.status)} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.booking.status === "pending_payment" && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Your booking is awaiting payment verification. We'll update this page once it's confirmed.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
