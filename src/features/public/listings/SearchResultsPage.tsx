import { useSearchParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { SearchBar } from "./components/SearchBar";
import { ListingsGrid } from "./components/ListingsGrid";
import { ListingCard } from "./components/ListingCard";

export function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const checkIn = searchParams.get("checkIn") ?? undefined;
  const checkOut = searchParams.get("checkOut") ?? undefined;
  const guestsParam = searchParams.get("guests");
  const guests = guestsParam ? Number(guestsParam) : undefined;

  const listings = useQuery(api.listings.list, {
    type: "house",
    checkIn: checkIn && checkOut ? checkIn : undefined,
    checkOut: checkIn && checkOut ? checkOut : undefined,
    guests,
  });

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <SearchBar initialCheckIn={checkIn} initialCheckOut={checkOut} initialGuests={guests} />
      </div>
      <h1 className="mb-4 text-lg font-semibold text-ink-900">
        {listings === undefined ? "Searching…" : `${listings.length} house${listings.length === 1 ? "" : "s"} available`}
      </h1>
      <ListingsGrid
        listings={listings}
        emptyTitle="No houses available for those dates"
        emptyDescription="Try adjusting your dates or guest count, or browse all our houses."
        renderCard={(listing) => (
          <ListingCard
            to={`/listings/${listing.slug}`}
            title={listing.title}
            coverPhotoUrl={listing.coverPhotoUrl}
            basePriceCentavos={listing.basePriceCentavos}
            priceSuffix="/ night"
            placeholderIcon="house-door"
            subtitle={
              listing.details
                ? `${listing.details.bedrooms} bed · ${listing.details.bathrooms} bath · up to ${listing.maxGuests} guests`
                : undefined
            }
          />
        )}
      />
    </div>
  );
}
