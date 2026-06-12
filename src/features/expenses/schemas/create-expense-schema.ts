import { z } from "zod";

export const splitPayloadEntrySchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().min(0),
  percentage: z.number().min(0).max(100).optional(),
});

export const createExpenseSchema = z.object({
  groupId: z.string().uuid(),
  title: z
    .string()
    .trim()
    .min(2, "Title must be at least 2 characters.")
    .max(120, "Title must be 120 characters or less."),
  amount: z.coerce.number().gt(0, "Amount must be greater than 0."),
  paidBy: z.string().uuid(),
  notes: z
    .string()
    .trim()
    .max(500, "Notes must be 500 characters or less.")
    .optional()
    .or(z.literal("")),
  splitType: z.enum(["equal", "percentage", "custom"]),
  splits: z.array(splitPayloadEntrySchema).min(1, "At least one split is required."),
});
