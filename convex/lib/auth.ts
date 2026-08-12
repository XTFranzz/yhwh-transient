import { getAuthUserId } from "@convex-dev/auth/server";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export type StaffRole = "staff" | "admin" | "superadmin";

// Reusable role sets for requireRole() call sites, so the tier definitions
// live in one place: staff handles day-to-day work (reservations, inquiries,
// payments); admin adds listings management; superadmin adds staff accounts.
export const ANY_STAFF: StaffRole[] = ["staff", "admin", "superadmin"];
export const ADMIN_UP: StaffRole[] = ["admin", "superadmin"];
export const SUPERADMIN_ONLY: StaffRole[] = ["superadmin"];

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
