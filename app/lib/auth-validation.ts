import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Enter a valid email address." }));

export const passwordSchema = z.string().min(8, { error: "Password must be at least 8 characters." });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: "Enter your password." }),
});

export const signupSchema = z.object({
  name: z.string().trim().min(1, { error: "Enter your name." }),
  email: emailSchema,
  password: passwordSchema,
});

export function firstIssueMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "Check the form and try again.";
}
