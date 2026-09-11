import { v } from "convex/values";

export const moodValidator = v.union(
  v.literal("cozy"),
  v.literal("adventure"),
  v.literal("silly"),
  v.literal("romantic"),
  v.literal("grateful"),
  v.literal("wild"),
);

export const themeValidator = v.union(
  v.literal("ocean"),
  v.literal("sunset"),
  v.literal("forest"),
  v.literal("midnight"),
);
