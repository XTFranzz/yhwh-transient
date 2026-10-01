import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireRole, ANY_STAFF } from "./lib/auth";
import { computeLineItem } from "./lib/pricing";
import { getBookingBalance } from "./payments";

// An "invoice" isn't its own table — it's a billable view over a booking
// (real, priced, possibly paid) or a not-yet-converted inquiry (an estimate,
// priced the same way a booking would be). This keeps a single source of
// truth for the amount owed instead of duplicating it into storage.
function inquiryInvoiceNumber(inquiryId: Id<"inquiries">) {
  return `EST-${inquiryId.slice(-6).toUpperCase()}`;
}

export const listForAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ANY_STAFF);

    const bookings = await ctx.db.query("bookings").order("desc").collect();
    const bookingInvoices = await Promise.all(
      bookings.map(async (booking) => {
        const [customer, listing, { paidCentavos, balanceCentavos }] = await Promise.all([
          ctx.db.get(booking.customerId),
          ctx.db.get(booking.listingId),
          getBookingBalance(ctx, booking._id, booking.totalCentavos),
        ]);
        return {
          kind: "booking" as const,
          id: booking._id,
          invoiceNumber: booking.referenceNumber,
          customer,
          listing,
          startDate: booking.startDate,
          endDate: booking.endDate,
          guestCount: booking.guestCount,
          amountCentavos: booking.totalCentavos,
          paidCentavos,
          balanceCentavos,
          status: booking.status as string,
          createdAt: booking._creationTime,
        };
      }),
    );

    // Declined/converted inquiries either never happened or already have a
    // real booking (and therefore a real invoice) above — skip both.
    const openInquiries = (await ctx.db.query("inquiries").order("desc").collect()).filter(
      (inquiry) => inquiry.status === "new" || inquiry.status === "contacted",
    );
    const inquiryInvoices = await Promise.all(
      openInquiries.map(async (inquiry) => {
        const [customer, listing] = await Promise.all([ctx.db.get(inquiry.customerId), ctx.db.get(inquiry.listingId)]);
        const amountCentavos = listing ? computeLineItem(listing, inquiry.startDate, inquiry.endDate, inquiry.guestCount).totalCentavos : 0;
        return {
          kind: "inquiry" as const,
          id: inquiry._id,
          invoiceNumber: inquiryInvoiceNumber(inquiry._id),
          customer,
          listing,
          startDate: inquiry.startDate,
          endDate: inquiry.endDate,
          guestCount: inquiry.guestCount,
          amountCentavos,
          paidCentavos: 0,
          balanceCentavos: amountCentavos,
          status: "estimate" as const,
          createdAt: inquiry._creationTime,
        };
      }),
    );

    return [...bookingInvoices, ...inquiryInvoices].sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const getDetail = query({
  args: { kind: v.union(v.literal("booking"), v.literal("inquiry")), id: v.string() },
  handler: async (ctx, args) => {
    await requireRole(ctx, ANY_STAFF);

    if (args.kind === "booking") {
      const booking = await ctx.db.get(args.id as Id<"bookings">);
      if (!booking) return null;
      const [customer, listing, payments, { paidCentavos, balanceCentavos }] = await Promise.all([
        ctx.db.get(booking.customerId),
        ctx.db.get(booking.listingId),
        ctx.db
          .query("payments")
          .withIndex("by_bookingId", (q) => q.eq("bookingId", booking._id))
          .collect(),
        getBookingBalance(ctx, booking._id, booking.totalCentavos),
      ]);
      const lineItem = listing ? computeLineItem(listing, booking.startDate, booking.endDate, booking.guestCount) : null;
      return {
        kind: "booking" as const,
        invoiceNumber: booking.referenceNumber,
        customer,
        listing,
        startDate: booking.startDate,
        endDate: booking.endDate,
        guestCount: booking.guestCount,
        lineItem,
        amountCentavos: booking.totalCentavos,
        paidCentavos,
        balanceCentavos,
        status: booking.status as string,
        payments,
        notes: booking.customerNotes,
        createdAt: booking._creationTime,
      };
    }

    const inquiry = await ctx.db.get(args.id as Id<"inquiries">);
    if (!inquiry) return null;
    const [customer, listing] = await Promise.all([ctx.db.get(inquiry.customerId), ctx.db.get(inquiry.listingId)]);
    const lineItem = listing ? computeLineItem(listing, inquiry.startDate, inquiry.endDate, inquiry.guestCount) : null;
    return {
      kind: "inquiry" as const,
      invoiceNumber: inquiryInvoiceNumber(inquiry._id),
      customer,
      listing,
      startDate: inquiry.startDate,
      endDate: inquiry.endDate,
      guestCount: inquiry.guestCount,
      lineItem,
      amountCentavos: lineItem?.totalCentavos ?? 0,
      paidCentavos: 0,
      balanceCentavos: lineItem?.totalCentavos ?? 0,
      status: "estimate" as const,
      payments: [],
      notes: inquiry.notes,
      createdAt: inquiry._creationTime,
    };
  },
});
