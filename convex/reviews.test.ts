import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import { maskBookingName, shortReviewName } from "./reviews";

afterEach(() => {
  vi.useRealTimers();
});

async function setup(t: ReturnType<typeof convexTest>, bookingStatus: "confirmed" | "checked_out" = "checked_out") {
  return t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { email: "owner@test.local" });
    await ctx.db.insert("staffProfiles", { userId, displayName: "Owner", role: "superadmin", isActive: true });
    const listingId = await ctx.db.insert("listings", {
      type: "house",
      slug: "malaya-villa",
      title: "Malaya Villa",
      description: "A villa.",
      basePriceCentavos: 100000,
      maxGuests: 4,
      status: "active",
      createdBy: userId,
    });
    await ctx.db.insert("houseDetails", {
      listingId,
      bedrooms: 2,
      bathrooms: 1,
      address: "123 Mabini St, Bacoor, Cavite",
      amenities: [],
      checkInTime: "14:00",
      checkOutTime: "11:00",
    });
    const customerId = await ctx.db.insert("customers", {
      fullName: "Rosa Maria Tan",
      email: "rosa@test.local",
      phone: "09170000000",
    });
    const bookingId = await ctx.db.insert("bookings", {
      referenceNumber: "YHWH-ABC123",
      listingId,
      customerId,
      startDate: "2099-01-10",
      endDate: "2099-01-11",
      guestCount: 2,
      totalCentavos: 100000,
      status: bookingStatus,
    });
    return { userId, listingId, bookingId };
  });
}

test("masks names for popups", () => {
  expect(maskBookingName("Rosa Maria Tan")).toBe("R*** T.");
  expect(maskBookingName("rosa")).toBe("R***");
  expect(shortReviewName("Rosa Maria Tan")).toBe("Rosa T.");
  expect(shortReviewName("  ")).toBe("A guest");
});

test("feed shows a recent booking with masked name, area and nights — and nothing private", async () => {
  const t = convexTest(schema);
  await setup(t, "confirmed");

  const feed = await t.query(api.reviews.feed, {});
  expect(feed.bookings).toHaveLength(1);
  expect(feed.bookings[0]).toMatchObject({
    name: "R*** T.",
    listingTitle: "Malaya Villa",
    subtitle: "Bacoor, Cavite · 1 night",
  });
  const json = JSON.stringify(feed);
  expect(json).not.toContain("YHWH-ABC123");
  expect(json).not.toContain("rosa@test.local");
  expect(json).not.toContain("Rosa Maria");
});

test("feed drops bookings older than 30 days and unconfirmed ones", async () => {
  vi.useFakeTimers();
  const t = convexTest(schema);
  await setup(t, "confirmed");
  await t.run(async (ctx) => {
    const booking = await ctx.db.query("bookings").first();
    const pending = { ...booking!, referenceNumber: "YHWH-PEND01", status: "pending_payment" as const };
    const { _id, _creationTime, ...fields } = pending;
    await ctx.db.insert("bookings", fields);
  });

  expect((await t.query(api.reviews.feed, {})).bookings).toHaveLength(1);
  vi.setSystemTime(Date.now() + 31 * 24 * 60 * 60 * 1000);
  expect((await t.query(api.reviews.feed, {})).bookings).toHaveLength(0);
});

test("guest review needs the matching email and a finished stay, then waits for approval", async () => {
  const t = convexTest(schema);
  const { userId } = await setup(t, "confirmed");
  const review = { referenceNumber: "yhwh-abc123", rating: 5, comment: "Lovely place!" };

  await expect(t.mutation(api.reviews.submitByGuest, { ...review, email: "rosa@test.local" })).rejects.toThrow(
    /after your stay/,
  );
  await t.run(async (ctx) => {
    const booking = await ctx.db.query("bookings").first();
    await ctx.db.patch(booking!._id, { status: "checked_out" });
  });
  await expect(t.mutation(api.reviews.submitByGuest, { ...review, email: "someone@else.local" })).rejects.toThrow(
    /not found/,
  );

  await t.mutation(api.reviews.submitByGuest, { ...review, email: "ROSA@test.local" });
  await expect(t.mutation(api.reviews.submitByGuest, { ...review, email: "rosa@test.local" })).rejects.toThrow(
    /already reviewed/,
  );

  // Pending reviews never reach the public popups.
  expect((await t.query(api.reviews.feed, {})).reviews).toHaveLength(0);

  const asOwner = t.withIdentity({ subject: userId });
  const [pending] = await asOwner.query(api.reviews.listForStaff, { status: "pending" });
  await asOwner.mutation(api.reviews.setStatus, { reviewId: pending._id, status: "approved" });

  const { reviews } = await t.query(api.reviews.feed, {});
  expect(reviews).toHaveLength(1);
  expect(reviews[0]).toMatchObject({ name: "Rosa T.", rating: 5, comment: "Lovely place!" });
});

test("staff-added reviews go live immediately; only staff can add them", async () => {
  const t = convexTest(schema);
  const { userId, listingId } = await setup(t);
  const input = { listingId, guestName: "Ben Cruz", rating: 4, comment: "Clean and quiet." };

  await expect(t.mutation(api.reviews.createByStaff, input)).rejects.toThrow(/Forbidden/);
  await expect(
    t.withIdentity({ subject: userId }).mutation(api.reviews.createByStaff, { ...input, rating: 6 }),
  ).rejects.toThrow(/1 to 5/);

  await t.withIdentity({ subject: userId }).mutation(api.reviews.createByStaff, input);
  const { reviews } = await t.query(api.reviews.feed, {});
  expect(reviews[0]).toMatchObject({ name: "Ben C.", rating: 4 });
});
