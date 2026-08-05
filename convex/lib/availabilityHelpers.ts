import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { rangesOverlap } from "./dateRanges";

export async function isListingAvailable(
  ctx: QueryCtx | MutationCtx,
  listingId: Id<"listings">,
  startDate: string,
  endDate: string,
): Promise<boolean> {
  const blocks = await ctx.db
    .query("availabilityBlocks")
    .withIndex("by_listingId", (q) => q.eq("listingId", listingId))
    .collect();
  return !blocks.some((b) => rangesOverlap(startDate, endDate, b.startDate, b.endDate));
}
