import type { MutationCtx } from "../_generated/server";

// Excludes 0/O/1/I to avoid guest transcription errors.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export async function generateUniqueReferenceNumber(ctx: MutationCtx): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const suffix = Array.from({ length: 6 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");
    const candidate = `YHWH-${suffix}`;
    const existing = await ctx.db
      .query("bookings")
      .withIndex("by_referenceNumber", (q) => q.eq("referenceNumber", candidate))
      .unique();
    if (!existing) return candidate;
  }
  throw new Error("Could not generate a unique reference number, please retry");
}
