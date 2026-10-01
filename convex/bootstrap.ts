import { v } from "convex/values";
import { createAccount } from "@convex-dev/auth/server";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

// One-time escape hatch for creating the very first superadmin login, before
// any staffProfiles exist (and therefore before anyone can use createStaffAccount).
// Run once via: npx convex run bootstrap:bootstrapFirstOwner '{"email":"...","password":"...","displayName":"..."}'
export const anyStaffExists = internalQuery({
  args: {},
  handler: async (ctx) => (await ctx.db.query("staffProfiles").first()) !== null,
});

export const bootstrapFirstOwner = action({
  args: { email: v.string(), password: v.string(), displayName: v.string() },
  handler: async (ctx, args): Promise<{ userId: string }> => {
    const alreadyBootstrapped = await ctx.runQuery(internal.bootstrap.anyStaffExists, {});
    if (alreadyBootstrapped) {
      throw new Error("Staff already exist; use staff.createStaffAccount (as superadmin) instead");
    }
    const { user } = await createAccount(ctx, {
      provider: "password",
      account: { id: args.email, secret: args.password },
      profile: { email: args.email, name: args.displayName },
    });
    await ctx.runMutation(internal.staff.attachProfile, {
      userId: user._id,
      displayName: args.displayName,
      role: "superadmin",
    });
    return { userId: user._id };
  },
});

// Temporary dev-only helper to wipe the single local staff/auth account so it
// can be re-bootstrapped with different credentials. Not wired to any route.
export const devResetStaff = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (const row of await ctx.db.query("staffProfiles").collect()) await ctx.db.delete(row._id);
    for (const row of await ctx.db.query("authAccounts").collect()) await ctx.db.delete(row._id);
    for (const row of await ctx.db.query("authSessions").collect()) await ctx.db.delete(row._id);
    for (const row of await ctx.db.query("users").collect()) await ctx.db.delete(row._id);
  },
});
