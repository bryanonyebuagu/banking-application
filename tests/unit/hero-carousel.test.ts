import { describe, expect, it } from "vitest";
import { homeHeroSlides, productHeroSlides, withHeroActions } from "@/features/public-site/hero-content";

describe("banking hero collections", () => {
  it("provides at least three distinct photographs for every requested banking section", () => {
    const collections = [homeHeroSlides, ...Object.values(productHeroSlides)];
    expect(collections).toHaveLength(15);
    expect(collections.every((slides) => (slides?.length ?? 0) >= 3)).toBe(true);
    expect(collections.every((slides) => new Set(slides?.map((slide) => slide.image)).size === slides?.length)).toBe(true);
  });

  it("keeps authentication-aware actions consistent across every slide", () => {
    const slides = withHeroActions(productHeroSlides.checking!, [
      { label: "View My Accounts", href: "/dashboard#accounts" },
      { label: "My Profile", href: "/settings", variant: "secondary" },
    ]);
    expect(slides).toHaveLength(3);
    expect(slides.every((slide) => slide.actions[0]?.href === "/dashboard#accounts")).toBe(true);
    expect(slides.every((slide) => slide.actions[1]?.href === "/settings")).toBe(true);
  });
});
