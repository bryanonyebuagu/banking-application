import { describe, expect, it } from "vitest";
import { passwordSchema } from "@/lib/auth/password-policy";

describe("password policy", () => {
  it("accepts a strong password with exactly ten characters", () => {
    expect(passwordSchema.safeParse("Abcdef1!xy").success).toBe(true);
  });

  it.each([
    ["short passwords", "Abcd1!xy"],
    ["passwords without a lowercase letter", "ABCDEFG1!X"],
    ["passwords without an uppercase letter", "abcdefg1!x"],
    ["passwords without a number", "Abcdefgh!x"],
    ["passwords without a symbol", "Abcdefg12x"],
  ])("rejects %s", (_case, password) => {
    expect(passwordSchema.safeParse(password).success).toBe(false);
  });
});
