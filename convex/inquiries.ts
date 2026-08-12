import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { requireRole, ANY_STAFF } from "./lib/auth";
import { isValidDateString, nightsBetween } from "./lib/dateRanges";
import { isListingAvailable } from "./lib/availabilityHelpers";
import { findOrCreateCustomer } from "./lib/customers";
import { createBookingCore, applyInitialPayment, initialPaymentValidator } from "./bookings";

const inquiryStatuses = ["new", "contacted", "converted", "declined"] as const;

// Public: a customer's request to book. No payment, no availability
// commitment — staff follow up (phone/Messenger/email) and either convert it
// to a real booking or decline it. See the "no blocking" decision: multiple
// people can inquire about overlapping dates; staff resolves this manually.
export const create = mutation({
  args: {
    listingId: v.id("listings"),
    startDate: v.string(),
    endDate: v.string(),
    guestCount: v.number(),
    customer: v.object({ fullName: v.string(), email: v.string(), phone: v.string() }),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!isValidDateString(args.startDate) || !isValidDateString(args.endDate)) {
      throw new Error("Dates must be in YYYY-MM-DD format");
    }
    if (args.startDate >= args.endDate) throw new Error("endDate must be after startDate");
    if (args.guestCount < 1) throw new Error("Guest count must be at least 1");

    const listing = await ctx.db.get(args.listingId);
    if (!listing || listing.status !== "active") throw new Error("Listing is not available");
    if (listing.type === "tour" && nightsBetween(args.startDate, args.endDate) !== 1) {
      throw new Error("Tours are a single day");
    }

    const { customerId } = await findOrCreateCustomer(ctx, args.customer);

    return ctx.db.insert("inquiries", {
      listingId: args.listingId,
      customerId,
      startDate: args.startDate,
      endDate: args.endDate,
      guestCount: args.guestCount,
      notes: args.notes,
      status: "new",
    });
  },
});

export const listForStaff = query({
  args: { status: v.optional(v.union(...inquiryStatuses.map((s) => v.literal(s)))) },
  handler: async (ctx, args) => {
    await requireRole(ctx, ANY_STAFF);
    const inquiries = args.status
      ? await ctx.db
          .query("inquiries")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .collect()
      : await ctx.db.query("inquiries").order("desc").collect();

    return Promise.all(
      inquiries.map(async (inquiry) => ({
        ...inquiry,
        customer: await ctx.db.get(inquiry.customerId),
        listing: await ctx.db.get(inquiry.listingId),
        isAvailable:
          inquiry.status === "new" || inquiry.status === "contacted"
            ? await isListingAvailable(ctx, inquiry.listingId, inquiry.startDate, inquiry.endDate)
            : null,
      })),
    );
  },
});

export const getDetail = query({
  args: { inquiryId: v.id("inquiries") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ANY_STAFF);
    const inquiry = await ctx.db.get(args.inquiryId);
    if (!inquiry) return null;
    return {
      ...inquiry,
      customer: await ctx.db.get(inquiry.customerId),
      listing: await ctx.db.get(inquiry.listingId),
    };
  },
});

export const updateStatus = mutation({
  args: { inquiryId: v.id("inquiries"), status: v.union(v.literal("contacted"), v.literal("declined")) },
  handler: async (ctx, args) => {
    await requireRole(ctx, ANY_STAFF);
    const userId = (await getAuthUserId(ctx))!;
    const inquiry = await ctx.db.get(args.inquiryId);
    if (!inquiry) throw new Error("Inquiry not found");
    if (inquiry.status === "converted") throw new Error("This inquiry has already been converted to a booking");

    await ctx.db.patch(args.inquiryId, { status: args.status, respondedBy: userId, respondedAt: Date.now() });
  },
});

// Turns an inquiry into a real booking once staff has confirmed details with
// the guest. Fields default to what was originally asked for but can be
// adjusted here (e.g. dates changed during the conversation).
export const convertToBooking = mutation({
  args: {
    inquiryId: v.id("inquiries"),
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
    const inquiry = await ctx.db.get(args.inquiryId);
    if (!inquiry) throw new Error("Inquiry not found");
    if (inquiry.status === "converted") throw new Error("This inquiry has already been converted to a booking");

    const result = await createBookingCore(ctx, {
      listingId: inquiry.listingId,
      startDate: args.startDate,
      endDate: args.endDate,
      guestCount: args.guestCount,
      customer: args.customer,
      customerNotes: args.customerNotes,
    });

    if (args.initialPayment) {
      await applyInitialPayment(ctx, result.bookingId, result.totalCentavos, args.initialPayment, userId);
    }

    await ctx.db.patch(args.inquiryId, {
      status: "converted",
      convertedBookingId: result.bookingId,
      respondedBy: userId,
      respondedAt: Date.now(),
    });

    return result;
  },
});
