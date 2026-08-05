import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  // Convex Auth's own tables: users, authAccounts, authSessions, etc.
  ...authTables,

  // Staff accounts, linked 1:1 to the auth `users` table. No self-registration —
  // owner_admin provisions every account via staff.createStaffAccount.
  staffProfiles: defineTable({
    userId: v.id("users"),
    displayName: v.string(),
    role: v.union(
      v.literal("owner_admin"),
      v.literal("front_desk"),
      v.literal("housekeeping"),
    ),
    isActive: v.boolean(),
  })
    .index("by_userId", ["userId"])
    .index("by_role", ["role"]),

  // Generic bookable listing. `type` discriminates house/vehicle/tour.
  // Type-specific fields live in a satellite details table (houseDetails,
  // vehicleDetails, tourDetails), joined by listingId.
  listings: defineTable({
    type: v.union(v.literal("house"), v.literal("vehicle"), v.literal("tour")),
    slug: v.string(),
    title: v.string(),
    description: v.string(),
    basePriceCentavos: v.number(),
    maxGuests: v.number(),
    status: v.union(v.literal("draft"), v.literal("active"), v.literal("inactive")),
    createdBy: v.id("users"),
  })
    .index("by_slug", ["slug"])
    .index("by_type_status", ["type", "status"]),

  houseDetails: defineTable({
    listingId: v.id("listings"),
    bedrooms: v.number(),
    bathrooms: v.number(),
    address: v.string(),
    amenities: v.array(v.string()),
    houseRules: v.optional(v.string()),
    checkInTime: v.string(),
    checkOutTime: v.string(),
  }).index("by_listingId", ["listingId"]),

  // Priced per rental day, same booking/availability shape as houses.
  vehicleDetails: defineTable({
    listingId: v.id("listings"),
    vehicleType: v.union(v.literal("van"), v.literal("car"), v.literal("motorcycle")),
    seats: v.number(),
    transmission: v.union(v.literal("manual"), v.literal("automatic")),
    withDriver: v.boolean(),
    pickupLocation: v.string(),
    features: v.array(v.string()),
  }).index("by_listingId", ["listingId"]),

  // Priced per head; a booking is always a single day (startDate/endDate one
  // day apart) — see bookings.create.
  tourDetails: defineTable({
    listingId: v.id("listings"),
    durationHours: v.number(),
    minPax: v.number(),
    meetingPoint: v.string(),
    itinerary: v.optional(v.string()),
  }).index("by_listingId", ["listingId"]),

  listingPhotos: defineTable({
    listingId: v.id("listings"),
    storageId: v.id("_storage"),
    sortOrder: v.number(),
    isCover: v.boolean(),
  })
    .index("by_listingId", ["listingId"])
    .index("by_listingId_sortOrder", ["listingId", "sortOrder"]),

  // Blocked date ranges per listing. Half-open interval [startDate, endDate) —
  // the checkout day is free for the next guest's check-in. Overlap prevention
  // is enforced in application code (bookings.create), not a DB constraint.
  availabilityBlocks: defineTable({
    listingId: v.id("listings"),
    startDate: v.string(), // "YYYY-MM-DD"
    endDate: v.string(), // "YYYY-MM-DD", exclusive
    reason: v.union(v.literal("booking"), v.literal("manual_block")),
    bookingId: v.optional(v.id("bookings")),
  })
    .index("by_listingId", ["listingId"])
    .index("by_bookingId", ["bookingId"]),

  // No guest accounts — a guest row is upserted by (email, phone) on each booking.
  guests: defineTable({
    fullName: v.string(),
    email: v.string(),
    phone: v.string(),
  })
    .index("by_email", ["email"])
    .index("by_email_phone", ["email", "phone"]),

  bookings: defineTable({
    referenceNumber: v.string(), // e.g. "YHWH-8F3K2Q"
    listingId: v.id("listings"),
    guestId: v.id("guests"),
    startDate: v.string(),
    endDate: v.string(),
    guestCount: v.number(),
    totalCentavos: v.number(),
    status: v.union(
      v.literal("pending_payment"),
      v.literal("confirmed"),
      v.literal("checked_in"),
      v.literal("checked_out"),
      v.literal("cancelled"),
      v.literal("no_show"),
    ),
    guestNotes: v.optional(v.string()),
  })
    .index("by_referenceNumber", ["referenceNumber"])
    .index("by_guestId", ["guestId"])
    .index("by_listingId_status", ["listingId", "status"])
    .index("by_status", ["status"])
    .index("by_startDate", ["startDate"])
    .index("by_endDate", ["endDate"]),

  payments: defineTable({
    bookingId: v.id("bookings"),
    receiptStorageId: v.id("_storage"),
    amountCentavos: v.number(),
    method: v.union(v.literal("gcash"), v.literal("bank_transfer")),
    status: v.union(v.literal("submitted"), v.literal("verified"), v.literal("rejected")),
    rejectionReason: v.optional(v.string()),
    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.number()),
  })
    .index("by_bookingId", ["bookingId"])
    .index("by_status", ["status"]),

  // Phase 1 schema stub — populated by bookings.updateStatus on checkout,
  // no admin UI until Phase 2.
  housekeepingStatuses: defineTable({
    listingId: v.id("listings"),
    status: v.union(v.literal("clean"), v.literal("dirty"), v.literal("in_progress")),
    bookingId: v.optional(v.id("bookings")),
    updatedAt: v.number(),
  })
    .index("by_listingId", ["listingId"])
    .index("by_status", ["status"]),

  // Phase 1 schema stub — no settings UI until Phase 2.
  settings: defineTable({
    key: v.string(),
    value: v.any(),
  }).index("by_key", ["key"]),
});
