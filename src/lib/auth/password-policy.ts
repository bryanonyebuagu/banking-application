import { z } from "zod";

export const PASSWORD_REQUIREMENT =
  "Use 10–128 characters with uppercase and lowercase letters, a number and a symbol.";

export const passwordSchema = z.string()
  .min(10, "Use at least 10 characters.")
  .max(128, "Use no more than 128 characters.")
  .regex(/[a-z]/, "Include a lowercase letter.")
  .regex(/[A-Z]/, "Include an uppercase letter.")
  .regex(/[0-9]/, "Include a number.")
  .regex(/[^A-Za-z0-9]/, "Include a symbol.");
