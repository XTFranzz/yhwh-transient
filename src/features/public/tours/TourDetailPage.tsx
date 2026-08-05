import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { formatMoney } from "../../../lib/format";
import { useBookingDraftStore } from "../../../lib/store";
import { Button } from "../../../components/ui/Button";
import { PageSpinner, ErrorBanner } from "../../../components/ui/Feedback";
import { AvailabilityCalendar } from "../listings/components/AvailabilityCalendar";
import { Icon } from "../../../components/ui/Icon";

interface TourDetails {
  durationHours: number;
  minPax: number;
  meetingPoint: string;
  itinerary?: string;
}

function addOneDay(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function TourDetailPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const listing = useQuery(api.listings.getBySlug, { slug });
  const details = (listing?.details ?? null) as TourDetails | null;
  const blockedRanges = useQuery(
    api.availability.getBlockedRanges,
    listing ? { listingId: listing._id } : "skip",
  );
  const setListingSlug = useBookingDraftStore((s) => s.setListing);
  const setDates = useBookingDraftStore((s) => s.setDates);
  const setGuestCount = useBookingDraftStore((s) => s.setGuestCount);

  const [tourDate, setTourDate] = useState("");
  const [pax, setPax] = useState(details?.minPax ?? 1);
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  if (listing === undefined) return <PageSpinner />;
  if (listing === null) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ErrorBanner message="This tour is not available." />
      </div>
    );
  }

  const totalCentavos = pax * listing.basePriceCentavos;

  function handleReserve() {
    setError(null);
    if (!tourDate) {
      setError("Please select your tour date.");
      return;
    }
    if (details && pax < details.minPax) {
      setError(`This tour requires at least ${details.minPax} guests.`);
      return;
    }
    if (pax > listing!.maxGuests) {
      setError(`This tour accommodates up to ${listing!.maxGuests} guests.`);
      return;
    }
    setListingSlug(slug);
    setDates(tourDate, addOneDay(tourDate));
    setGuestCount(pax);
    navigate(`/book/${slug}/review`);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-ink-900">{listing.title}</h1>
      {details && <p className="mt-1 text-sm text-ink-500">Meeting point: {details.meetingPoint}</p>}

      {listing.photos.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-2 overflow-hidden rounded-2xl sm:grid-cols-4 sm:grid-rows-2">
          {listing.photos.slice(0, 5).map((photo, i) => (
            <img
              key={photo.id}
              src={photo.url ?? undefined}
              alt={listing.title}
              className={`h-48 w-full object-cover sm:h-64 ${i === 0 ? "sm:col-span-2 sm:row-span-2 sm:h-full" : ""}`}
            />
          ))}
        </div>
      ) : (
        <div className="mt-4 flex h-64 w-full items-center justify-center rounded-2xl bg-ink-100">
          <Icon name="signpost-2" className="text-5xl text-ink-300" />
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-3">
        <div className="flex flex-col gap-8 lg:col-span-2">
          {details && (
            <div className="flex flex-wrap gap-6 border-b border-ink-100 pb-6 text-sm text-ink-700">
              <span>{details.durationHours} hours</span>
              <span>Min {details.minPax} pax</span>
              <span>Up to {listing.maxGuests} guests</span>
            </div>
          )}

          <div>
            <h2 className="mb-2 text-lg font-semibold text-ink-900">About this tour</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink-600">{listing.description}</p>
          </div>

          {details?.itinerary && (
            <div>
              <h2 className="mb-2 text-lg font-semibold text-ink-900">Itinerary</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink-600">{details.itinerary}</p>
            </div>
          )}

          <AvailabilityCalendar blockedRanges={blockedRanges ?? []} />
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24 flex flex-col gap-4 rounded-2xl border border-ink-100 p-5 shadow-card">
            <p className="text-lg font-semibold text-ink-900">
              {formatMoney(listing.basePriceCentavos)} <span className="text-sm font-normal text-ink-500">/ person</span>
            </p>
            <label className="flex flex-col gap-1 rounded-xl border border-ink-200 p-2.5">
              <span className="text-[11px] font-semibold text-ink-500">TOUR DATE</span>
              <input
                type="date"
                min={today}
                value={tourDate}
                onChange={(e) => setTourDate(e.target.value)}
                className="bg-transparent text-sm outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 rounded-xl border border-ink-200 p-2.5">
              <span className="text-[11px] font-semibold text-ink-500">GUESTS</span>
              <input
                type="number"
                min={details?.minPax ?? 1}
                max={listing.maxGuests}
                value={pax}
                onChange={(e) => setPax(Number(e.target.value))}
                className="bg-transparent text-sm outline-none"
              />
            </label>

            {error && <ErrorBanner message={error} />}

            <Button onClick={handleReserve} size="lg" className="w-full">
              Reserve
            </Button>

            {pax > 0 && (
              <div className="flex flex-col gap-1 border-t border-ink-100 pt-3 text-sm text-ink-600">
                <div className="flex justify-between">
                  <span>
                    {formatMoney(listing.basePriceCentavos)} × {pax} guest{pax > 1 ? "s" : ""}
                  </span>
                  <span>{formatMoney(totalCentavos)}</span>
                </div>
                <div className="flex justify-between font-semibold text-ink-900">
                  <span>Total</span>
                  <span>{formatMoney(totalCentavos)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
