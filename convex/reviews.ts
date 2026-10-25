import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireRole, ANY_STAFF } from "./lib/auth";
import { nightsBetween } from "./lib/dateRanges";

const reviewStatus = v.union(v.literal("pending"), v.literal("approved"), v.literal("hidden"));

const MAX_COMMENT_LENGTH = 500;
// "Recent" for booking popups — older bookings stop being shown.
const RECENT_BOOKING_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const FEED_LIMIT = 10;

function validateReviewInput(rating: number, comment: string) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error("Rating must be 1 to 5 stars");
  const trimmed = comment.trim();
  if (trimmed.length === 0) throw new Error("Please write a short review");
  if (trimmed.length > MAX_COMMENT_LENGTH) throw new Error(`Review must be ${MAX_COMMENT_LENGTH} characters or less`);
  return trimmed;
}

function nameParts(fullName: string) {
  return fullName.trim().split(/\s+/).filter(Boolean);
}

// Booking popups: "Rosa Tan" → "R*** T." — enough to feel real without
// identifying the guest.
export function maskBookingName(fullName: string): string {
  const parts = nameParts(fullName);
  if (parts.length === 0) return "A guest";
  const first = `${parts[0][0].toUpperCase()}***`;
  return parts.length > 1 ? `${first} ${parts[parts.length - 1][0].toUpperCase()}.` : first;
}

// Review popups: "Rosa Tan" → "Rosa T." (the usual review-site convention).
export function shortReviewName(fullName: string): string {
  const parts = nameParts(fullName);
  if (parts.length === 0) return "A guest";
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.` : parts[0];
}

// "Purok 3, Town Proper, Sample City" → "Town Proper, Sample City".
function areaFromAddress(address: string): string {
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  return parts.slice(-2).join(", ");
}

async function bookingSubtitle(ctx: QueryCtx, listing: Doc<"listings">, booking: Doc<"bookings">) {
  if (listing.type === "tour") {
    return `${booking.guestCount} ${booking.guestCount === 1 ? "guest" : "guests"}`;
  }
  const days = nightsBetween(booking.startDate, booking.endDate);
  if (listing.type === "vehicle") return `${days}-day rental`;

  const details = await ctx.db
    .query("houseDetails")
    .withIndex("by_listingId", (q) => q.eq("listingId", listing._id))
    .unique();
  const nights = `${days} ${days === 1 ? "night" : "nights"}`;
  return details ? `${areaFromAddress(details.address)} · ${nights}` : nights;
}

// Public: the items for the site's social-proof popups. Returns display-ready
// strings only — never booking ids, reference numbers, or contact details.
export const feed = query({
  args: {},
  handler: async (ctx) => {
    const since = Date.now() - RECENT_BOOKING_WINDOW_MS;
    const recent: Doc<"bookings">[] = [];
    for (const status of ["confirmed", "checked_in", "checked_out"] as const) {
      const rows = await ctx.db
        .query("bookings")
        .withIndex("by_status", (q) => q.eq("status", status))
        .order("desc")
        .take(FEED_LIMIT * 2);
      recent.push(...rows.filter((b) => b._creationTime >= since));
    }
    recent.sort((a, b) => b._creationTime - a._creationTime);

    const bookings = [];
    for (const booking of recent.slice(0, FEED_LIMIT)) {
      const [listing, customer] = await Promise.all([ctx.db.get(booking.listingId), ctx.db.get(booking.customerId)]);
      if (!listing || listing.status !== "active" || !customer) continue;
      bookings.push({
        key: `b-${booking._id}`,
        name: maskBookingName(customer.fullName),
        listingTitle: listing.title,
        listingType: listing.type,
        listingSlug: listing.slug,
        subtitle: await bookingSubtitle(ctx, listing, booking),
        createdAt: booking._creationTime,
      });
    }

    const approved = await ctx.db
      .query("reviews")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .order("desc")
      .take(FEED_LIMIT);
    const reviews = [];
    for (const review of approved) {
      const listing = await ctx.db.get(review.listingId);
      if (!listing || listing.status !== "active") continue;
      reviews.push({
        key: `r-${review._id}`,
        name: shortReviewName(review.guestName),
        listingTitle: listing.title,
        listingType: listing.type,
        listingSlug: listing.slug,
        rating: review.rating,
        comment: review.comment,
      });
    }

    return { bookings, reviews };
  },
});

// Public: a guest reviews their own stay from "My booking". Re-checks the
// reference + email pair (same as bookings.lookupByReferenceAndEmail) so
// knowing a reference number alone isn't enough.
export const submitByGuest = mutation({
  args: { referenceNumber: v.string(), email: v.string(), rating: v.number(), comment: v.string() },
  handler: async (ctx, args) => {
    const comment = validateReviewInput(args.rating, args.comment);

    const booking = await ctx.db
      .query("bookings")
      .withIndex("by_referenceNumber", (q) => q.eq("referenceNumber", args.referenceNumber.trim().toUpperCase()))
      .unique();
    const customer = booking ? await ctx.db.get(booking.customerId) : null;
    if (!booking || !customer || customer.email.toLowerCase() !== args.email.trim().toLowerCase()) {
      throw new Error("Booking not found");
    }
    if (booking.status !== "checked_out") throw new Error("You can leave a review after your stay");

    const existing = await ctx.db
      .query("reviews")
      .withIndex("by_bookingId", (q) => q.eq("bookingId", booking._id))
      .first();
    if (existing) throw new Error("You've already reviewed this booking");

    await ctx.db.insert("reviews", {
      listingId: booking.listingId,
      bookingId: booking._id,
      guestName: customer.fullName,
      rating: args.rating,
      comment,
      source: "guest",
      status: "pending",
    });
  },
});

// Staff: all reviews (optionally one status), newest first.
export const listForStaff = query({
  args: { status: v.optional(reviewStatus) },
  handler: async (ctx, args) => {
    await requireRole(ctx, ANY_STAFF);
    const reviews = args.status
      ? await ctx.db
          .query("reviews")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .order("desc")
          .collect()
      : await ctx.db.query("reviews").order("desc").collect();
    return Promise.all(
      reviews.map(async (review) => {
        const listing = await ctx.db.get(review.listingId);
        const booking = review.bookingId ? await ctx.db.get(review.bookingId) : null;
        return { ...review, listing, referenceNumber: booking?.referenceNumber ?? null };
      }),
    );
  },
});

// Staff: add a review collected elsewhere. Published immediately.
export const createByStaff = mutation({
  args: { listingId: v.id("listings"), guestName: v.string(), rating: v.number(), comment: v.string() },
  handler: async (ctx, args) => {
    await requireRole(ctx, ANY_STAFF);
    const comment = validateReviewInput(args.rating, args.comment);
    const guestName = args.guestName.trim();
    if (!guestName) throw new Error("Guest name is required");
    if (!(await ctx.db.get(args.listingId))) throw new Error("Listing not found");
    return ctx.db.insert("reviews", {
      listingId: args.listingId,
      guestName,
      rating: args.rating,
      comment,
      source: "staff",
      status: "approved",
    });
  },
});

export const setStatus = mutation({
  args: { reviewId: v.id("reviews"), status: reviewStatus },
  handler: async (ctx, args) => {
    await requireRole(ctx, ANY_STAFF);
    if (!(await ctx.db.get(args.reviewId))) throw new Error("Review not found");
    await ctx.db.patch(args.reviewId, { status: args.status });
  },
});

export const remove = mutation({
  args: { reviewId: v.id("reviews") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ANY_STAFF);
    await ctx.db.delete(args.reviewId);
  },
});
