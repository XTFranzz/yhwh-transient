/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as availability from "../availability.js";
import type * as bookings from "../bookings.js";
import type * as bootstrap from "../bootstrap.js";
import type * as dashboard from "../dashboard.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_availabilityHelpers from "../lib/availabilityHelpers.js";
import type * as lib_dateRanges from "../lib/dateRanges.js";
import type * as lib_referenceNumber from "../lib/referenceNumber.js";
import type * as lib_slug from "../lib/slug.js";
import type * as listings from "../listings.js";
import type * as payments from "../payments.js";
import type * as seed from "../seed.js";
import type * as staff from "../staff.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  availability: typeof availability;
  bookings: typeof bookings;
  bootstrap: typeof bootstrap;
  dashboard: typeof dashboard;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/availabilityHelpers": typeof lib_availabilityHelpers;
  "lib/dateRanges": typeof lib_dateRanges;
  "lib/referenceNumber": typeof lib_referenceNumber;
  "lib/slug": typeof lib_slug;
  listings: typeof listings;
  payments: typeof payments;
  seed: typeof seed;
  staff: typeof staff;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
