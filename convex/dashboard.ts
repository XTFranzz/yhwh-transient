import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireRole } from "./lib/auth";
import { daysBetween, nightsBetween, todayDateString } from "./lib/dateRanges";

export const summary = query({
  args: { from: v.optional(v.string()), to: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["owner_admin", "front_desk", "housekeeping"]);

    const today = todayDateString();
    const from = args.from ?? `${today.slice(0, 8)}01`; // first of current month
    const to = args.to ?? today;

    const allBookings = await ctx.db.query("bookings").collect();
    const activeListings = await ctx.db
      .query("listings")
      .withIndex("by_type_status", (q) => q.eq("type", "house").eq("status", "active"))
      .collect();

    const liveBookings = allBookings.filter((b) => b.status !== "cancelled" && b.status !== "no_show");
    const inRange = liveBookings.filter((b) => b.startDate <= to && b.endDate > from);

    let revenueCentavos = 0;
    let bookedNights = 0;
    for (const booking of inRange) {
      const payments = await ctx.db
        .query("payments")
        .withIndex("by_bookingId", (q) => q.eq("bookingId", booking._id))
        .collect();
      if (payments.some((p) => p.status === "verified")) revenueCentavos += booking.totalCentavos;
      bookedNights += nightsBetween(booking.startDate, booking.endDate);
    }

    const rangeNights = Math.max(1, daysBetween(from, to) + 1);
    const occupancyRate =
      activeListings.length > 0 ? bookedNights / (activeListings.length * rangeNights) : 0;

    return {
      from,
      to,
      revenueCentavos,
      occupancyRate,
      totalBookings: allBookings.length,
      pendingBookings: allBookings.filter((b) => b.status === "pending_payment").length,
      todayCheckIns: allBookings.filter(
        (b) => b.startDate === today && (b.status === "confirmed" || b.status === "checked_in"),
      ).length,
      todayCheckOuts: allBookings.filter((b) => b.endDate === today && b.status === "checked_in").length,
    };
  },
});
