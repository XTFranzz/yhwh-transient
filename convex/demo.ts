import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
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

// ---------------------------------------------------------------------------
// Sample listing photos (free Unsplash stock), for listings that have none.
//   npx convex run demo:seedSamplePhotos    — add them (skips listings with photos)
//   npx convex run demo:clearSamplePhotos   — remove only the photos it added
// The ids of added photos are remembered in the `settings` row below.

const SAMPLE_PHOTOS_KEY = "demo.samplePhotoIds";

const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}?w=1400&q=80&fm=jpg&fit=crop`;

const HOUSE_SETS = [
  ["1600585154340-be6161a56a0c", "1502672260266-1c1ef2d93688", "1484154218962-a197022b5858", "1505691938895-1758d7feb511"],
  ["1580587771525-78b9dba3b914", "1564013799919-ab600027ffc6", "1505691938895-1758d7feb511", "1502672260266-1c1ef2d93688"],
  ["1512917774080-9991f1c4c750", "1522771739844-6a9f6d5f14af", "1484154218962-a197022b5858", "1570129477492-45c003edd2be"],
];

// First matching rule wins; titles are matched case-insensitively.
const VEHICLE_RULES: [RegExp, string[]][] = [
  [/click|scooter|motor/i, ["1558981403-c5f9899a28bc", "1533473359331-0135ef1b58bf", "1469854523086-cc02fe5d8800"]],
  [/hilux|pickup|4x4/i, ["1559416523-140ddc3d238c", "1533473359331-0135ef1b58bf", "1609521263047-f8f205293f24"]],
  [/van|innova|suv/i, ["1469854523086-cc02fe5d8800", "1533473359331-0135ef1b58bf", "1609521263047-f8f205293f24"]],
  [/./, ["1503376780353-7e6692767b70", "1549317661-bd32c8ce0db2", "1494976388531-d1058494cdd8"]],
];
const TOUR_RULES: [RegExp, string[]][] = [
  [/food|crawl|eat/i, ["1555396273-367ea4eb4db5", "1504674900247-0877df9cc836", "1414235077428-338989a2e8c0", "1518548419970-58e3b4079ab2"]],
  [/./, ["1527631746610-bca00a040d60", "1528127269322-539801943592", "1476514525535-07fb3b4ae5f1", "1519046904884-53103b34b206"]],
];

function photoIdsFor(listing: Doc<"listings">, houseIndex: number): string[] {
  if (listing.type === "house") return HOUSE_SETS[houseIndex % HOUSE_SETS.length];
  const rules = listing.type === "vehicle" ? VEHICLE_RULES : TOUR_RULES;
  return rules.find(([re]) => re.test(listing.title))![1];
}

export const listingsWithoutPhotos = internalQuery({
  args: {},
  handler: async (ctx) => {
    const listings = await ctx.db.query("listings").collect();
    const result: Doc<"listings">[] = [];
    for (const listing of listings) {
      const photo = await ctx.db
        .query("listingPhotos")
        .withIndex("by_listingId", (q) => q.eq("listingId", listing._id))
        .first();
      if (!photo) result.push(listing);
    }
    return result;
  },
});

export const insertSamplePhotos = internalMutation({
  args: { listingId: v.id("listings"), storageIds: v.array(v.id("_storage")) },
  handler: async (ctx, args) => {
    const ids = [];
    for (const [i, storageId] of args.storageIds.entries()) {
      ids.push(await ctx.db.insert("listingPhotos", { listingId: args.listingId, storageId, sortOrder: i, isCover: i === 0 }));
    }
    const row = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", SAMPLE_PHOTOS_KEY))
      .unique();
    if (row) await ctx.db.patch(row._id, { value: [...(row.value as string[]), ...ids] });
    else await ctx.db.insert("settings", { key: SAMPLE_PHOTOS_KEY, value: ids });
  },
});

export const seedSamplePhotos = internalAction({
  args: {},
  handler: async (ctx): Promise<{ listingsUpdated: number; photosAdded: number }> => {
    const listings: Doc<"listings">[] = await ctx.runQuery(internal.demo.listingsWithoutPhotos, {});
    let houseIndex = 0;
    let photosAdded = 0;
    for (const listing of listings) {
      const ids = photoIdsFor(listing, listing.type === "house" ? houseIndex++ : 0);
      const storageIds = [];
      for (const id of ids) {
        const res = await fetch(unsplash(id));
        if (!res.ok) continue;
        storageIds.push(await ctx.storage.store(await res.blob()));
      }
      await ctx.runMutation(internal.demo.insertSamplePhotos, { listingId: listing._id, storageIds });
      photosAdded += storageIds.length;
    }
    return { listingsUpdated: listings.length, photosAdded };
  },
});

export const clearSamplePhotos = internalMutation({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", SAMPLE_PHOTOS_KEY))
      .unique();
    if (!row) return { photosRemoved: 0 };
    let photosRemoved = 0;
    for (const id of row.value as Id<"listingPhotos">[]) {
      const photo = await ctx.db.get(id);
      if (!photo) continue;
      await ctx.storage.delete(photo.storageId);
      await ctx.db.delete(id);
      photosRemoved++;
    }
    await ctx.db.delete(row._id);
    return { photosRemoved };
  },
});
