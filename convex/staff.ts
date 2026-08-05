import { v } from "convex/values";
import { createAccount } from "@convex-dev/auth/server";
import { action, internalMutation, mutation, query } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { currentStaffProfile, requireRole } from "./lib/auth";

const staffRole = v.union(v.literal("owner_admin"), v.literal("front_desk"), v.literal("housekeeping"));

// Used by the frontend route guard to resolve the logged-in staff member's role.
export const me = query({
  args: {},
  handler: async (ctx) => currentStaffProfile(ctx),
});

export const listStaff = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["owner_admin"]);
    return ctx.db.query("staffProfiles").collect();
  },
});

export const attachProfile = internalMutation({
  args: { userId: v.id("users"), displayName: v.string(), role: staffRole },
  handler: async (ctx, args) => {
    return ctx.db.insert("staffProfiles", {
      userId: args.userId,
      displayName: args.displayName,
      role: args.role,
      isActive: true,
    });
  },
});

// No self-registration: only an active owner_admin can provision new staff logins.
// Password hashing happens inside Convex Auth's own createAccount call, which
// requires action context, so this can't be a plain mutation.
export const createStaffAccount = action({
  args: { email: v.string(), password: v.string(), displayName: v.string(), role: staffRole },
  handler: async (ctx, args): Promise<{ userId: string }> => {
    const requester = await ctx.runQuery(api.staff.me, {});
    if (!requester || !requester.isActive || requester.role !== "owner_admin") {
      throw new Error("Forbidden");
    }
    const { user } = await createAccount(ctx, {
      provider: "password",
      account: { id: args.email, secret: args.password },
      profile: { email: args.email, name: args.displayName },
    });
    await ctx.runMutation(internal.staff.attachProfile, {
      userId: user._id,
      displayName: args.displayName,
      role: args.role,
    });
    return { userId: user._id };
  },
});

export const updateStaffRole = mutation({
  args: { staffProfileId: v.id("staffProfiles"), role: staffRole },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["owner_admin"]);
    await ctx.db.patch(args.staffProfileId, { role: args.role });
  },
});

export const setActive = mutation({
  args: { staffProfileId: v.id("staffProfiles"), isActive: v.boolean() },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["owner_admin"]);
    await ctx.db.patch(args.staffProfileId, { isActive: args.isActive });
  },
});
