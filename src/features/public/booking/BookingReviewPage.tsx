import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { formatDate, formatMoney } from "../../../lib/format";
import { useBookingDraftStore } from "../../../lib/store";
import { Button } from "../../../components/ui/Button";
import { Input, Textarea } from "../../../components/ui/Input";
import { PageSpinner, ErrorBanner } from "../../../components/ui/Feedback";

export function BookingReviewPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const listing = useQuery(api.listings.getBySlug, { slug });
  const createBooking = useMutation(api.bookings.create);
  const draft = useBookingDraftStore((s) => s.draft);
  const setGuestInfo = useBookingDraftStore((s) => s.setGuestInfo);
  const setGuestNotes = useBookingDraftStore((s) => s.setGuestNotes);

  const [fullName, setFullName] = useState(draft.guest.fullName);
  const [email, setEmail] = useState(draft.guest.email);
  const [phone, setPhone] = useState(draft.guest.phone);
  const [notes, setNotes] = useState(draft.guestNotes);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (listing === undefined) return <PageSpinner />;

  if (listing === null || draft.listingSlug !== slug || !draft.checkIn || !draft.checkOut) {
    const backTo = listing
      ? listing.type === "house"
        ? `/listings/${slug}`
        : listing.type === "vehicle"
          ? `/vehicles/${slug}`
          : `/tours/${slug}`
      : "/";
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-ink-700">We couldn't find your booking details. Please start again from the listing page.</p>
        <Link to={backTo} className="mt-4 inline-block text-brand-600 underline">
          Back to listing
        </Link>
      </div>
    );
  }

  const isTour = listing.type === "tour";
  const units = Math.round((new Date(draft.checkOut).getTime() - new Date(draft.checkIn).getTime()) / 86400000);
  const totalCentavos = isTour ? draft.guestCount * listing.basePriceCentavos : units * listing.basePriceCentavos;
  const unitLabel = listing.type === "house" ? "night" : listing.type === "vehicle" ? "day" : "guest";
  const unitCount = isTour ? draft.guestCount : units;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      setError("Please fill in your name, email, and phone number.");
      return;
    }
    setSubmitting(true);
    try {
      setGuestInfo({ fullName, email, phone });
      setGuestNotes(notes);
      const result = await createBooking({
        listingId: listing!._id,
        startDate: draft.checkIn!,
        endDate: draft.checkOut!,
        guestCount: draft.guestCount,
        guest: { fullName: fullName.trim(), email: email.trim(), phone: phone.trim() },
        guestNotes: notes.trim() || undefined,
      });
      navigate(`/book/${result.referenceNumber}/payment`, {
        state: { bookingId: result.bookingId, referenceNumber: result.referenceNumber, totalCentavos: result.totalCentavos },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-ink-900">Confirm and pay</h1>

      <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-ink-900">Your details</h2>
          <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input label="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <Textarea
            label="Special requests (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Late check-out, extra pillows, etc."
          />
          {error && <ErrorBanner message={error} />}
          <Button type="submit" size="lg" isLoading={submitting}>
            Continue to payment
          </Button>
        </form>

        <div className="flex flex-col gap-4 rounded-2xl border border-ink-100 p-5 shadow-card">
          <h2 className="text-lg font-semibold text-ink-900">{listing.title}</h2>
          <div className="flex justify-between text-sm text-ink-600">
            <span>{isTour ? "Tour date" : listing.type === "vehicle" ? "Pickup" : "Check-in"}</span>
            <span>{formatDate(draft.checkIn)}</span>
          </div>
          {!isTour && (
            <div className="flex justify-between text-sm text-ink-600">
              <span>{listing.type === "vehicle" ? "Return" : "Check-out"}</span>
              <span>{formatDate(draft.checkOut)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm text-ink-600">
            <span>Guests</span>
            <span>{draft.guestCount}</span>
          </div>
          <div className="border-t border-ink-100 pt-3">
            <div className="flex justify-between text-sm text-ink-600">
              <span>
                {formatMoney(listing.basePriceCentavos)} × {unitCount} {unitLabel}
                {unitCount > 1 ? "s" : ""}
              </span>
              <span>{formatMoney(totalCentavos)}</span>
            </div>
            <div className="mt-2 flex justify-between text-base font-semibold text-ink-900">
              <span>Total</span>
              <span>{formatMoney(totalCentavos)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
