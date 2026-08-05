import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { requireRole } from "./lib/auth";

export const generateReceiptUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return ctx.storage.generateUploadUrl();
  },
});

export const submitReceipt = mutation({
  args: {
    bookingId: v.id("bookings"),
    referenceNumber: v.string(),
    storageId: v.id("_storage"),
    amountCentavos: v.number(),
    method: v.union(v.literal("gcash"), v.literal("bank_transfer")),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking || booking.referenceNumber !== args.referenceNumber.trim().toUpperCase()) {
      throw new Error("Booking reference does not match");
    }
    if (booking.status !== "pending_payment") {
      throw new Error("This booking is not awaiting payment");
    }

    return ctx.db.insert("payments", {
      bookingId: args.bookingId,
      receiptStorageId: args.storageId,
      amountCentavos: args.amountCentavos,
      method: args.method,
      status: "submitted",
    });
  },
});

export const listQueue = query({
  args: { status: v.optional(v.union(v.literal("submitted"), v.literal("verified"), v.literal("rejected"))) },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["owner_admin", "front_desk"]);
    const status = args.status ?? "submitted";
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_status", (q) => q.eq("status", status))
      .collect();
    return Promise.all(
      payments.map(async (p) => {
        const booking = await ctx.db.get(p.bookingId);
        const guest = booking ? await ctx.db.get(booking.guestId) : null;
        return { ...p, receiptUrl: await ctx.storage.getUrl(p.receiptStorageId), booking, guest };
      }),
    );
  },
});

export const verify = mutation({
  args: { paymentId: v.id("payments") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["owner_admin", "front_desk"]);
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
    await requireRole(ctx, ["owner_admin", "front_desk"]);
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
