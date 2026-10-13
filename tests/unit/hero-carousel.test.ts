import { describe, expect, it } from "vitest";
import { homeHeroSlides, productHeroSlides, withHeroActions } from "@/features/public-site/hero-content";

describe("banking hero collections", () => {
  it("provides two distinct photographs for every requested banking section", () => {
    const collections = [
      homeHeroSlides,
      productHeroSlides.checking,
      productHeroSlides.savings,
      productHeroSlides["credit-cards"],
      productHeroSlides.mortgage,
      productHeroSlides["auto-financing"],
      productHeroSlides.investing,
      productHeroSlides.education,
      productHeroSlides.security,
    ];
    expect(collections.every((slides) => slides?.length === 2)).toBe(true);
    const paths = collections.flatMap((slides) => slides?.map((slide) => slide.image) ?? []);
    expect(new Set(paths).size).toBe(18);
  });

  it("keeps authentication-aware actions consistent across every slide", () => {
    const slides = withHeroActions(productHeroSlides.checking!, [
      { label: "View My Accounts", href: "/dashboard#accounts" },
      { label: "My Profile", href: "/settings", variant: "secondary" },
    ]);
    expect(slides).toHaveLength(2);
    expect(slides.every((slide) => slide.actions[0]?.href === "/dashboard#accounts")).toBe(true);
    expect(slides.every((slide) => slide.actions[1]?.href === "/settings")).toBe(true);
  });
});
