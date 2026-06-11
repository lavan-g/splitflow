import { z } from "zod";

import { GROUP_CODE_PATTERN } from "@/lib/constants/ids";

export const createGroupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Group name must be at least 2 characters.")
    .max(60, "Group name must be 60 characters or less."),
});

export const joinGroupSchema = z.object({
  groupCode: z
    .string()
    .trim()
    .toUpperCase()
    .refine((value) => GROUP_CODE_PATTERN.test(value), {
      message: "Enter a valid group code (GRP-XXXXXX).",
    }),
});

export const addMemberByUsernameSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Enter a valid username.")
    .max(20, "Enter a valid username.")
    .regex(/^[a-z0-9_]+$/, "Use letters, numbers, and underscores only."),
});
