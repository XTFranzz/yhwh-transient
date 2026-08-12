import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query, type QueryCtx, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireRole, ANY_STAFF } from "./lib/auth";

export const generateReceiptUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ANY_STAFF);
    return ctx.storage.generateUploadUrl();
  },
});

// Sums verified payments for a booking to derive what's still owed. Computed
// on read rather than denormalized onto bookings — balance is only ever
// needed one booking at a time (the detail page), so there's no read-cost
// case for storing it, and it can never drift out of sync with the payments
// it's derived from.
export async function getBookingBalance(
  ctx: QueryCtx | MutationCtx,
  bookingId: Id<"bookings">,
  totalCentavos: number,
) {
  const payments = await ctx.db
    .query("payments")
    .withIndex("by_bookingId", (q) => q.eq("bookingId", bookingId))
    .collect();
  const paidCentavos = payments
    .filter((p) => p.status === "verified")
    .reduce((sum, p) => sum + p.amountCentavos, 0);
  return { paidCentavos, balanceCentavos: Math.max(0, totalCentavos - paidCentavos) };
}

// Staff records a payment they've already confirmed out-of-band (cash in
// hand, or a GCash/bank screenshot sent over Messenger) — goes straight to
// "verified" since staff already vetted it before entering it here. Partial
// payments are fine — the booking only confirms once fully paid. A cash
// amount over the remaining balance is allowed (tipping in cash is common
// practice locally; the excess just isn't tracked as credit anywhere), but
// gcash/bank_transfer must not exceed the balance since an electronic
// overage is almost always a typo.
export const recordByStaff = mutation({
  args: {
    bookingId: v.id("bookings"),
    amountCentavos: v.number(),
    method: v.union(v.literal("gcash"), v.literal("bank_transfer"), v.literal("cash")),
    receiptStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ANY_STAFF);
    const userId = (await getAuthUserId(ctx))!;
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");
    if (booking.status === "cancelled" || booking.status === "no_show") {
      throw new Error("Cannot record a payment against a cancelled or no-show booking");
    }

    const { balanceCentavos } = await getBookingBalance(ctx, args.bookingId, booking.totalCentavos);
    if (args.amountCentavos > balanceCentavos && args.method !== "cash") {
      throw new Error(`Amount exceeds remaining balance of ₱${(balanceCentavos / 100).toFixed(2)}`);
    }

    const paymentId = await ctx.db.insert("payments", {
      bookingId: args.bookingId,
      receiptStorageId: args.receiptStorageId,
      amountCentavos: args.amountCentavos,
      method: args.method,
      status: "verified",
      reviewedBy: userId,
      reviewedAt: Date.now(),
    });

    if (args.amountCentavos >= balanceCentavos) {
      await ctx.db.patch(args.bookingId, { status: "confirmed" });
    }
    return paymentId;
  },
});

// General payments log (staff view) — optionally filtered by status. Nothing
// creates "submitted" payments going forward (that was the old customer
// self-upload flow), but verify/reject stay in case of historical data.
export const listAll = query({
  args: { status: v.optional(v.union(v.literal("submitted"), v.literal("verified"), v.literal("rejected"))) },
  handler: async (ctx, args) => {
    await requireRole(ctx, ANY_STAFF);
    const payments = args.status
      ? await ctx.db
          .query("payments")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .collect()
      : await ctx.db.query("payments").order("desc").collect();
    return Promise.all(
      payments.map(async (p) => {
        const booking = await ctx.db.get(p.bookingId);
        const customer = booking ? await ctx.db.get(booking.customerId) : null;
        const receiptUrl = p.receiptStorageId ? await ctx.storage.getUrl(p.receiptStorageId) : null;
        return { ...p, receiptUrl, booking, customer };
      }),
    );
  },
});

const METHODS = ["cash", "gcash", "bank_transfer"] as const;

// Revenue analytics for staff (verified payments only — "submitted"/"rejected"
// are leftover rows from the old guest self-upload flow and hold no real
// revenue signal).
export const analytics = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ANY_STAFF);
    const verified = await ctx.db
      .query("payments")
      .withIndex("by_status", (q) => q.eq("status", "verified"))
      .collect();

    const byMethod = Object.fromEntries(METHODS.map((m) => [m, { count: 0, amountCentavos: 0 }])) as Record<
      (typeof METHODS)[number],
      { count: number; amountCentavos: number }
    >;
    const byMonth = new Map<string, number>();
    let totalCentavos = 0;

    for (const p of verified) {
      totalCentavos += p.amountCentavos;
      byMethod[p.method].count += 1;
      byMethod[p.method].amountCentavos += p.amountCentavos;
      const monthKey = new Date(p.reviewedAt ?? p._creationTime).toISOString().slice(0, 7);
      byMonth.set(monthKey, (byMonth.get(monthKey) ?? 0) + p.amountCentavos);
    }

    const months = Array.from(byMonth.keys()).sort().slice(-6);

    return {
      totalCentavos,
      count: verified.length,
      averageCentavos: verified.length > 0 ? Math.round(totalCentavos / verified.length) : 0,
      byMethod,
      byMonth: months.map((month) => ({ month, amountCentavos: byMonth.get(month)! })),
    };
  },
});

export const verify = mutation({
  args: { paymentId: v.id("payments") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ANY_STAFF);
    const userId = (await getAuthUserId(ctx))!;
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) throw new Error("Payment not found");
    if (payment.status !== "submitted") throw new Error("Payment already reviewed");

    await ctx.db.patch(args.paymentId, { status: "verified", reviewedBy: userId, reviewedAt: Date.now() });

    const booking = await ctx.db.get(payment.bookingId);
    if (booking && booking.status === "pending_payment") {
      await ctx.db.patch(booking._id, { status: "confirmed" });
    }
  },
});

export const reject = mutation({
  args: { paymentId: v.id("payments"), reason: v.string() },
  handler: async (ctx, args) => {
    await requireRole(ctx, ANY_STAFF);
    const userId = (await getAuthUserId(ctx))!;
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) throw new Error("Payment not found");
    if (payment.status !== "submitted") throw new Error("Payment already reviewed");

    await ctx.db.patch(args.paymentId, {
      status: "rejected",
      rejectionReason: args.reason,
      reviewedBy: userId,
      reviewedAt: Date.now(),
    });
  },
});
