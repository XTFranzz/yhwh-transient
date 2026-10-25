import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireRole, ADMIN_UP } from "./lib/auth";

const offering = v.union(v.literal("house"), v.literal("vehicle"), v.literal("tour"), v.literal("other"));
const applicationStatus = v.union(
  v.literal("new"),
  v.literal("contacted"),
  v.literal("approved"),
  v.literal("declined"),
);

const MAX_MESSAGE_LENGTH = 1000;

// Public: the "Be a Partner" form.
export const submit = mutation({
  args: {
    fullName: v.string(),
    email: v.string(),
    phone: v.string(),
    offering,
    location: v.string(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const fullName = args.fullName.trim();
    const email = args.email.trim().toLowerCase();
    const phone = args.phone.trim();
    const location = args.location.trim();
    const message = args.message?.trim() || undefined;
    if (!fullName || !phone || !location) throw new Error("Please fill in your name, phone, and location");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Please enter a valid email");
    if (message && message.length > MAX_MESSAGE_LENGTH) {
      throw new Error(`Message must be ${MAX_MESSAGE_LENGTH} characters or less`);
    }
    await ctx.db.insert("partnerApplications", {
      fullName,
      email,
      phone,
      offering: args.offering,
      location,
      message,
      status: "new",
    });
  },
});

// Staff (admin+, same tier as listings management): applications, newest first.
export const listForStaff = query({
  args: { status: v.optional(applicationStatus) },
  handler: async (ctx, args) => {
    await requireRole(ctx, ADMIN_UP);
    if (args.status) {
      return ctx.db
        .query("partnerApplications")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    }
    return ctx.db.query("partnerApplications").order("desc").collect();
  },
});

export const updateStatus = mutation({
  args: { applicationId: v.id("partnerApplications"), status: applicationStatus },
  handler: async (ctx, args) => {
    await requireRole(ctx, ADMIN_UP);
    if (!(await ctx.db.get(args.applicationId))) throw new Error("Application not found");
    await ctx.db.patch(args.applicationId, { status: args.status });
  },
});
