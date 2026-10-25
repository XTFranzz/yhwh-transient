import { internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { createBookingCore } from "./bookings";
import { todayDateString } from "./lib/dateRanges";

// Demo bookings + reviews for testing the public site's popups locally.
//   npx convex run demo:seedPopupDemo    — add them (safe to re-run)
//   npx convex run demo:clearPopupDemo   — remove everything it added
// Not for production: these are made-up guests and reviews.
//
// Everything is tagged so clearPopupDemo can find it again: demo customers
// use DEMO_EMAIL_DOMAIN, demo reviews have a guestName from DEMO_REVIEWS.

const DEMO_EMAIL_DOMAIN = "@demo.yhwh.local";

const DEMO_GUESTS = [
  "Rosa Tan",
  "Miguel Reyes",
  "Andrea Lim",
  "Paolo Santos",
  "Jessa Cruz",
  "Mark Villanueva",
  "Bea Gonzales",
  "Carlo Dizon",
];

const DEMO_REVIEWS = [
  { guestName: "Kristine Aquino", rating: 5, comment: "Super clean and the host was very responsive. Will definitely book again!" },
  { guestName: "Joshua Ramos", rating: 5, comment: "Perfect for our family weekend. Kids loved it and check-in was easy." },
  { guestName: "Liza Mendoza", rating: 4, comment: "Great location, walking distance to everything in town. Comfy beds too." },
  { guestName: "Ryan Bautista", rating: 5, comment: "Smooth booking and the van was spotless. Driver was on time and friendly." },
  { guestName: "Camille Torres", rating: 5, comment: "The food crawl was the highlight of our trip. Super worth it!" },
  { guestName: "Nico Fernandez", rating: 4, comment: "Quiet, cozy, and exactly like the photos. Would stay again." },
];

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function demoEmail(name: string) {
  return `${name.toLowerCase().replace(/\s+/g, ".")}${DEMO_EMAIL_DOMAIN}`;
}

async function minGuests(ctx: MutationCtx, listing: Doc<"listings">) {
  if (listing.type !== "tour") return Math.min(2, listing.maxGuests);
  const tour = await ctx.db
    .query("tourDetails")
    .withIndex("by_listingId", (q) => q.eq("listingId", listing._id))
    .unique();
  return Math.min(Math.max(tour?.minPax ?? 1, 2), listing.maxGuests);
}

export const seedPopupDemo = internalMutation({
  args: {},
  handler: async (ctx) => {
    const listings = (await ctx.db.query("listings").collect()).filter((l) => l.status === "active");
    if (listings.length === 0) throw new Error("No active listings — run seed:seedDemoData first");

    // Bookings: one per demo guest, spread across the listings, a couple of
    // months out so they don't clash with real near-term bookings.
    let bookingsAdded = 0;
    const today = todayDateString();
    for (const [i, guest] of DEMO_GUESTS.entries()) {
      const email = demoEmail(guest);
      const existing = await ctx.db
        .query("customers")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();
      if (existing) continue;

      const listing = listings[i % listings.length];
      const startDate = addDays(today, 60 + i * 4);
      const nights = listing.type === "tour" ? 1 : 1 + (i % 3);
      try {
        const { bookingId, totalCentavos } = await createBookingCore(ctx, {
          listingId: listing._id,
          startDate,
          endDate: addDays(startDate, nights),
          guestCount: await minGuests(ctx, listing),
          customer: { fullName: guest, email, phone: `0917000${String(1000 + i)}` },
          customerNotes: "Demo booking for testing popups",
        });
        await ctx.db.insert("payments", {
          bookingId,
          amountCentavos: totalCentavos,
          method: "cash",
          status: "verified",
          reviewedAt: Date.now(),
        });
        await ctx.db.patch(bookingId, { status: "confirmed" });
        bookingsAdded++;
      } catch {
        // Dates taken by a real booking — skip this one rather than fail the run.
      }
    }

    let reviewsAdded = 0;
    for (const [i, review] of DEMO_REVIEWS.entries()) {
      const existing = (await ctx.db.query("reviews").collect()).find((r) => r.guestName === review.guestName);
      if (existing) continue;
      await ctx.db.insert("reviews", {
        listingId: listings[i % listings.length]._id,
        ...review,
        source: "staff",
        status: "approved",
      });
      reviewsAdded++;
    }

    return { bookingsAdded, reviewsAdded };
  },
});

export const clearPopupDemo = internalMutation({
  args: {},
  handler: async (ctx) => {
    let bookingsRemoved = 0;
    const customers = (await ctx.db.query("customers").collect()).filter((c) => c.email.endsWith(DEMO_EMAIL_DOMAIN));
    for (const customer of customers) {
      const bookings = await ctx.db
        .query("bookings")
        .withIndex("by_customerId", (q) => q.eq("customerId", customer._id))
        .collect();
      for (const booking of bookings) {
        const related = [
          ...(await ctx.db.query("payments").withIndex("by_bookingId", (q) => q.eq("bookingId", booking._id)).collect()),
          ...(await ctx.db
            .query("availabilityBlocks")
            .withIndex("by_bookingId", (q) => q.eq("bookingId", booking._id))
            .collect()),
          ...(await ctx.db.query("reviews").withIndex("by_bookingId", (q) => q.eq("bookingId", booking._id)).collect()),
        ];
        for (const doc of related) await ctx.db.delete(doc._id);
        await ctx.db.delete(booking._id);
        bookingsRemoved++;
      }
      await ctx.db.delete(customer._id);
    }

    const demoNames = new Set(DEMO_REVIEWS.map((r) => r.guestName));
    const reviews = (await ctx.db.query("reviews").collect()).filter(
      (r) => r.source === "staff" && demoNames.has(r.guestName),
    );
    for (const review of reviews) await ctx.db.delete(review._id);

    return { bookingsRemoved, reviewsRemoved: reviews.length };
  },
});
