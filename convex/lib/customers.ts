import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

export interface CustomerInput {
  fullName: string;
  email: string;
  phone: string;
}

// Customers are matched by (email, phone), never by name — two different
// people can share a name, so name is never used to dedup. On a match, only
// fullName is refreshed (in case it was mistyped previously).
export async function findOrCreateCustomer(
  ctx: MutationCtx,
  customer: CustomerInput,
): Promise<{ customerId: Id<"customers">; created: boolean }> {
  const existing = await ctx.db
    .query("customers")
    .withIndex("by_email_phone", (q) => q.eq("email", customer.email).eq("phone", customer.phone))
    .unique();
  if (existing) {
    await ctx.db.patch(existing._id, { fullName: customer.fullName });
    return { customerId: existing._id, created: false };
  }
  const customerId = await ctx.db.insert("customers", customer);
  return { customerId, created: true };
}
