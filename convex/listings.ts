import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireRole, ANY_STAFF, ADMIN_UP } from "./lib/auth";
import { ensureUniqueSlug } from "./lib/slug";
import { isListingAvailable } from "./lib/availabilityHelpers";

const listingType = v.union(v.literal("house"), v.literal("vehicle"), v.literal("tour"));

const houseDetailsValidator = v.object({
  bedrooms: v.number(),
  bathrooms: v.number(),
  address: v.string(),
  amenities: v.array(v.string()),
  houseRules: v.optional(v.string()),
  checkInTime: v.string(),
  checkOutTime: v.string(),
});

const vehicleDetailsValidator = v.object({
  vehicleType: v.union(v.literal("van"), v.literal("car"), v.literal("motorcycle")),
  seats: v.number(),
  transmission: v.union(v.literal("manual"), v.literal("automatic")),
  withDriver: v.boolean(),
  pickupLocation: v.string(),
  features: v.array(v.string()),
});

const tourDetailsValidator = v.object({
  durationHours: v.number(),
  minPax: v.number(),
  meetingPoint: v.string(),
  itinerary: v.optional(v.string()),
});

const DETAILS_TABLE = {
  house: "houseDetails",
  vehicle: "vehicleDetails",
  tour: "tourDetails",
} as const;

async function coverPhotoUrl(ctx: { db: any; storage: any }, listingId: Id<"listings">) {
  const photos = await ctx.db
    .query("listingPhotos")
    .withIndex("by_listingId_sortOrder", (q: any) => q.eq("listingId", listingId))
    .collect();
  if (photos.length === 0) return null;
  const cover = photos.find((p: Doc<"listingPhotos">) => p.isCover) ?? photos[0];
  return ctx.storage.getUrl(cover.storageId);
}

async function detailsFor(ctx: { db: any }, listing: Doc<"listings">) {
  return ctx.db
    .query(DETAILS_TABLE[listing.type])
    .withIndex("by_listingId", (q: any) => q.eq("listingId", listing._id))
    .unique();
}

// Public: active listings of one type, optionally filtered by date range + guest count.
export const list = query({
  args: {
    type: listingType,
    checkIn: v.optional(v.string()),
    checkOut: v.optional(v.string()),
    guests: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const listings = await ctx.db
      .query("listings")
      .withIndex("by_type_status", (q) => q.eq("type", args.type).eq("status", "active"))
      .collect();

    const results = [];
    for (const listing of listings) {
      if (args.guests && listing.maxGuests < args.guests) continue;
      if (args.checkIn && args.checkOut) {
        const available = await isListingAvailable(ctx, listing._id, args.checkIn, args.checkOut);
        if (!available) continue;
      }
      results.push({
        ...listing,
        coverPhotoUrl: await coverPhotoUrl(ctx, listing._id),
        details: await detailsFor(ctx, listing),
      });
    }
    return results;
  },
});

// Public: full detail for a listing page, of any type. Only exposes active listings.
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const listing = await ctx.db
      .query("listings")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!listing || listing.status !== "active") return null;

    const details = await detailsFor(ctx, listing);
    const photos = await ctx.db
      .query("listingPhotos")
      .withIndex("by_listingId_sortOrder", (q) => q.eq("listingId", listing._id))
      .collect();
    const photoUrls = await Promise.all(
      photos.map(async (p) => ({ id: p._id, url: await ctx.storage.getUrl(p.storageId), isCover: p.isCover })),
    );

    return { ...listing, details, photos: photoUrls };
  },
});

// Staff: all statuses, for the admin listings table. Optionally scoped to one type.
export const listAllForAdmin = query({
  args: { type: v.optional(listingType) },
  handler: async (ctx, args) => {
    await requireRole(ctx, ANY_STAFF);
    const listings = args.type
      ? await ctx.db
          .query("listings")
          .withIndex("by_type_status", (q) => q.eq("type", args.type!))
          .order("desc")
          .collect()
      : await ctx.db.query("listings").order("desc").collect();
    return Promise.all(
      listings.map(async (listing) => ({ ...listing, coverPhotoUrl: await coverPhotoUrl(ctx, listing._id) })),
    );
  },
});

// Staff: full detail for the admin edit form.
export const getForAdmin = query({
  args: { listingId: v.id("listings") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ANY_STAFF);
    const listing = await ctx.db.get(args.listingId);
    if (!listing) return null;
    const details = await detailsFor(ctx, listing);
    const photos = await ctx.db
      .query("listingPhotos")
      .withIndex("by_listingId_sortOrder", (q) => q.eq("listingId", args.listingId))
      .collect();
    const photoUrls = await Promise.all(
      photos.map(async (p) => ({ id: p._id, url: await ctx.storage.getUrl(p.storageId), isCover: p.isCover })),
    );
    return { ...listing, details, photos: photoUrls };
  },
});

export const create = mutation({
  args: {
    type: listingType,
    title: v.string(),
    description: v.string(),
    basePriceCentavos: v.number(),
    maxGuests: v.number(),
    houseDetails: v.optional(houseDetailsValidator),
    vehicleDetails: v.optional(vehicleDetailsValidator),
    tourDetails: v.optional(tourDetailsValidator),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ADMIN_UP);
    const userId = (await getAuthUserId(ctx))!;
    const slug = await ensureUniqueSlug(ctx, args.title);

    if (args.type === "house" && !args.houseDetails) throw new Error("Missing house details");
    if (args.type === "vehicle" && !args.vehicleDetails) throw new Error("Missing vehicle details");
    if (args.type === "tour" && !args.tourDetails) throw new Error("Missing tour details");

    const listingId = await ctx.db.insert("listings", {
      type: args.type,
      slug,
      title: args.title,
      description: args.description,
      basePriceCentavos: args.basePriceCentavos,
      maxGuests: args.maxGuests,
      status: "draft",
      createdBy: userId,
    });
    if (args.type === "house") {
      await ctx.db.insert("houseDetails", { listingId, ...args.houseDetails! });
    } else if (args.type === "vehicle") {
      await ctx.db.insert("vehicleDetails", { listingId, ...args.vehicleDetails! });
    } else {
      await ctx.db.insert("tourDetails", { listingId, ...args.tourDetails! });
    }
    return listingId;
  },
});

export const update = mutation({
  args: {
    listingId: v.id("listings"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    basePriceCentavos: v.optional(v.number()),
    maxGuests: v.optional(v.number()),
    houseDetails: v.optional(houseDetailsValidator),
    vehicleDetails: v.optional(vehicleDetailsValidator),
    tourDetails: v.optional(tourDetailsValidator),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ADMIN_UP);
    const listing = await ctx.db.get(args.listingId);
    if (!listing) throw new Error("Listing not found");

    const patch: Record<string, unknown> = {};
    if (args.title !== undefined) {
      patch.title = args.title;
      patch.slug = await ensureUniqueSlug(ctx, args.title, args.listingId);
    }
    if (args.description !== undefined) patch.description = args.description;
    if (args.basePriceCentavos !== undefined) patch.basePriceCentavos = args.basePriceCentavos;
    if (args.maxGuests !== undefined) patch.maxGuests = args.maxGuests;
    if (Object.keys(patch).length > 0) await ctx.db.patch(args.listingId, patch);

    if (listing.type === "house" && args.houseDetails) {
      const existing = await detailsFor(ctx, listing);
      if (existing) await ctx.db.patch(existing._id, args.houseDetails);
      else await ctx.db.insert("houseDetails", { listingId: args.listingId, ...args.houseDetails });
    } else if (listing.type === "vehicle" && args.vehicleDetails) {
      const existing = await detailsFor(ctx, listing);
      if (existing) await ctx.db.patch(existing._id, args.vehicleDetails);
      else await ctx.db.insert("vehicleDetails", { listingId: args.listingId, ...args.vehicleDetails });
    } else if (listing.type === "tour" && args.tourDetails) {
      const existing = await detailsFor(ctx, listing);
      if (existing) await ctx.db.patch(existing._id, args.tourDetails);
      else await ctx.db.insert("tourDetails", { listingId: args.listingId, ...args.tourDetails });
    }
  },
});

export const setStatus = mutation({
  args: { listingId: v.id("listings"), status: v.union(v.literal("draft"), v.literal("active"), v.literal("inactive")) },
  handler: async (ctx, args) => {
    await requireRole(ctx, ADMIN_UP);
    await ctx.db.patch(args.listingId, { status: args.status });
  },
});

export const generatePhotoUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ADMIN_UP);
    return ctx.storage.generateUploadUrl();
  },
});

export const addPhoto = mutation({
  args: { listingId: v.id("listings"), storageId: v.id("_storage"), isCover: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    await requireRole(ctx, ADMIN_UP);
    const existingPhotos = await ctx.db
      .query("listingPhotos")
      .withIndex("by_listingId", (q) => q.eq("listingId", args.listingId))
      .collect();
    if (args.isCover) {
      for (const p of existingPhotos) if (p.isCover) await ctx.db.patch(p._id, { isCover: false });
    }
    return ctx.db.insert("listingPhotos", {
      listingId: args.listingId,
      storageId: args.storageId,
      sortOrder: existingPhotos.length,
      isCover: args.isCover ?? existingPhotos.length === 0,
    });
  },
});

export const reorderPhotos = mutation({
  args: { orderedPhotoIds: v.array(v.id("listingPhotos")) },
  handler: async (ctx, args) => {
    await requireRole(ctx, ADMIN_UP);
    await Promise.all(args.orderedPhotoIds.map((id, index) => ctx.db.patch(id, { sortOrder: index })));
  },
});

export const removePhoto = mutation({
  args: { photoId: v.id("listingPhotos") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ADMIN_UP);
    const photo = await ctx.db.get(args.photoId);
    if (!photo) return;
    await ctx.storage.delete(photo.storageId);
    await ctx.db.delete(args.photoId);
  },
});
