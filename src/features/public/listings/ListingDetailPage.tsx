import { useState } from "react";
import { ListingMedia, MobileBookBar } from "./components/ListingMedia";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { formatMoney } from "../../../lib/format";
import { useInquiryDraftStore } from "../../../lib/store";
import { HOUSE_AMENITIES, amenityDisplay } from "../../../lib/amenities";
import { Button } from "../../../components/ui/Button";
import { PageSpinner, ErrorBanner } from "../../../components/ui/Feedback";
import { AvailabilityCalendar } from "./components/AvailabilityCalendar";
import { Icon } from "../../../components/ui/Icon";

interface HouseDetails {
  bedrooms: number;
  bathrooms: number;
  address: string;
  amenities: string[];
  houseRules?: string;
  checkInTime: string;
  checkOutTime: string;
}

export function ListingDetailPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const listing = useQuery(api.listings.getBySlug, { slug });
  const houseDetails = (listing?.details ?? null) as HouseDetails | null;
  const blockedRanges = useQuery(
    api.availability.getBlockedRanges,
    listing ? { listingId: listing._id } : "skip",
  );
  const setListing = useInquiryDraftStore((s) => s.setListing);
  const setDates = useInquiryDraftStore((s) => s.setDates);
  const setGuestCount = useInquiryDraftStore((s) => s.setGuestCount);

  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  if (listing === undefined) return <PageSpinner />;
  if (listing === null) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ErrorBanner message="This listing is not available." />
      </div>
    );
  }

  const nights =
    checkIn && checkOut && checkOut > checkIn
      ? Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
      : 0;
  const totalCentavos = nights * listing.basePriceCentavos;

  function handleReserve() {
    setError(null);
    if (!checkIn || !checkOut) {
      setError("Please select your check-in and check-out dates.");
      return;
    }
    if (checkOut <= checkIn) {
      setError("Check-out date must be after check-in date.");
      return;
    }
    if (guests > listing!.maxGuests) {
      setError(`This listing accommodates up to ${listing!.maxGuests} guests.`);
      return;
    }
    setListing(slug);
    setDates(checkIn, checkOut);
    setGuestCount(guests);
    navigate(`/inquire/${slug}`);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-8 sm:px-6 md:pb-8 lg:px-8">
      <ListingMedia
        title={listing.title}
        subtitle={houseDetails?.address}
        photos={listing.photos}
        placeholderIcon={"house-door"}
      />

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-3">
        <div className="flex flex-col gap-8 lg:col-span-2">
          {houseDetails && (
            <div className="flex gap-6 border-b border-ink-100 pb-6 text-sm text-ink-700">
              <span>{houseDetails.bedrooms} bedrooms</span>
              <span>{houseDetails.bathrooms} bathrooms</span>
              <span>Up to {listing.maxGuests} guests</span>
            </div>
          )}

          <div>
            <h2 className="mb-2 text-lg font-semibold text-ink-900">About this house</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink-600">{listing.description}</p>
          </div>

          {houseDetails && houseDetails.amenities.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-semibold text-ink-900">Amenities</h2>
              <div className="grid grid-cols-2 gap-3 text-sm text-ink-700">
                {houseDetails.amenities.map((a) => {
                  const { icon, label } = amenityDisplay(a, HOUSE_AMENITIES);
                  return (
                    <span key={a} className="flex items-center gap-2">
                      <Icon name={icon} className="text-brand-500" />
                      {label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {houseDetails && (
            <div className="grid grid-cols-2 gap-4 text-sm text-ink-700">
              <div>
                <p className="font-medium text-ink-900">Check-in</p>
                <p>{houseDetails.checkInTime}</p>
              </div>
              <div>
                <p className="font-medium text-ink-900">Check-out</p>
                <p>{houseDetails.checkOutTime}</p>
              </div>
            </div>
          )}

          <AvailabilityCalendar blockedRanges={blockedRanges ?? []} />
        </div>

        <div className="lg:col-span-1">
          <div id="book" className="sticky top-24 flex scroll-mt-24 flex-col gap-4 rounded-2xl border border-ink-100 p-5 shadow-card">
            <p className="text-lg font-semibold text-ink-900">
              {formatMoney(listing.basePriceCentavos)} <span className="text-sm font-normal text-ink-500">/ night</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 rounded-xl border border-ink-200 p-2.5">
                <span className="text-[11px] font-semibold text-ink-500">CHECK-IN</span>
                <input
                  type="date"
                  min={today}
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="bg-transparent text-sm outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 rounded-xl border border-ink-200 p-2.5">
                <span className="text-[11px] font-semibold text-ink-500">CHECK-OUT</span>
                <input
                  type="date"
                  min={checkIn || today}
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="bg-transparent text-sm outline-none"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1 rounded-xl border border-ink-200 p-2.5">
              <span className="text-[11px] font-semibold text-ink-500">GUESTS</span>
              <input
                type="number"
                min={1}
                max={listing.maxGuests}
                value={guests}
                onChange={(e) => setGuests(Number(e.target.value))}
                className="bg-transparent text-sm outline-none"
              />
            </label>

            {error && <ErrorBanner message={error} />}

            <Button onClick={handleReserve} size="lg" className="w-full">
              Send inquiry
            </Button>
            <p className="text-center text-xs text-ink-400">No payment required — our team will confirm with you.</p>

            {nights > 0 && (
              <div className="flex flex-col gap-1 border-t border-ink-100 pt-3 text-sm text-ink-600">
                <div className="flex justify-between">
                  <span>
                    {formatMoney(listing.basePriceCentavos)} × {nights} night{nights > 1 ? "s" : ""}
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
      <MobileBookBar basePriceCentavos={listing.basePriceCentavos} priceSuffix="/ night" />
    </div>
  );
}
