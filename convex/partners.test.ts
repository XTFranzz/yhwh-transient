import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

const APPLICATION = {
  fullName: "  Mario Santos ",
  email: "Mario@Example.com",
  phone: "09171112222",
  offering: "house" as const,
  location: "Brgy. Riverside, Town Proper",
  message: "  ",
};

test("anyone can apply; input is trimmed and starts as new", async () => {
  const t = convexTest(schema);
  await t.mutation(api.partners.submit, APPLICATION);

  const [saved] = await t.run(async (ctx) => ctx.db.query("partnerApplications").collect());
  expect(saved).toMatchObject({ fullName: "Mario Santos", email: "mario@example.com", status: "new" });
  expect(saved.message).toBeUndefined();
});

test("rejects a bad email or missing location", async () => {
  const t = convexTest(schema);
  await expect(t.mutation(api.partners.submit, { ...APPLICATION, email: "nope" })).rejects.toThrow(/valid email/);
  await expect(t.mutation(api.partners.submit, { ...APPLICATION, location: " " })).rejects.toThrow(/location/);
});

test("only admins can list and update applications", async () => {
  const t = convexTest(schema);
  await t.mutation(api.partners.submit, APPLICATION);
  const { staffId, adminId } = await t.run(async (ctx) => {
    const staffId = await ctx.db.insert("users", { email: "staff@test.local" });
    await ctx.db.insert("staffProfiles", { userId: staffId, displayName: "Staff", role: "staff", isActive: true });
    const adminId = await ctx.db.insert("users", { email: "admin@test.local" });
    await ctx.db.insert("staffProfiles", { userId: adminId, displayName: "Admin", role: "admin", isActive: true });
    return { staffId, adminId };
  });

  await expect(t.withIdentity({ subject: staffId }).query(api.partners.listForStaff, {})).rejects.toThrow(/Forbidden/);

  const asAdmin = t.withIdentity({ subject: adminId });
  const [app] = await asAdmin.query(api.partners.listForStaff, { status: "new" });
  await asAdmin.mutation(api.partners.updateStatus, { applicationId: app._id, status: "approved" });
  expect(await asAdmin.query(api.partners.listForStaff, { status: "new" })).toHaveLength(0);
});
