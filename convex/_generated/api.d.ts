/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as chat from "../chat.js";
import type * as couples from "../couples.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_codes from "../lib/codes.js";
import type * as lib_validators from "../lib/validators.js";
import type * as media from "../media.js";
import type * as mediaActions from "../mediaActions.js";
import type * as moments from "../moments.js";
import type * as presence from "../presence.js";
import type * as users from "../users.js";
import type * as wyr from "../wyr.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  chat: typeof chat;
  couples: typeof couples;
  "lib/auth": typeof lib_auth;
  "lib/codes": typeof lib_codes;
  "lib/validators": typeof lib_validators;
  media: typeof media;
  mediaActions: typeof mediaActions;
  moments: typeof moments;
  presence: typeof presence;
  users: typeof users;
  wyr: typeof wyr;
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
