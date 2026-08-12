import { v } from "convex/values";
import { query, mutation, type QueryCtx, type MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireRole, ANY_STAFF } from "./lib/auth";
import { findOrCreateCustomer } from "./lib/customers";
import { getBookingBalance } from "./payments";

const NON_REVENUE_STATUSES = new Set(["cancelled", "no_show"]);

async function bookingStatsFor(ctx: QueryCtx | MutationCtx, customerId: Id<"customers">) {
  const bookings = await ctx.db
    .query("bookings")
    .withIndex("by_customerId", (q) => q.eq("customerId", customerId))
    .collect();
  const lifetimeCentavos = bookings
    .filter((b) => !NON_REVENUE_STATUSES.has(b.status))
    .reduce((sum, b) => sum + b.totalCentavos, 0);
  const lastStayBooking = bookings.reduce<Doc<"bookings"> | null>(
    (latest, b) => (!latest || b.startDate > latest.startDate ? b : latest),
    null,
  );
  return { bookings, bookingCount: bookings.length, lifetimeCentavos, lastStayBooking };
}

// Case-insensitive substring match on name/email/phone. A full scan is the
// right call here — single-property business, low customer counts, and
// Convex has no native partial-match index to build one against instead.
export const search = query({
  args: { term: v.string() },
  handler: async (ctx, args) => {
    await requireRole(ctx, ANY_STAFF);
    const term = args.term.trim().toLowerCase();
    if (term.length < 2) return [];

    const customers = await ctx.db.query("customers").collect();
    const matches = customers
      .filter(
        (c) =>
          c.fullName.toLowerCase().includes(term) ||
          c.email.toLowerCase().includes(term) ||
          c.phone.toLowerCase().includes(term),
      )
      .slice(0, 20);

    return Promise.all(
      matches.map(async (c) => {
        const { bookingCount, lastStayBooking } = await bookingStatsFor(ctx, c._id);
        let lastStay = null;
        if (lastStayBooking) {
          const listing = await ctx.db.get(lastStayBooking.listingId);
          lastStay = {
            listingTitle: listing?.title ?? "—",
            startDate: lastStayBooking.startDate,
            status: lastStayBooking.status,
          };
        }
        return { _id: c._id, fullName: c.fullName, email: c.email, phone: c.phone, bookingCount, lastStay };
      }),
    );
  },
});

// The explicit "+ New customer" affordance (Customers tab and the inline
// picker on the reservation form both call this). Customers are deduped by
// (email, phone), never by name — two different people can share a name.
export const create = mutation({
  args: { fullName: v.string(), email: v.string(), phone: v.string() },
  handler: async (ctx, args) => {
    await requireRole(ctx, ANY_STAFF);
    return findOrCreateCustomer(ctx, args);
  },
});

export const get = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ANY_STAFF);
    const customer = await ctx.db.get(args.customerId);
    if (!customer) return null;

    const { bookings, bookingCount, lifetimeCentavos } = await bookingStatsFor(ctx, args.customerId);
    const bookingHistory = await Promise.all(
      [...bookings]
        .sort((a, b) => (a.startDate < b.startDate ? 1 : -1))
        .map(async (booking) => {
          const listing = await ctx.db.get(booking.listingId);
          const { balanceCentavos } = await getBookingBalance(ctx, booking._id, booking.totalCentavos);
          return { ...booking, listing, balanceCentavos };
        }),
    );

    return { customer, bookingHistory, bookingCount, lifetimeCentavos };
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ANY_STAFF);
    const customers = await ctx.db.query("customers").collect();
    return Promise.all(
      customers.map(async (c) => {
        const { bookingCount, lifetimeCentavos } = await bookingStatsFor(ctx, c._id);
        return { ...c, bookingCount, lifetimeCentavos };
      }),
    );
  },
});
