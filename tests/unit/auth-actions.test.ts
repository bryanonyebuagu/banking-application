import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  rpc: vi.fn(),
  sameOrigin: vi.fn(),
  redirect: vi.fn(() => { throw new Error("NEXT_REDIRECT"); }),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/config/server", () => ({ environment: { APP_ORIGIN: "https://bryobankerz.vercel.app" } }));
vi.mock("@/server/security/request", () => ({ requireSameOrigin: mocks.sameOrigin }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({
    auth: {
      signInWithPassword: mocks.signInWithPassword,
      signUp: mocks.signUp,
      signOut: mocks.signOut,
    },
    rpc: mocks.rpc,
  }),
}));

import { loginAction, signUpAction } from "@/server/auth/actions";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sameOrigin.mockResolvedValue(undefined);
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.rpc.mockResolvedValue({ data: "fixture", error: null });
});

describe("authentication form boundaries", () => {
  it("requires matching signup passwords before calling Supabase", async () => {
    const form = new FormData();
    form.set("firstName", "Taylor");
    form.set("lastName", "Morgan");
    form.set("email", "taylor@example.com");
    form.set("password", "SecurePass9!");
    form.set("confirmPassword", "DifferentPass9!");

    const result = await signUpAction({ status: "idle" }, form);

    expect(result.status).toBe("error");
    expect(result.fieldErrors?.confirmPassword).toEqual(["Passwords must match."]);
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it("normalizes email but preserves the exact signup password", async () => {
    const password = "  Exact9!Pass  ";
    const form = new FormData();
    form.set("firstName", "Taylor");
    form.set("lastName", "Morgan");
    form.set("email", " Taylor@Example.COM ");
    form.set("password", password);
    form.set("confirmPassword", password);
    mocks.signUp.mockResolvedValue({ data: { user: { id: "fixture" } }, error: null });

    const result = await signUpAction({ status: "idle" }, form);

    expect(result.status).toBe("success");
    expect(mocks.signUp).toHaveBeenCalledWith(expect.objectContaining({ email: "taylor@example.com", password }));
  });

  it("submits the exact login password and creates the application session", async () => {
    const password = " Exact9!Pass ";
    const form = new FormData();
    form.set("email", " Taylor@Example.COM ");
    form.set("password", password);
    mocks.signInWithPassword.mockResolvedValue({ data: { user: { id: "fixture" } }, error: null });

    await expect(loginAction({ status: "idle" }, form)).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.signInWithPassword).toHaveBeenCalledWith({ email: "taylor@example.com", password });
    expect(mocks.rpc).toHaveBeenNthCalledWith(1, "sync_current_session");
    expect(mocks.rpc).toHaveBeenNthCalledWith(2, "record_current_login_event", { p_event_type: "login" });
    expect(mocks.redirect).toHaveBeenCalledWith("/dashboard");
  });
});
