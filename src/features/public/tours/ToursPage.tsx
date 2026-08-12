import { useQuery } from "convex/react";
import { NavLink } from "react-router-dom";
import { api } from "../../../../convex/_generated/api";
import { ListingsGrid } from "../listings/components/ListingsGrid";
import { ListingCard } from "../listings/components/ListingCard";
import { Icon } from "../../../components/ui/Icon";

const CATEGORY_TABS = [
  { to: "/", label: "Houses", icon: "house-door" },
  { to: "/vehicles", label: "Van & Car Rental", icon: "truck" },
  { to: "/tours", label: "City Tours", icon: "signpost-2", end: true },
];

export function ToursPage() {
  const listings = useQuery(api.listings.list, { type: "tour" });

  return (
    <div className="flex flex-col">
      <section className="border-b border-ink-100 bg-gradient-to-b from-ink-100 to-white px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-3xl font-semibold text-ink-900 sm:text-4xl">City Tours</h1>
          <p className="mt-3 text-base text-ink-500">Guided day tours around the city, priced per person.</p>
        </div>
      </section>

      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex gap-3 overflow-x-auto pb-2">
          {CATEGORY_TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  isActive ? "border-ink-900 bg-ink-900 text-white" : "border-ink-100 text-ink-600 hover:border-ink-300"
                }`
              }
            >
              <Icon name={tab.icon} /> {tab.label}
            </NavLink>
          ))}
        </div>
      </div>

      <section className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <ListingsGrid
          listings={listings}
          emptyTitle="No tours available yet"
          emptyDescription="Check back soon for guided city tours."
          renderCard={(listing) => (
            <ListingCard
              to={`/tours/${listing.slug}`}
              title={listing.title}
              coverPhotoUrl={listing.coverPhotoUrl}
              basePriceCentavos={listing.basePriceCentavos}
              priceSuffix="/ person"
              placeholderIcon="signpost-2"
              subtitle={
                listing.details
                  ? `${listing.details.durationHours}h · min ${listing.details.minPax} pax · up to ${listing.maxGuests}`
                  : undefined
              }
            />
          )}
        />
      </section>
    </div>
  );
}
