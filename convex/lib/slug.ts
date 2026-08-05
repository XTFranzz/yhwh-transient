import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "listing"
  );
}

export async function ensureUniqueSlug(
  ctx: MutationCtx,
  base: string,
  excludeListingId?: Id<"listings">,
): Promise<string> {
  const baseSlug = slugify(base);
  let candidate = baseSlug;
  let suffix = 2;
  for (;;) {
    const existing = await ctx.db
      .query("listings")
      .withIndex("by_slug", (q) => q.eq("slug", candidate))
      .unique();
    if (!existing || existing._id === excludeListingId) return candidate;
    candidate = `${baseSlug}-${suffix++}`;
  }
}
