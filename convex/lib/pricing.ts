import type { Doc } from "../_generated/dataModel";
import { nightsBetween } from "./dateRanges";

// Houses/vehicles are priced per night/day of the stay; tours are priced per
// head for a single day. Shared by booking creation and invoice generation so
// both always price a stay the same way.
export function computeLineItem(listing: Doc<"listings">, startDate: string, endDate: string, guestCount: number) {
  if (listing.type === "tour") {
    return {
      quantity: guestCount,
      unitLabel: "guest",
      rateCentavos: listing.basePriceCentavos,
      totalCentavos: listing.basePriceCentavos * guestCount,
    };
  }
  const nights = nightsBetween(startDate, endDate);
  return {
    quantity: nights,
    unitLabel: listing.type === "vehicle" ? "day" : "night",
    rateCentavos: listing.basePriceCentavos,
    totalCentavos: listing.basePriceCentavos * nights,
  };
}
