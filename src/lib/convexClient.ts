import { ConvexReactClient } from "convex/react";

const convexUrl = import.meta.env.VITE_CONVEX_URL as string;

if (!convexUrl) {
  throw new Error("VITE_CONVEX_URL is not set — run `npx convex dev` to generate .env.local");
}

export const convex = new ConvexReactClient(convexUrl);
