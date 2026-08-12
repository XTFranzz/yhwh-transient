import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

async function setupOwnerWithListing(t: ReturnType<typeof convexTest>) {
  const userId = await t.run(async (ctx) => ctx.db.insert("users", { email: "owner@test.local" }));
  await t.run(async (ctx) =>
    ctx.db.insert("staffProfiles", { userId, displayName: "Owner", role: "superadmin", isActive: true }),
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
    ctx.db.insert("staffProfiles", { userId, displayName: "Owner", role: "superadmin", isActive: true }),
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

const CUSTOMER = { fullName: "Jane Customer", email: "jane@test.local", phone: "09170000000" };

test("rejects a booking that overlaps an existing one for the same listing", async () => {
  const t = convexTest(schema);
  const { asOwner, listingId } = await setupOwnerWithListing(t);

  await asOwner.mutation(api.bookings.createByStaff, {
    listingId,
    startDate: "2099-01-10",
    endDate: "2099-01-12",
    guestCount: 2,
    customer: CUSTOMER,
  });

  await expect(
    asOwner.mutation(api.bookings.createByStaff, {
      listingId,
      startDate: "2099-01-11",
      endDate: "2099-01-13",
      guestCount: 2,
      customer: CUSTOMER,
    }),
  ).rejects.toThrow(/no longer available/);
});

test("allows a back-to-back booking that starts the day another ends", async () => {
  const t = convexTest(schema);
  const { asOwner, listingId } = await setupOwnerWithListing(t);

  await asOwner.mutation(api.bookings.createByStaff, {
    listingId,
    startDate: "2099-02-01",
    endDate: "2099-02-03",
    guestCount: 2,
    customer: CUSTOMER,
  });

  const second = await asOwner.mutation(api.bookings.createByStaff, {
    listingId,
    startDate: "2099-02-03",
    endDate: "2099-02-05",
    guestCount: 2,
    customer: CUSTOMER,
  });
  expect(second.referenceNumber).toMatch(/^YHWH-/);
});

test("staff recording a payment confirms a pending booking", async () => {
  const t = convexTest(schema);
  const { asOwner, listingId } = await setupOwnerWithListing(t);

  const { bookingId } = await asOwner.mutation(api.bookings.createByStaff, {
    listingId,
    startDate: "2099-03-01",
    endDate: "2099-03-03",
    guestCount: 2,
    customer: CUSTOMER,
  });

  let booking = await t.run(async (ctx) => ctx.db.get(bookingId));
  expect(booking?.status).toBe("pending_payment");

  await asOwner.mutation(api.payments.recordByStaff, { bookingId, amountCentavos: 200000, method: "gcash" });

  booking = await t.run(async (ctx) => ctx.db.get(bookingId));
  expect(booking?.status).toBe("confirmed");
});

test("a partial payment leaves the booking pending; a second payment reaching the total confirms it", async () => {
  const t = convexTest(schema);
  const { asOwner, listingId } = await setupOwnerWithListing(t);

  const { bookingId } = await asOwner.mutation(api.bookings.createByStaff, {
    listingId,
    startDate: "2099-03-10",
    endDate: "2099-03-12",
    guestCount: 2,
    customer: CUSTOMER,
  });

  await asOwner.mutation(api.payments.recordByStaff, { bookingId, amountCentavos: 100000, method: "cash" });
  let booking = await t.run(async (ctx) => ctx.db.get(bookingId));
  expect(booking?.status).toBe("pending_payment");

  await asOwner.mutation(api.payments.recordByStaff, { bookingId, amountCentavos: 100000, method: "cash" });
  booking = await t.run(async (ctx) => ctx.db.get(bookingId));
  expect(booking?.status).toBe("confirmed");
});

test("a cash payment can exceed the remaining balance (absorbed as a tip) and still confirms", async () => {
  const t = convexTest(schema);
  const { asOwner, listingId } = await setupOwnerWithListing(t);

  const { bookingId } = await asOwner.mutation(api.bookings.createByStaff, {
    listingId,
    startDate: "2099-03-15",
    endDate: "2099-03-17",
    guestCount: 2,
    customer: CUSTOMER,
  });

  await asOwner.mutation(api.payments.recordByStaff, { bookingId, amountCentavos: 250000, method: "cash" });
  const booking = await t.run(async (ctx) => ctx.db.get(bookingId));
  expect(booking?.status).toBe("confirmed");
});

test("a gcash payment exceeding the remaining balance is rejected", async () => {
  const t = convexTest(schema);
  const { asOwner, listingId } = await setupOwnerWithListing(t);

  const { bookingId } = await asOwner.mutation(api.bookings.createByStaff, {
    listingId,
    startDate: "2099-03-20",
    endDate: "2099-03-22",
    guestCount: 2,
    customer: CUSTOMER,
  });

  await expect(
    asOwner.mutation(api.payments.recordByStaff, { bookingId, amountCentavos: 250000, method: "gcash" }),
  ).rejects.toThrow(/exceeds remaining balance/);
});

test("verify/reject still work on legacy submitted payments", async () => {
  const t = convexTest(schema);
  const { asOwner, listingId } = await setupOwnerWithListing(t);

  const { bookingId: bookingIdA } = await asOwner.mutation(api.bookings.createByStaff, {
    listingId,
    startDate: "2099-04-01",
    endDate: "2099-04-03",
    guestCount: 2,
    customer: CUSTOMER,
  });
  const paymentIdA = await t.run(async (ctx) =>
    ctx.db.insert("payments", { bookingId: bookingIdA, amountCentavos: 200000, method: "gcash", status: "submitted" }),
  );
  await asOwner.mutation(api.payments.verify, { paymentId: paymentIdA });
  const bookingA = await t.run(async (ctx) => ctx.db.get(bookingIdA));
  expect(bookingA?.status).toBe("confirmed");

  const { bookingId: bookingIdB } = await asOwner.mutation(api.bookings.createByStaff, {
    listingId,
    startDate: "2099-04-10",
    endDate: "2099-04-12",
    guestCount: 2,
    customer: CUSTOMER,
  });
  const paymentIdB = await t.run(async (ctx) =>
    ctx.db.insert("payments", { bookingId: bookingIdB, amountCentavos: 200000, method: "gcash", status: "submitted" }),
  );
  await asOwner.mutation(api.payments.reject, { paymentId: paymentIdB, reason: "Amount mismatch" });
  const bookingB = await t.run(async (ctx) => ctx.db.get(bookingIdB));
  expect(bookingB?.status).toBe("pending_payment");
  const paymentB = await t.run(async (ctx) => ctx.db.get(paymentIdB));
  expect(paymentB?.status).toBe("rejected");
  expect(paymentB?.rejectionReason).toBe("Amount mismatch");
});

test("cancelling a confirmed booking releases its availability block", async () => {
  const t = convexTest(schema);
  const { asOwner, listingId } = await setupOwnerWithListing(t);

  const { bookingId } = await asOwner.mutation(api.bookings.createByStaff, {
    listingId,
    startDate: "2099-05-01",
    endDate: "2099-05-03",
    guestCount: 2,
    customer: CUSTOMER,
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
  const rebooked = await asOwner.mutation(api.bookings.createByStaff, {
    listingId,
    startDate: "2099-05-01",
    endDate: "2099-05-03",
    guestCount: 2,
    customer: CUSTOMER,
  });
  expect(rebooked.referenceNumber).toMatch(/^YHWH-/);
});

test("guest lookup only returns a booking when the email matches", async () => {
  const t = convexTest(schema);
  const { asOwner, listingId } = await setupOwnerWithListing(t);

  const { referenceNumber } = await asOwner.mutation(api.bookings.createByStaff, {
    listingId,
    startDate: "2099-06-01",
    endDate: "2099-06-03",
    guestCount: 2,
    customer: CUSTOMER,
  });

  const wrongEmail = await t.query(api.bookings.lookupByReferenceAndEmail, {
    referenceNumber,
    email: "someoneelse@test.local",
  });
  expect(wrongEmail).toBeNull();

  const correct = await t.query(api.bookings.lookupByReferenceAndEmail, {
    referenceNumber,
    email: CUSTOMER.email,
  });
  expect(correct?.booking.referenceNumber).toBe(referenceNumber);
});

test("tour bookings are priced per head, not per night", async () => {
  const t = convexTest(schema);
  const { asOwner, listingId } = await setupOwnerWithTourListing(t);

  const result = await asOwner.mutation(api.bookings.createByStaff, {
    listingId,
    startDate: "2099-07-01",
    endDate: "2099-07-02",
    guestCount: 3,
    customer: CUSTOMER,
  });

  expect(result.totalCentavos).toBe(50000 * 3);
});

test("tour bookings below the minimum pax are rejected", async () => {
  const t = convexTest(schema);
  const { asOwner, listingId } = await setupOwnerWithTourListing(t);

  await expect(
    asOwner.mutation(api.bookings.createByStaff, {
      listingId,
      startDate: "2099-07-10",
      endDate: "2099-07-11",
      guestCount: 1,
      customer: CUSTOMER,
    }),
  ).rejects.toThrow(/at least 2 guests/);
});

test("tour bookings must span exactly one day", async () => {
  const t = convexTest(schema);
  const { asOwner, listingId } = await setupOwnerWithTourListing(t);

  await expect(
    asOwner.mutation(api.bookings.createByStaff, {
      listingId,
      startDate: "2099-07-15",
      endDate: "2099-07-17",
      guestCount: 3,
      customer: CUSTOMER,
    }),
  ).rejects.toThrow(/single day/);
});

test("staff manual booking without a recorded payment stays pending", async () => {
  const t = convexTest(schema);
  const { asOwner, listingId } = await setupOwnerWithListing(t);

  const result = await asOwner.mutation(api.bookings.createByStaff, {
    listingId,
    startDate: "2099-08-01",
    endDate: "2099-08-03",
    guestCount: 2,
    customer: CUSTOMER,
  });

  const booking = await t.run(async (ctx) => ctx.db.get(result.bookingId));
  expect(booking?.status).toBe("pending_payment");
  expect(booking?.source).toBe("admin_manual");
});

test("staff manual booking with a recorded cash payment confirms immediately", async () => {
  const t = convexTest(schema);
  const { asOwner, listingId } = await setupOwnerWithListing(t);

  const result = await asOwner.mutation(api.bookings.createByStaff, {
    listingId,
    startDate: "2099-08-10",
    endDate: "2099-08-12",
    guestCount: 2,
    customer: CUSTOMER,
    initialPayment: { amountCentavos: 200000, method: "cash" },
  });

  const booking = await t.run(async (ctx) => ctx.db.get(result.bookingId));
  expect(booking?.status).toBe("confirmed");

  const payments = await t.run(async (ctx) =>
    ctx.db
      .query("payments")
      .withIndex("by_bookingId", (q) => q.eq("bookingId", result.bookingId))
      .collect(),
  );
  expect(payments).toHaveLength(1);
  expect(payments[0].status).toBe("verified");
  expect(payments[0].method).toBe("cash");
});

test("non-staff cannot create a manual booking", async () => {
  const t = convexTest(schema);
  const { listingId } = await setupOwnerWithListing(t);

  await expect(
    t.mutation(api.bookings.createByStaff, {
      listingId,
      startDate: "2099-08-20",
      endDate: "2099-08-22",
      guestCount: 2,
      customer: CUSTOMER,
    }),
  ).rejects.toThrow(/Forbidden|Not authenticated/);
});

test("anyone can submit an inquiry, and it does not block availability", async () => {
  const t = convexTest(schema);
  const { asOwner, listingId } = await setupOwnerWithListing(t);

  const inquiryId = await t.mutation(api.inquiries.create, {
    listingId,
    startDate: "2099-09-01",
    endDate: "2099-09-03",
    guestCount: 2,
    customer: CUSTOMER,
    notes: "Interested in a discount for a week-long stay.",
  });
  expect(inquiryId).toBeTruthy();

  // A real booking for the same overlapping dates still succeeds — inquiries
  // are informational only, per the "no blocking" decision.
  const booking = await asOwner.mutation(api.bookings.createByStaff, {
    listingId,
    startDate: "2099-09-01",
    endDate: "2099-09-03",
    guestCount: 2,
    customer: CUSTOMER,
  });
  expect(booking.referenceNumber).toMatch(/^YHWH-/);
});

test("non-staff cannot list or convert inquiries", async () => {
  const t = convexTest(schema);
  const { listingId } = await setupOwnerWithListing(t);

  const inquiryId = await t.mutation(api.inquiries.create, {
    listingId,
    startDate: "2099-09-10",
    endDate: "2099-09-12",
    guestCount: 2,
    customer: CUSTOMER,
  });

  await expect(t.query(api.inquiries.listForStaff, {})).rejects.toThrow(/Forbidden|Not authenticated/);
  await expect(
    t.mutation(api.inquiries.convertToBooking, {
      inquiryId,
      startDate: "2099-09-10",
      endDate: "2099-09-12",
      guestCount: 2,
      customer: CUSTOMER,
    }),
  ).rejects.toThrow(/Forbidden|Not authenticated/);
});

test("converting an inquiry creates a confirmed booking (with payment) and marks it converted", async () => {
  const t = convexTest(schema);
  const { asOwner, listingId } = await setupOwnerWithListing(t);

  const inquiryId = await t.mutation(api.inquiries.create, {
    listingId,
    startDate: "2099-10-01",
    endDate: "2099-10-03",
    guestCount: 2,
    customer: CUSTOMER,
  });

  const result = await asOwner.mutation(api.inquiries.convertToBooking, {
    inquiryId,
    startDate: "2099-10-01",
    endDate: "2099-10-03",
    guestCount: 2,
    customer: CUSTOMER,
    initialPayment: { amountCentavos: 200000, method: "gcash" },
  });

  const booking = await t.run(async (ctx) => ctx.db.get(result.bookingId));
  expect(booking?.status).toBe("confirmed");

  const inquiry = await t.run(async (ctx) => ctx.db.get(inquiryId));
  expect(inquiry?.status).toBe("converted");
  expect(inquiry?.convertedBookingId).toBe(result.bookingId);
});

test("a declined inquiry can still be converted later if staff changes their mind", async () => {
  const t = convexTest(schema);
  const { asOwner, listingId } = await setupOwnerWithListing(t);

  const inquiryId = await t.mutation(api.inquiries.create, {
    listingId,
    startDate: "2099-10-10",
    endDate: "2099-10-12",
    guestCount: 2,
    customer: CUSTOMER,
  });
  await asOwner.mutation(api.inquiries.updateStatus, { inquiryId, status: "declined" });

  await expect(
    asOwner.mutation(api.inquiries.convertToBooking, {
      inquiryId,
      startDate: "2099-10-10",
      endDate: "2099-10-12",
      guestCount: 2,
      customer: CUSTOMER,
    }),
  ).resolves.toBeTruthy();
});

test("customers.create dedups by email+phone, not by name", async () => {
  const t = convexTest(schema);
  const { asOwner } = await setupOwnerWithListing(t);

  const first = await asOwner.mutation(api.customers.create, CUSTOMER);
  expect(first.created).toBe(true);

  const second = await asOwner.mutation(api.customers.create, CUSTOMER);
  expect(second.created).toBe(false);
  expect(second.customerId).toBe(first.customerId);

  // Same name, different contact info — a distinct person, distinct record.
  const namesake = await asOwner.mutation(api.customers.create, {
    fullName: CUSTOMER.fullName,
    email: "someoneelse@test.local",
    phone: "09171111111",
  });
  expect(namesake.customerId).not.toBe(first.customerId);
});

test("non-staff cannot search customers", async () => {
  const t = convexTest(schema);
  await expect(t.query(api.customers.search, { term: "jane" })).rejects.toThrow(/Forbidden|Not authenticated/);
});

test("customers.search matches by partial name, email, or phone", async () => {
  const t = convexTest(schema);
  const { asOwner } = await setupOwnerWithListing(t);
  await asOwner.mutation(api.customers.create, CUSTOMER);

  const byName = await asOwner.query(api.customers.search, { term: "jane" });
  expect(byName.some((c) => c.email === CUSTOMER.email)).toBe(true);

  const byEmail = await asOwner.query(api.customers.search, { term: "jane@test" });
  expect(byEmail.some((c) => c.email === CUSTOMER.email)).toBe(true);

  const byPhone = await asOwner.query(api.customers.search, { term: "0917000" });
  expect(byPhone.some((c) => c.email === CUSTOMER.email)).toBe(true);
});
