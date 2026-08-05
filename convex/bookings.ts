import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireRole } from "./lib/auth";
import { generateUniqueReferenceNumber } from "./lib/referenceNumber";
import { isValidDateString, nightsBetween, todayDateString } from "./lib/dateRanges";
import { isListingAvailable } from "./lib/availabilityHelpers";

const bookingStatuses = [
  "pending_payment",
  "confirmed",
  "checked_in",
  "checked_out",
  "cancelled",
  "no_show",
] as const;

// Legal forward transitions per current status. Cancellation/no-show are only
// reachable from states that haven't already reached a terminal outcome.
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending_payment: ["confirmed", "cancelled"],
  confirmed: ["checked_in", "cancelled", "no_show"],
  checked_in: ["checked_out"],
  checked_out: [],
  cancelled: [],
  no_show: [],
};

export const create = mutation({
  args: {
    listingId: v.id("listings"),
    startDate: v.string(),
    endDate: v.string(),
    guestCount: v.number(),
    guest: v.object({ fullName: v.string(), email: v.string(), phone: v.string() }),
    guestNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!isValidDateString(args.startDate) || !isValidDateString(args.endDate)) {
      throw new Error("Dates must be in YYYY-MM-DD format");
    }
    if (args.startDate >= args.endDate) throw new Error("endDate must be after startDate");
    if (args.startDate < todayDateString()) throw new Error("Check-in date is in the past");

    const listing = await ctx.db.get(args.listingId);
    if (!listing || listing.status !== "active") throw new Error("Listing is not bookable");
    if (args.guestCount < 1 || args.guestCount > listing.maxGuests) {
      throw new Error(`This listing accommodates up to ${listing.maxGuests} guests`);
    }

    if (listing.type === "tour") {
      if (nightsBetween(args.startDate, args.endDate) !== 1) throw new Error("Tours are booked for a single day");
      const tourDetails = await ctx.db
        .query("tourDetails")
        .withIndex("by_listingId", (q) => q.eq("listingId", args.listingId))
        .unique();
      if (tourDetails && args.guestCount < tourDetails.minPax) {
        throw new Error(`This tour requires at least ${tourDetails.minPax} guests`);
      }
    }

    // Reads + writes below execute as one serializable Convex transaction, so
    // this check-then-insert is race-safe without a DB-level exclusion constraint.
    const available = await isListingAvailable(ctx, args.listingId, args.startDate, args.endDate);
    if (!available) throw new Error("Selected dates are no longer available");

    let guest = await ctx.db
      .query("guests")
      .withIndex("by_email_phone", (q) => q.eq("email", args.guest.email).eq("phone", args.guest.phone))
      .unique();
    const guestId = guest
      ? (await ctx.db.patch(guest._id, { fullName: args.guest.fullName }), guest._id)
      : await ctx.db.insert("guests", args.guest);

    const referenceNumber = await generateUniqueReferenceNumber(ctx);
    // Houses/vehicles are priced per night/day of the stay; tours are priced per head for a single day.
    const totalCentavos =
      listing.type === "tour"
        ? listing.basePriceCentavos * args.guestCount
        : listing.basePriceCentavos * nightsBetween(args.startDate, args.endDate);
    const bookingId = await ctx.db.insert("bookings", {
      referenceNumber,
      listingId: args.listingId,
      guestId,
      startDate: args.startDate,
      endDate: args.endDate,
      guestCount: args.guestCount,
      totalCentavos,
      status: "pending_payment",
      guestNotes: args.guestNotes,
    });
    await ctx.db.insert("availabilityBlocks", {
      listingId: args.listingId,
      startDate: args.startDate,
      endDate: args.endDate,
      reason: "booking",
      bookingId,
    });

    return { bookingId, referenceNumber, totalCentavos };
  },
});

export const lookupByReferenceAndEmail = query({
  args: { referenceNumber: v.string(), email: v.string() },
  handler: async (ctx, args) => {
    const booking = await ctx.db
      .query("bookings")
      .withIndex("by_referenceNumber", (q) => q.eq("referenceNumber", args.referenceNumber.trim().toUpperCase()))
      .unique();
    if (!booking) return null;

    const guest = await ctx.db.get(booking.guestId);
    if (!guest || guest.email.toLowerCase() !== args.email.trim().toLowerCase()) return null;

    const listing = await ctx.db.get(booking.listingId);
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_bookingId", (q) => q.eq("bookingId", booking._id))
      .collect();

    return { booking, guest, listing, payments };
  },
});

export const listForAdmin = query({
  args: {
    status: v.optional(v.union(...bookingStatuses.map((s) => v.literal(s)))),
    listingId: v.optional(v.id("listings")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["owner_admin", "front_desk", "housekeeping"]);

    let bookings;
    if (args.listingId) {
      const listingId = args.listingId;
      bookings = args.status
        ? await ctx.db
            .query("bookings")
            .withIndex("by_listingId_status", (q) => q.eq("listingId", listingId).eq("status", args.status!))
            .collect()
        : await ctx.db
            .query("bookings")
            .withIndex("by_listingId_status", (q) => q.eq("listingId", listingId))
            .collect();
    } else if (args.status) {
      bookings = await ctx.db
        .query("bookings")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    } else {
      bookings = await ctx.db.query("bookings").order("desc").collect();
    }

    return Promise.all(
      bookings.map(async (booking) => ({
        ...booking,
        guest: await ctx.db.get(booking.guestId),
        listing: await ctx.db.get(booking.listingId),
      })),
    );
  },
});

export const getDetail = query({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["owner_admin", "front_desk", "housekeeping"]);
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) return null;
    const guest = await ctx.db.get(booking.guestId);
    const listing = await ctx.db.get(booking.listingId);
    const payments = await Promise.all(
      (
        await ctx.db
          .query("payments")
          .withIndex("by_bookingId", (q) => q.eq("bookingId", booking._id))
          .collect()
      ).map(async (p) => ({ ...p, receiptUrl: await ctx.storage.getUrl(p.receiptStorageId) })),
    );
    return { booking, guest, listing, payments };
  },
});

export const updateStatus = mutation({
  args: { bookingId: v.id("bookings"), newStatus: v.union(...bookingStatuses.map((s) => v.literal(s))) },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["owner_admin", "front_desk"]);
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");

    const allowed = ALLOWED_TRANSITIONS[booking.status] ?? [];
    if (!allowed.includes(args.newStatus)) {
      throw new Error(`Cannot move a booking from "${booking.status}" to "${args.newStatus}"`);
    }

    await ctx.db.patch(args.bookingId, { status: args.newStatus });

    if (args.newStatus === "cancelled" || args.newStatus === "no_show") {
      const block = await ctx.db
        .query("availabilityBlocks")
        .withIndex("by_bookingId", (q) => q.eq("bookingId", args.bookingId))
        .unique();
      if (block) await ctx.db.delete(block._id);
    }

    if (args.newStatus === "checked_out") {
      const existing = await ctx.db
        .query("housekeepingStatuses")
        .withIndex("by_listingId", (q) => q.eq("listingId", booking.listingId))
        .unique();
      const patch = { status: "dirty" as const, bookingId: args.bookingId, updatedAt: Date.now() };
      if (existing) await ctx.db.patch(existing._id, patch);
      else await ctx.db.insert("housekeepingStatuses", { listingId: booking.listingId, ...patch });
    }
  },
});
