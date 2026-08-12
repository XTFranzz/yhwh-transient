import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { formatMoney } from "../../../lib/format";
import { useInquiryDraftStore } from "../../../lib/store";
import { Button } from "../../../components/ui/Button";
import { PageSpinner, ErrorBanner } from "../../../components/ui/Feedback";
import { AvailabilityCalendar } from "../listings/components/AvailabilityCalendar";
import { Icon } from "../../../components/ui/Icon";

interface VehicleDetails {
  vehicleType: "van" | "car" | "motorcycle";
  seats: number;
  transmission: "manual" | "automatic";
  withDriver: boolean;
  pickupLocation: string;
  features: string[];
}

const VEHICLE_ICON: Record<string, string> = { van: "truck", car: "car-front", motorcycle: "scooter" };

export function VehicleDetailPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const listing = useQuery(api.listings.getBySlug, { slug });
  const details = (listing?.details ?? null) as VehicleDetails | null;
  const blockedRanges = useQuery(
    api.availability.getBlockedRanges,
    listing ? { listingId: listing._id } : "skip",
  );
  const setListingSlug = useInquiryDraftStore((s) => s.setListing);
  const setDates = useInquiryDraftStore((s) => s.setDates);
  const setGuestCount = useInquiryDraftStore((s) => s.setGuestCount);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [passengers, setPassengers] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  if (listing === undefined) return <PageSpinner />;
  if (listing === null) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ErrorBanner message="This vehicle is not available." />
      </div>
    );
  }

  const days =
    startDate && endDate && endDate > startDate
      ? Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000)
      : 0;
  const totalCentavos = days * listing.basePriceCentavos;

  function handleReserve() {
    setError(null);
    if (!startDate || !endDate) {
      setError("Please select your pickup and return dates.");
      return;
    }
    if (endDate <= startDate) {
      setError("Return date must be after pickup date.");
      return;
    }
    if (passengers > listing!.maxGuests) {
      setError(`This vehicle seats up to ${listing!.maxGuests} passengers.`);
      return;
    }
    setListingSlug(slug);
    setDates(startDate, endDate);
    setGuestCount(passengers);
    navigate(`/inquire/${slug}`);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-ink-900">{listing.title}</h1>
      {details && <p className="mt-1 text-sm text-ink-500">Pickup: {details.pickupLocation}</p>}

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
          <Icon name={details ? VEHICLE_ICON[details.vehicleType] : "truck"} className="text-5xl text-ink-300" />
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-3">
        <div className="flex flex-col gap-8 lg:col-span-2">
          {details && (
            <div className="flex flex-wrap gap-6 border-b border-ink-100 pb-6 text-sm text-ink-700">
              <span>{details.seats} seats</span>
              <span className="capitalize">{details.transmission}</span>
              <span>{details.withDriver ? "With driver" : "Self-drive"}</span>
            </div>
          )}

          <div>
            <h2 className="mb-2 text-lg font-semibold text-ink-900">About this vehicle</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink-600">{listing.description}</p>
          </div>

          {details && details.features.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-semibold text-ink-900">Features</h2>
              <div className="grid grid-cols-2 gap-3 text-sm text-ink-700">
                {details.features.map((f) => (
                  <span key={f} className="flex items-center gap-2">
                    <Icon name="check-circle" className="text-brand-500" />
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          <AvailabilityCalendar blockedRanges={blockedRanges ?? []} />
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24 flex flex-col gap-4 rounded-2xl border border-ink-100 p-5 shadow-card">
            <p className="text-lg font-semibold text-ink-900">
              {formatMoney(listing.basePriceCentavos)} <span className="text-sm font-normal text-ink-500">/ day</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 rounded-xl border border-ink-200 p-2.5">
                <span className="text-[11px] font-semibold text-ink-500">PICKUP</span>
                <input
                  type="date"
                  min={today}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent text-sm outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 rounded-xl border border-ink-200 p-2.5">
                <span className="text-[11px] font-semibold text-ink-500">RETURN</span>
                <input
                  type="date"
                  min={startDate || today}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent text-sm outline-none"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1 rounded-xl border border-ink-200 p-2.5">
              <span className="text-[11px] font-semibold text-ink-500">PASSENGERS</span>
              <input
                type="number"
                min={1}
                max={listing.maxGuests}
                value={passengers}
                onChange={(e) => setPassengers(Number(e.target.value))}
                className="bg-transparent text-sm outline-none"
              />
            </label>

            {error && <ErrorBanner message={error} />}

            <Button onClick={handleReserve} size="lg" className="w-full">
              Send inquiry
            </Button>
            <p className="text-center text-xs text-ink-400">No payment required — our team will confirm with you.</p>

            {days > 0 && (
              <div className="flex flex-col gap-1 border-t border-ink-100 pt-3 text-sm text-ink-600">
                <div className="flex justify-between">
                  <span>
                    {formatMoney(listing.basePriceCentavos)} × {days} day{days > 1 ? "s" : ""}
                  </span>
                  <span>{formatMoney(totalCentavos)}</span>
                </div>
                <div className="flex justify-between font-semibold text-ink-900">
                  <span>Estimated total</span>
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
