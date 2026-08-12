import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { nightsBetween, todayDateString } from "./lib/dateRanges";

// Idempotent demo data for local development. Run via:
//   npx convex run seed:seedDemoData
// Staff logins are NOT created here (Convex Auth hashes passwords inside its
// own action) — see bootstrap.ts for the first superadmin account.
export const seedDemoData = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("listings").first();
    if (existing) return { skipped: true };

    const staff = await ctx.db.query("staffProfiles").first();
    if (!staff) {
      throw new Error(
        "No staff account exists yet — run bootstrap:bootstrapFirstOwner first so listings have a createdBy user",
      );
    }

    const today = todayDateString();
    const inDays = (n: number) => {
      const d = new Date(`${today}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + n);
      return d.toISOString().slice(0, 10);
    };

    const houses = [
      {
        title: "Casa Uno - Town Proper",
        description:
          "Cozy 2BR house a 5-minute walk from Town Proper. Perfect for small families and barkada trips.",
        basePriceCentavos: 250000,
        maxGuests: 4,
        houseDetails: {
          bedrooms: 2,
          bathrooms: 1,
          address: "Purok 3, Town Proper, Sample City",
          amenities: ["wifi", "aircon", "kitchen", "parking", "hot_shower"],
          checkInTime: "14:00",
          checkOutTime: "11:00",
        },
      },
      {
        title: "Villa Dos - Poolside Retreat",
        description: "Spacious 3BR villa with a private pool, ideal for group staycations.",
        basePriceCentavos: 550000,
        maxGuests: 8,
        houseDetails: {
          bedrooms: 3,
          bathrooms: 2,
          address: "Sitio Maligaya, Town Proper, Sample City",
          amenities: ["wifi", "aircon", "pool", "kitchen", "parking", "bbq_grill"],
          checkInTime: "14:00",
          checkOutTime: "12:00",
        },
      },
      {
        title: "The Nest - Studio for Two",
        description: "Compact studio-style house, great for couples on a quick getaway.",
        basePriceCentavos: 150000,
        maxGuests: 2,
        houseDetails: {
          bedrooms: 1,
          bathrooms: 1,
          address: "Brgy. Riverside, Town Proper, Sample City",
          amenities: ["wifi", "aircon", "kitchenette"],
          checkInTime: "15:00",
          checkOutTime: "11:00",
        },
      },
    ];

    const listingIds = [];
    for (const house of houses) {
      const slug = house.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const listingId = await ctx.db.insert("listings", {
        type: "house",
        slug,
        title: house.title,
        description: house.description,
        basePriceCentavos: house.basePriceCentavos,
        maxGuests: house.maxGuests,
        status: "active",
        createdBy: staff.userId,
      });
      await ctx.db.insert("houseDetails", { listingId, ...house.houseDetails });
      listingIds.push(listingId);
    }

    const customerId = await ctx.db.insert("customers", {
      fullName: "Juan Dela Cruz",
      email: "juan@example.com",
      phone: "09171234567",
    });
    const customer2Id = await ctx.db.insert("customers", {
      fullName: "Maria Santos",
      email: "maria@example.com",
      phone: "09179876543",
    });

    // A confirmed, upcoming booking with a verified payment.
    const booking1Start = inDays(3);
    const booking1End = inDays(5);
    const booking1Id = await ctx.db.insert("bookings", {
      referenceNumber: "YHWH-DEMO01",
      listingId: listingIds[0],
      customerId,
      startDate: booking1Start,
      endDate: booking1End,
      guestCount: 3,
      totalCentavos: houses[0].basePriceCentavos * nightsBetween(booking1Start, booking1End),
      status: "confirmed",
      source: "public_site",
    });
    await ctx.db.insert("availabilityBlocks", {
      listingId: listingIds[0],
      startDate: booking1Start,
      endDate: booking1End,
      reason: "booking",
      bookingId: booking1Id,
    });

    // A pending-payment booking awaiting admin review, submitted "today".
    const booking2Start = inDays(10);
    const booking2End = inDays(12);
    const booking2Id = await ctx.db.insert("bookings", {
      referenceNumber: "YHWH-DEMO02",
      listingId: listingIds[1],
      customerId: customer2Id,
      startDate: booking2Start,
      endDate: booking2End,
      guestCount: 6,
      totalCentavos: houses[1].basePriceCentavos * nightsBetween(booking2Start, booking2End),
      status: "pending_payment",
      customerNotes: "Celebrating a birthday, requesting late check-out if possible.",
      source: "public_site",
    });
    await ctx.db.insert("availabilityBlocks", {
      listingId: listingIds[1],
      startDate: booking2Start,
      endDate: booking2End,
      reason: "booking",
      bookingId: booking2Id,
    });

    return { skipped: false, listingIds, bookingIds: [booking1Id, booking2Id] };
  },
});

// Separate from seedDemoData so it can be run independently even after houses
// already exist. Run via: npx convex run seed:seedVehiclesAndTours
export const seedVehiclesAndTours = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("listings")
      .withIndex("by_type_status", (q) => q.eq("type", "vehicle"))
      .first();
    if (existing) return { skipped: true };

    const staff = await ctx.db.query("staffProfiles").first();
    if (!staff) throw new Error("No staff account exists yet — run bootstrap:bootstrapFirstOwner first");

    const vehicles = [
      {
        title: "Toyota Innova - Self Drive",
        description: "Reliable 7-seater van, perfect for family trips around the city and nearby provinces.",
        basePriceCentavos: 350000,
        maxGuests: 7,
        vehicleDetails: {
          vehicleType: "van" as const,
          seats: 7,
          transmission: "automatic" as const,
          withDriver: false,
          pickupLocation: "Town Proper Office, Sample City",
          features: ["aircon", "bluetooth", "dashcam"],
        },
      },
      {
        title: "Honda Click - Scooter Rental",
        description: "Easy-to-ride scooter for zipping around town. Helmet included.",
        basePriceCentavos: 60000,
        maxGuests: 2,
        vehicleDetails: {
          vehicleType: "motorcycle" as const,
          seats: 2,
          transmission: "automatic" as const,
          withDriver: false,
          pickupLocation: "Town Proper Office, Sample City",
          features: ["helmet_included"],
        },
      },
      {
        title: "Sedan with Driver",
        description: "Comfortable sedan with a professional driver — sit back and relax.",
        basePriceCentavos: 280000,
        maxGuests: 4,
        vehicleDetails: {
          vehicleType: "car" as const,
          seats: 4,
          transmission: "automatic" as const,
          withDriver: true,
          pickupLocation: "Town Proper Office, Sample City",
          features: ["aircon", "bottled_water"],
        },
      },
    ];

    for (const vehicle of vehicles) {
      const slug = vehicle.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const listingId = await ctx.db.insert("listings", {
        type: "vehicle",
        slug,
        title: vehicle.title,
        description: vehicle.description,
        basePriceCentavos: vehicle.basePriceCentavos,
        maxGuests: vehicle.maxGuests,
        status: "active",
        createdBy: staff.userId,
      });
      await ctx.db.insert("vehicleDetails", { listingId, ...vehicle.vehicleDetails });
    }

    const tours = [
      {
        title: "Basic City Tour",
        description: "A half-day guided tour of the city's must-see spots, with an air-conditioned van and driver.",
        basePriceCentavos: 80000,
        maxGuests: 10,
        tourDetails: {
          durationHours: 4,
          minPax: 2,
          meetingPoint: "Town Proper Plaza",
          itinerary: "Old Town Church -> Public Market -> City Museum -> Viewpoint -> Souvenir Shops",
        },
      },
      {
        title: "Sunset Food Crawl",
        description: "Sample the best local street food and restaurants as the sun sets over Town Proper.",
        basePriceCentavos: 120000,
        maxGuests: 8,
        tourDetails: {
          durationHours: 3,
          minPax: 2,
          meetingPoint: "Town Proper Plaza",
          itinerary: "Street food alley -> Riverside restaurants -> Night market",
        },
      },
    ];

    for (const tour of tours) {
      const slug = tour.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const listingId = await ctx.db.insert("listings", {
        type: "tour",
        slug,
        title: tour.title,
        description: tour.description,
        basePriceCentavos: tour.basePriceCentavos,
        maxGuests: tour.maxGuests,
        status: "active",
        createdBy: staff.userId,
      });
      await ctx.db.insert("tourDetails", { listingId, ...tour.tourDetails });
    }

    return { skipped: false };
  },
});

export const getBookingByReference = internalQuery({
  args: { referenceNumber: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("bookings")
      .withIndex("by_referenceNumber", (q) => q.eq("referenceNumber", args.referenceNumber))
      .unique();
  },
});

export const insertSeedPayment = internalMutation({
  args: { bookingId: v.id("bookings"), storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const already = await ctx.db
      .query("payments")
      .withIndex("by_bookingId", (q) => q.eq("bookingId", args.bookingId))
      .first();
    if (already) return already._id;
    return ctx.db.insert("payments", {
      bookingId: args.bookingId,
      receiptStorageId: args.storageId,
      amountCentavos: (await ctx.db.get(args.bookingId))!.totalCentavos,
      method: "gcash",
      status: "verified",
      reviewedAt: Date.now(),
    });
  },
});

// Attaches a placeholder receipt image + verified payment to the seeded
// confirmed booking, so the admin dashboard's revenue figure isn't zero.
// File storage writes need action context, hence this runs separately from
// seedDemoData (a mutation) via: npx convex run seed:seedDemoPayment
export const seedDemoPayment = internalAction({
  args: {},
  handler: async (ctx) => {
    const booking = await ctx.runQuery(internal.seed.getBookingByReference, {
      referenceNumber: "YHWH-DEMO01",
    });
    if (!booking) return { skipped: true, reason: "run seed:seedDemoData first" };

    const pngBytes = Uint8Array.from(
      atob(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      ),
      (c) => c.charCodeAt(0),
    );
    const storageId = await ctx.storage.store(new Blob([pngBytes], { type: "image/png" }));

    await ctx.runMutation(internal.seed.insertSeedPayment, { bookingId: booking._id, storageId });
    return { skipped: false };
  },
});
