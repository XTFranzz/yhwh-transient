import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { requireRole, ANY_STAFF } from "./lib/auth";
import { generateUniqueReferenceNumber } from "./lib/referenceNumber";
import { isValidDateString, nightsBetween, todayDateString } from "./lib/dateRanges";
import { isListingAvailable } from "./lib/availabilityHelpers";
import { findOrCreateCustomer, type CustomerInput } from "./lib/customers";
import { getBookingBalance } from "./payments";

const bookingStatuses = [
  "pending_payment",
  "confirmed",
  "checked_in",
  "checked_out",
  "cancelled",
  "no_show",
] as const;

export const paymentMethods = ["gcash", "bank_transfer", "cash"] as const;
export const initialPaymentValidator = v.object({
  amountCentavos: v.number(),
  method: v.union(...paymentMethods.map((m) => v.literal(m))),
});
type InitialPayment = { amountCentavos: number; method: (typeof paymentMethods)[number] };

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

export interface CreateBookingArgs {
  listingId: Id<"listings">;
  startDate: string;
  endDate: string;
  guestCount: number;
  customer: CustomerInput;
  customerNotes?: string;
}

// All bookings are staff-entered now (direct manual entry or converting an
// inquiry) — this is the one place availability/pricing rules live, shared
// by bookings.createByStaff and inquiries.convertToBooking.
export async function createBookingCore(ctx: MutationCtx, args: CreateBookingArgs) {
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

  const { customerId } = await findOrCreateCustomer(ctx, args.customer);

  const referenceNumber = await generateUniqueReferenceNumber(ctx);
  // Houses/vehicles are priced per night/day of the stay; tours are priced per head for a single day.
  const totalCentavos =
    listing.type === "tour"
      ? listing.basePriceCentavos * args.guestCount
      : listing.basePriceCentavos * nightsBetween(args.startDate, args.endDate);
  const bookingId = await ctx.db.insert("bookings", {
    referenceNumber,
    listingId: args.listingId,
    customerId,
    startDate: args.startDate,
    endDate: args.endDate,
    guestCount: args.guestCount,
    totalCentavos,
    status: "pending_payment",
    customerNotes: args.customerNotes,
    source: "admin_manual",
  });
  await ctx.db.insert("availabilityBlocks", {
    listingId: args.listingId,
    startDate: args.startDate,
    endDate: args.endDate,
    reason: "booking",
    bookingId,
  });

  return { bookingId, referenceNumber, totalCentavos };
}

// Records payment collected up front — shared by createByStaff and
// inquiries.convertToBooking. Only confirms the booking once its balance
// reaches zero; a partial amount leaves it in pending_payment. Same
// over/under-payment rules as payments.recordByStaff (see there for why cash
// is allowed to overshoot but gcash/bank_transfer isn't).
export async function applyInitialPayment(
  ctx: MutationCtx,
  bookingId: Id<"bookings">,
  totalCentavos: number,
  payment: InitialPayment,
  userId: Id<"users">,
) {
  const { balanceCentavos } = await getBookingBalance(ctx, bookingId, totalCentavos);
  if (payment.amountCentavos > balanceCentavos && payment.method !== "cash") {
    throw new Error(`Amount exceeds remaining balance of ₱${(balanceCentavos / 100).toFixed(2)}`);
  }

  await ctx.db.insert("payments", {
    bookingId,
    amountCentavos: payment.amountCentavos,
    method: payment.method,
    status: "verified",
    reviewedBy: userId,
    reviewedAt: Date.now(),
  });

  if (payment.amountCentavos >= balanceCentavos) {
    await ctx.db.patch(bookingId, { status: "confirmed" });
  }
}

// Staff-entered reservation (walk-in, phone call, Messenger) — the public
// site no longer creates bookings directly, only inquiries (see inquiries.ts).
export const createByStaff = mutation({
  args: {
    listingId: v.id("listings"),
    startDate: v.string(),
    endDate: v.string(),
    guestCount: v.number(),
    customer: v.object({ fullName: v.string(), email: v.string(), phone: v.string() }),
    customerNotes: v.optional(v.string()),
    initialPayment: v.optional(initialPaymentValidator),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ANY_STAFF);
    const userId = (await getAuthUserId(ctx))!;

    const result = await createBookingCore(ctx, {
      listingId: args.listingId,
      startDate: args.startDate,
      endDate: args.endDate,
      guestCount: args.guestCount,
      customer: args.customer,
      customerNotes: args.customerNotes,
    });

    if (args.initialPayment) {
      await applyInitialPayment(ctx, result.bookingId, result.totalCentavos, args.initialPayment, userId);
    }

    return result;
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

    const customer = await ctx.db.get(booking.customerId);
    if (!customer || customer.email.toLowerCase() !== args.email.trim().toLowerCase()) return null;

    const listing = await ctx.db.get(booking.listingId);
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_bookingId", (q) => q.eq("bookingId", booking._id))
      .collect();

    return { booking, customer, listing, payments };
  },
});

export const listForAdmin = query({
  args: {
    status: v.optional(v.union(...bookingStatuses.map((s) => v.literal(s)))),
    listingId: v.optional(v.id("listings")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ANY_STAFF);

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
        customer: await ctx.db.get(booking.customerId),
        listing: await ctx.db.get(booking.listingId),
      })),
    );
  },
});

export const getDetail = query({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ANY_STAFF);
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) return null;
    const customer = await ctx.db.get(booking.customerId);
    const listing = await ctx.db.get(booking.listingId);
    const payments = await Promise.all(
      (
        await ctx.db
          .query("payments")
          .withIndex("by_bookingId", (q) => q.eq("bookingId", booking._id))
          .collect()
      ).map(async (p) => ({
        ...p,
        receiptUrl: p.receiptStorageId ? await ctx.storage.getUrl(p.receiptStorageId) : null,
      })),
    );
    const { paidCentavos, balanceCentavos } = await getBookingBalance(ctx, booking._id, booking.totalCentavos);
    return { booking, customer, listing, payments, paidCentavos, balanceCentavos };
  },
});

export const updateStatus = mutation({
  args: { bookingId: v.id("bookings"), newStatus: v.union(...bookingStatuses.map((s) => v.literal(s))) },
  handler: async (ctx, args) => {
    await requireRole(ctx, ANY_STAFF);
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
