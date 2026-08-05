import { useQuery } from "convex/react";
import { NavLink } from "react-router-dom";
import { api } from "../../../../convex/_generated/api";
import { SearchBar } from "./components/SearchBar";
import { ListingsGrid } from "./components/ListingsGrid";
import { ListingCard } from "./components/ListingCard";
import { Icon } from "../../../components/ui/Icon";

const CATEGORY_TABS = [
  { to: "/", label: "Houses", icon: "house-door", end: true },
  { to: "/vehicles", label: "Van & Car Rental", icon: "truck" },
  { to: "/tours", label: "City Tours", icon: "signpost-2" },
];

export function HomePage() {
  const listings = useQuery(api.listings.list, { type: "house" });

  return (
    <div className="flex flex-col">
      <section className="relative overflow-hidden border-b border-ink-800 bg-ink-900 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-8 text-center">
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-brand-400">
            <Icon name="geo-alt-fill" /> Town Proper
          </span>
          <div>
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">
              Book your Town Proper <em className="font-serif italic text-brand-300">staycation</em> house
            </h1>
            <p className="mt-3 text-base text-ink-300">
              Handpicked transient houses, straight from the owner — no middleman, no fuss.
            </p>
          </div>
          <SearchBar />
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
                `flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
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
        <h2 className="mb-4 text-lg font-semibold text-ink-900">Available houses</h2>
        <ListingsGrid
          listings={listings}
          emptyTitle="No houses available"
          emptyDescription="Check back soon — new houses are added regularly."
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
      </section>
    </div>
  );
}
