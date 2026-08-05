import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { formatMoney } from "../../../lib/format";
import { Button } from "../../../components/ui/Button";
import { StatusBadge } from "../../../components/ui/Badge";
import { PageSpinner, EmptyState } from "../../../components/ui/Feedback";
import { Icon } from "../../../components/ui/Icon";

type ListingType = "house" | "vehicle" | "tour";

const TYPE_TABS: { value: ListingType; label: string; icon: string }[] = [
  { value: "house", label: "Houses", icon: "house-door" },
  { value: "vehicle", label: "Vehicles", icon: "truck" },
  { value: "tour", label: "Tours", icon: "signpost-2" },
];

const PRICE_SUFFIX: Record<ListingType, string> = { house: "/ night", vehicle: "/ day", tour: "/ person" };

export function ListingsListPage() {
  const [type, setType] = useState<ListingType>("house");
  const listings = useQuery(api.listings.listAllForAdmin, { type });
  const setStatus = useMutation(api.listings.setStatus);

  async function toggleStatus(id: Id<"listings">, current: string) {
    await setStatus({ listingId: id, status: current === "active" ? "inactive" : "active" });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink-900">Listings</h1>
        <Link to={`/admin/listings/new?type=${type}`}>
          <Button>+ New {type}</Button>
        </Link>
      </div>

      <div className="flex gap-2">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setType(tab.value)}
            className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium ${
              type === tab.value ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 text-ink-600 hover:bg-ink-50"
            }`}
          >
            <Icon name={tab.icon} /> {tab.label}
          </button>
        ))}
      </div>

      {listings === undefined ? (
        <PageSpinner />
      ) : listings.length === 0 ? (
        <EmptyState title={`No ${type} listings yet`} description={`Create your first ${type} listing to start taking bookings.`} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-ink-100 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-ink-100 bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-3">Listing</th>
                <th className="px-4 py-3">Price {PRICE_SUFFIX[type]}</th>
                <th className="px-4 py-3">Max guests</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {listings.map((listing) => (
                <tr key={listing._id}>
                  <td className="flex items-center gap-3 px-4 py-3">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-ink-100">
                      {listing.coverPhotoUrl ? (
                        <img src={listing.coverPhotoUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-lg text-ink-400">
                          <Icon name={TYPE_TABS.find((t) => t.value === type)?.icon ?? "house-door"} />
                        </span>
                      )}
                    </div>
                    <span className="font-medium text-ink-900">{listing.title}</span>
                  </td>
                  <td className="px-4 py-3">{formatMoney(listing.basePriceCentavos)}</td>
                  <td className="px-4 py-3">{listing.maxGuests}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={listing.status} label={listing.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => void toggleStatus(listing._id, listing.status)}
                        className="text-xs font-medium text-ink-500 hover:text-ink-800"
                      >
                        {listing.status === "active" ? "Deactivate" : "Activate"}
                      </button>
                      <Link to={`/admin/listings/${listing._id}/edit`} className="text-xs font-medium text-brand-600 hover:text-brand-700">
                        Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
