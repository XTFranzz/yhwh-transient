import { getAuthUserId } from "@convex-dev/auth/server";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export type StaffRole = "owner_admin" | "front_desk" | "housekeeping";

export async function currentStaffProfile(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  return ctx.db
    .query("staffProfiles")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
}

export async function requireRole(ctx: QueryCtx | MutationCtx, roles: StaffRole[]) {
  const profile = await currentStaffProfile(ctx);
  if (!profile || !profile.isActive || !roles.includes(profile.role)) {
    throw new Error("Forbidden");
  }
  return profile;
}
