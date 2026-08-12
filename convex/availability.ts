import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireRole, ANY_STAFF } from "./lib/auth";
import { isValidDateString, rangesOverlap } from "./lib/dateRanges";
import { isListingAvailable } from "./lib/availabilityHelpers";

export const getBlockedRanges = query({
  args: { listingId: v.id("listings") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("availabilityBlocks")
      .withIndex("by_listingId", (q) => q.eq("listingId", args.listingId))
      .collect();
  },
});

export const isRangeAvailable = query({
  args: { listingId: v.id("listings"), startDate: v.string(), endDate: v.string() },
  handler: async (ctx, args) => {
    return isListingAvailable(ctx, args.listingId, args.startDate, args.endDate);
  },
});

export const createManualBlock = mutation({
  args: { listingId: v.id("listings"), startDate: v.string(), endDate: v.string() },
  handler: async (ctx, args) => {
    await requireRole(ctx, ANY_STAFF);
    if (!isValidDateString(args.startDate) || !isValidDateString(args.endDate)) {
      throw new Error("Dates must be in YYYY-MM-DD format");
    }
    if (args.startDate >= args.endDate) throw new Error("endDate must be after startDate");

    const blocks = await ctx.db
      .query("availabilityBlocks")
      .withIndex("by_listingId", (q) => q.eq("listingId", args.listingId))
      .collect();
    if (blocks.some((b) => rangesOverlap(args.startDate, args.endDate, b.startDate, b.endDate))) {
      throw new Error("Selected dates overlap an existing block or booking");
    }

    return ctx.db.insert("availabilityBlocks", {
      listingId: args.listingId,
      startDate: args.startDate,
      endDate: args.endDate,
      reason: "manual_block",
    });
  },
});

export const releaseBlock = mutation({
  args: { blockId: v.id("availabilityBlocks") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ANY_STAFF);
    const block = await ctx.db.get(args.blockId);
    if (!block) throw new Error("Block not found");
    if (block.reason !== "manual_block") {
      throw new Error("Only manual blocks can be released directly; cancel the booking instead");
    }
    await ctx.db.delete(args.blockId);
  },
});
