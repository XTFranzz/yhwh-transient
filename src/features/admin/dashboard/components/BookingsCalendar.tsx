import { Fragment, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { api } from "../../../../../convex/_generated/api";
import { Icon } from "../../../../components/ui/Icon";
import { formatStatus } from "../../../../lib/format";

type ListingType = "house" | "vehicle" | "tour";

const TYPE_META: Record<ListingType, { label: string; icon: string }> = {
  house: { label: "Houses", icon: "house-door" },
  vehicle: { label: "Vehicles", icon: "truck" },
  tour: { label: "Tours", icon: "signpost-2" },
};
const TYPE_ORDER: ListingType[] = ["house", "vehicle", "tour"];

const STATUS_COLOR: Record<string, string> = {
  pending_payment: "bg-amber-400",
  confirmed: "bg-sky-500",
  checked_in: "bg-teal-500",
  checked_out: "bg-ink-300",
};
const LEGEND_STATUSES = ["pending_payment", "confirmed", "checked_in", "checked_out"];

interface CalendarBooking {
  _id: string;
  listingId: string;
  startDate: string;
  endDate: string;
  status: string;
  referenceNumber: string;
  customer?: { fullName: string } | null;
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function buildMonthDays(year: number, month: number): Date[] {
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Array.from({ length: daysInMonth }, (_, i) => new Date(Date.UTC(year, month, i + 1)));
}

// A per-listing occupancy grid for the whole month, so staff can see at a
// glance which dates are already taken — and, since each cell lists every
// live booking that overlaps it, any listing that was somehow double-booked
// shows up immediately as a red cell instead of a confusing "dates no longer
// available" error the next time someone tries to book it.
export function BookingsCalendar({ bookings }: { bookings: CalendarBooking[] }) {
  const houseListings = useQuery(api.listings.list, { type: "house" });
  const vehicleListings = useQuery(api.listings.list, { type: "vehicle" });
  const tourListings = useQuery(api.listings.list, { type: "tour" });
  const listingsByType: Record<ListingType, { _id: string; title: string }[] | undefined> = {
    house: houseListings,
    vehicle: vehicleListings,
    tour: tourListings,
  };

  const [monthOffset, setMonthOffset] = useState(0);
  const monthDate = useMemo(() => {
    const base = new Date();
    return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + monthOffset, 1));
  }, [monthOffset]);
  const days = useMemo(() => buildMonthDays(monthDate.getUTCFullYear(), monthDate.getUTCMonth()), [monthDate]);
  const today = toDateString(new Date());

  const liveBookings = bookings.filter((b) => b.status !== "cancelled" && b.status !== "no_show");

  function bookingsOn(listingId: string, dateString: string) {
    return liveBookings.filter((b) => b.listingId === listingId && dateString >= b.startDate && dateString < b.endDate);
  }

  const loading = houseListings === undefined || vehicleListings === undefined || tourListings === undefined;

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink-800">Bookings calendar</p>
          <p className="text-xs text-ink-500">See which dates are already taken per listing before creating a reservation.</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMonthOffset((m) => m - 1)}
            className="rounded-full p-1.5 text-ink-500 hover:bg-ink-100"
            aria-label="Previous month"
          >
            <Icon name="chevron-left" />
          </button>
          <span className="min-w-32 text-center text-sm font-medium text-ink-800">
            {monthDate.toLocaleDateString("en-PH", { month: "long", year: "numeric" })}
          </span>
          <button
            type="button"
            onClick={() => setMonthOffset((m) => m + 1)}
            className="rounded-full p-1.5 text-ink-500 hover:bg-ink-100"
            aria-label="Next month"
          >
            <Icon name="chevron-right" />
          </button>
          {monthOffset !== 0 && (
            <button
              type="button"
              onClick={() => setMonthOffset(0)}
              className="ml-1 rounded-lg px-2 py-1 text-xs font-medium text-ink-500 hover:bg-ink-100"
            >
              Today
            </button>
          )}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-ink-500">
        {LEGEND_STATUSES.map((status) => (
          <span key={status} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${STATUS_COLOR[status]}`} /> {formatStatus(status)}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Double-booked
        </span>
      </div>

      {loading ? (
        <p className="py-6 text-center text-sm text-ink-400">Loading calendar…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-white px-2 py-1 text-left font-medium text-ink-500">Listing</th>
                {days.map((d) => {
                  const dStr = toDateString(d);
                  return (
                    <th
                      key={dStr}
                      className={`w-6 px-0 py-1 text-center font-normal ${dStr === today ? "text-brand-600" : "text-ink-400"}`}
                    >
                      {d.getUTCDate()}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {TYPE_ORDER.map((type) => {
                const typeListings = listingsByType[type] ?? [];
                if (typeListings.length === 0) return null;
                return (
                  <Fragment key={type}>
                    <tr>
                      <td colSpan={days.length + 1} className="bg-ink-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                        <Icon name={TYPE_META[type].icon} className="mr-1.5" />
                        {TYPE_META[type].label}
                      </td>
                    </tr>
                    {typeListings.map((listing) => (
                      <tr key={listing._id} className="border-t border-ink-50">
                        <td className="sticky left-0 z-10 max-w-36 truncate bg-white px-2 py-1 text-ink-700" title={listing.title}>
                          {listing.title}
                        </td>
                        {days.map((d) => {
                          const dStr = toDateString(d);
                          const cellBookings = bookingsOn(listing._id, dStr);
                          const overlap = cellBookings.length > 1;
                          const booking = cellBookings[0];
                          const cellTitle = cellBookings
                            .map((b) => `${b.referenceNumber} — ${b.customer?.fullName ?? "Unknown"} (${formatStatus(b.status)})`)
                            .join("\n");
                          return (
                            <td key={dStr} className="px-0 py-1 text-center">
                              {cellBookings.length === 0 ? (
                                <span className="mx-auto block h-4 w-4 rounded bg-transparent" />
                              ) : (
                                <Link
                                  to={booking ? `/admin/reservations/${booking._id}` : "#"}
                                  title={cellTitle}
                                  className={`mx-auto block h-4 w-4 rounded ${overlap ? "bg-red-500" : STATUS_COLOR[booking.status] ?? "bg-ink-300"}`}
                                />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
