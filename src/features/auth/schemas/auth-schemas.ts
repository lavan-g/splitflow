import { z } from "zod";

const gmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid Gmail address.")
  .refine((value) => value.endsWith("@gmail.com"), {
    message: "Enter a valid Gmail address.",
  });

export const signInSchema = z.object({
  email: gmailSchema,
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export const signUpSchema = z.object({
  fullName: z.string().min(2, "Full name is required."),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters.")
    .max(20, "Username must be 20 characters or less.")
    .regex(/^[a-zA-Z0-9_]+$/, "Use letters, numbers, and underscores only."),
  email: gmailSchema,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(72, "Password must be 72 characters or less."),
});

export const forgotPasswordSchema = z.object({
  email: gmailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(72, "Password must be 72 characters or less."),
    confirmPassword: z.string().min(1, "Please confirm your password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });
