import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

async function setupOwnerWithListing(t: ReturnType<typeof convexTest>) {
  const userId = await t.run(async (ctx) => ctx.db.insert("users", { email: "owner@test.local" }));
  await t.run(async (ctx) =>
    ctx.db.insert("staffProfiles", { userId, displayName: "Owner", role: "owner_admin", isActive: true }),
  );
  const asOwner = t.withIdentity({ subject: userId });

  const listingId = await asOwner.mutation(api.listings.create, {
    type: "house",
    title: "Test House",
    description: "A house for testing.",
    basePriceCentavos: 100000,
    maxGuests: 4,
    houseDetails: {
      bedrooms: 2,
      bathrooms: 1,
      address: "123 Test St",
      amenities: ["wifi"],
      checkInTime: "14:00",
      checkOutTime: "11:00",
    },
  });
  await asOwner.mutation(api.listings.setStatus, { listingId, status: "active" });

  return { asOwner, listingId };
}

async function setupOwnerWithTourListing(t: ReturnType<typeof convexTest>) {
  const userId = await t.run(async (ctx) => ctx.db.insert("users", { email: "tourowner@test.local" }));
  await t.run(async (ctx) =>
    ctx.db.insert("staffProfiles", { userId, displayName: "Owner", role: "owner_admin", isActive: true }),
  );
  const asOwner = t.withIdentity({ subject: userId });

  const listingId = await asOwner.mutation(api.listings.create, {
    type: "tour",
    title: "Test Tour",
    description: "A tour for testing.",
    basePriceCentavos: 50000,
    maxGuests: 10,
    tourDetails: { durationHours: 4, minPax: 2, meetingPoint: "Plaza" },
  });
  await asOwner.mutation(api.listings.setStatus, { listingId, status: "active" });

  return { asOwner, listingId };
}

const GUEST = { fullName: "Jane Guest", email: "jane@test.local", phone: "09170000000" };

test("rejects a booking that overlaps an existing one for the same listing", async () => {
  const t = convexTest(schema);
  const { listingId } = await setupOwnerWithListing(t);

  await t.mutation(api.bookings.create, {
    listingId,
    startDate: "2099-01-10",
    endDate: "2099-01-12",
    guestCount: 2,
    guest: GUEST,
  });

  await expect(
    t.mutation(api.bookings.create, {
      listingId,
      startDate: "2099-01-11",
      endDate: "2099-01-13",
      guestCount: 2,
      guest: GUEST,
    }),
  ).rejects.toThrow(/no longer available/);
});

test("allows a back-to-back booking that starts the day another ends", async () => {
  const t = convexTest(schema);
  const { listingId } = await setupOwnerWithListing(t);

  await t.mutation(api.bookings.create, {
    listingId,
    startDate: "2099-02-01",
    endDate: "2099-02-03",
    guestCount: 2,
    guest: GUEST,
  });

  const second = await t.mutation(api.bookings.create, {
    listingId,
    startDate: "2099-02-03",
    endDate: "2099-02-05",
    guestCount: 2,
    guest: GUEST,
  });
  expect(second.referenceNumber).toMatch(/^YHWH-/);
});

test("verifying a payment cascades the booking from pending_payment to confirmed", async () => {
  const t = convexTest(schema);
  const { asOwner, listingId } = await setupOwnerWithListing(t);

  const { bookingId, referenceNumber } = await t.mutation(api.bookings.create, {
    listingId,
    startDate: "2099-03-01",
    endDate: "2099-03-03",
    guestCount: 2,
    guest: GUEST,
  });

  const storageId = await t.run(async (ctx) => ctx.storage.store(new Blob([new Uint8Array([1, 2, 3])])));
  const paymentId = await t.mutation(api.payments.submitReceipt, {
    bookingId,
    referenceNumber,
    storageId,
    amountCentavos: 200000,
    method: "gcash",
  });

  let booking = await t.run(async (ctx) => ctx.db.get(bookingId));
  expect(booking?.status).toBe("pending_payment");

  await asOwner.mutation(api.payments.verify, { paymentId });

  booking = await t.run(async (ctx) => ctx.db.get(bookingId));
  expect(booking?.status).toBe("confirmed");
});

test("rejecting a payment leaves the booking pending and records the reason", async () => {
  const t = convexTest(schema);
  const { asOwner, listingId } = await setupOwnerWithListing(t);

  const { bookingId, referenceNumber } = await t.mutation(api.bookings.create, {
    listingId,
    startDate: "2099-04-01",
    endDate: "2099-04-03",
    guestCount: 2,
    guest: GUEST,
  });
  const storageId = await t.run(async (ctx) => ctx.storage.store(new Blob([new Uint8Array([1, 2, 3])])));
  const paymentId = await t.mutation(api.payments.submitReceipt, {
    bookingId,
    referenceNumber,
    storageId,
    amountCentavos: 200000,
    method: "gcash",
  });

  await asOwner.mutation(api.payments.reject, { paymentId, reason: "Amount mismatch" });

  const booking = await t.run(async (ctx) => ctx.db.get(bookingId));
  expect(booking?.status).toBe("pending_payment");
  const payment = await t.run(async (ctx) => ctx.db.get(paymentId));
  expect(payment?.status).toBe("rejected");
  expect(payment?.rejectionReason).toBe("Amount mismatch");
});

test("cancelling a confirmed booking releases its availability block", async () => {
  const t = convexTest(schema);
  const { asOwner, listingId } = await setupOwnerWithListing(t);

  const { bookingId } = await t.mutation(api.bookings.create, {
    listingId,
    startDate: "2099-05-01",
    endDate: "2099-05-03",
    guestCount: 2,
    guest: GUEST,
  });
  await asOwner.mutation(api.bookings.updateStatus, { bookingId, newStatus: "confirmed" });
  await asOwner.mutation(api.bookings.updateStatus, { bookingId, newStatus: "cancelled" });

  const blocks = await t.run(async (ctx) =>
    ctx.db
      .query("availabilityBlocks")
      .withIndex("by_listingId", (q) => q.eq("listingId", listingId))
      .collect(),
  );
  expect(blocks).toHaveLength(0);

  // Dates should be bookable again.
  const rebooked = await t.mutation(api.bookings.create, {
    listingId,
    startDate: "2099-05-01",
    endDate: "2099-05-03",
    guestCount: 2,
    guest: GUEST,
  });
  expect(rebooked.referenceNumber).toMatch(/^YHWH-/);
});

test("guest lookup only returns a booking when the email matches", async () => {
  const t = convexTest(schema);
  const { listingId } = await setupOwnerWithListing(t);

  const { referenceNumber } = await t.mutation(api.bookings.create, {
    listingId,
    startDate: "2099-06-01",
    endDate: "2099-06-03",
    guestCount: 2,
    guest: GUEST,
  });

  const wrongEmail = await t.query(api.bookings.lookupByReferenceAndEmail, {
    referenceNumber,
    email: "someoneelse@test.local",
  });
  expect(wrongEmail).toBeNull();

  const correct = await t.query(api.bookings.lookupByReferenceAndEmail, {
    referenceNumber,
    email: GUEST.email,
  });
  expect(correct?.booking.referenceNumber).toBe(referenceNumber);
});

test("tour bookings are priced per head, not per night", async () => {
  const t = convexTest(schema);
  const { listingId } = await setupOwnerWithTourListing(t);

  const result = await t.mutation(api.bookings.create, {
    listingId,
    startDate: "2099-07-01",
    endDate: "2099-07-02",
    guestCount: 3,
    guest: GUEST,
  });

  expect(result.totalCentavos).toBe(50000 * 3);
});

test("tour bookings below the minimum pax are rejected", async () => {
  const t = convexTest(schema);
  const { listingId } = await setupOwnerWithTourListing(t);

  await expect(
    t.mutation(api.bookings.create, {
      listingId,
      startDate: "2099-07-10",
      endDate: "2099-07-11",
      guestCount: 1,
      guest: GUEST,
    }),
  ).rejects.toThrow(/at least 2 guests/);
});

test("tour bookings must span exactly one day", async () => {
  const t = convexTest(schema);
  const { listingId } = await setupOwnerWithTourListing(t);

  await expect(
    t.mutation(api.bookings.create, {
      listingId,
      startDate: "2099-07-15",
      endDate: "2099-07-17",
      guestCount: 3,
      guest: GUEST,
    }),
  ).rejects.toThrow(/single day/);
});
