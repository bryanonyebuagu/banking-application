import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.setTimeout(60000);

const widths = [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920];
const publicRoutes = ["/checking","/savings","/credit-cards","/mortgage","/auto-financing","/investing","/education","/business-banking","/commercial","/wealth-management","/security","/help-center","/faq","/contact"];

test("hosted demo does not expose local component tools", async ({ page }) => {
  await page.goto("http://127.0.0.1:3001/");
  await expect(page.getByRole("link", { name: "Component preview" })).toHaveCount(0);
  const response = await page.goto("http://127.0.0.1:3001/foundation");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

for (const width of widths) {
  test(`foundation renders and operates at ${width}px`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(`${message.text()} (${message.location().url})`); });
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/", "/checking", "/foundation"]) {
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      await expect(page.locator("h1")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      const a11y = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      expect(a11y.violations).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath(`${route === "/" ? "home" : route === "/foundation" ? "components" : "checking"}-${width}.png`), fullPage: true });
    }
    if (width < 640) {
      await page.getByRole("button", { name: "Menu", exact: true }).click();
      await expect(page.getByRole("dialog", { name: "Navigation" })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("button", { name: "Menu", exact: true })).toBeFocused();
    }
    await page.getByRole("button", { name: "Open dialog", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Example dialog" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Open dialog", exact: true })).toBeFocused();
    expect(errors).toEqual([]);
  });
}

test("preview controls have real, accessible behavior", async ({ page }) => {
  await page.goto("/foundation");
  await page.getByRole("button", { name: "Validate preview" }).click();
  await expect(page.getByText("Enter at least 2 characters.")).toBeVisible();
  await expect(page.getByLabel("Example nickname")).toBeFocused();
  await page.getByLabel("Example nickname").fill("Test nickname");
  await page.getByRole("button", { name: "Validate preview" }).click();
  await expect(page.getByText("Preview accepted: Test nickname. Nothing was saved.")).toBeVisible();
  await page.getByLabel("Example account type").selectOption("savings");
  await expect(page.getByLabel("Example account type")).toHaveValue("savings");
  await page.getByLabel("Example preference").check();
  await expect(page.getByLabel("Example preference")).toBeChecked();
  await page.getByLabel("Comfortable", { exact: true }).check();
  await expect(page.getByLabel("Comfortable", { exact: true })).toBeChecked();
  await page.getByRole("button", { name: "Show notification" }).click();
  await expect(page.getByText("Preview notification shown.")).toBeVisible();
  await page.getByRole("button", { name: "Dismiss" }).click();
  await expect(page.getByText("Preview notification shown.")).toBeHidden();
  await page.getByRole("tab", { name: "Empty", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Loading", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Page 2 of 2")).toBeVisible();
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Previous", exact: true }).click();
  await expect(page.getByText("Page 1 of 2")).toBeVisible();
  await page.getByRole("button", { name: "Open drawer", exact: true }).click();
  await page.getByRole("dialog", { name: "Example drawer" }).getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.getByRole("button", { name: "Open drawer", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Open dialog", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Example dialog" });
  await dialog.getByRole("button", { name: "Done", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Close Example dialog" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "Done", exact: true })).toBeFocused();
  await dialog.getByRole("button", { name: "Done", exact: true }).click();
});

test("complete public navigation is reachable and honest about availability", async ({ page, request }) => {
  for (const route of publicRoutes) {
    const response = await request.get(route);
    expect(response.status(), route).toBe(200);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Audience navigation" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Product navigation" })).toBeVisible();
  await page.getByRole("link", { name: "Checking", exact: true }).first().click();
  await expect(page).toHaveURL(/\/checking$/);
  await expect(page.getByText("Checking accounts become available in Phase 7.")).toBeVisible();
  await page.setViewportSize({ width: 320, height: 800 });
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "Navigation" });
  await expect(drawer.getByRole("link", { name: "Wealth Management" })).toBeVisible();
  await expect(drawer.getByRole("link", { name: "Help" })).toBeVisible();
});

test("routes, anchors, error page and baseline headers", async ({ page, request }) => {
  await page.goto("/");
  const links = await page.locator("a[href]").evaluateAll((elements) => elements.map((element) => element.getAttribute("href")!));
  for (const href of new Set(links)) {
    const url = new URL(href, "http://127.0.0.1:3000");
    const response = await request.get(url.pathname);
    expect(response.status()).toBe(200);
    if (url.hash) await expect(page.locator(url.hash)).toHaveCount(1);
  }
  const response = await request.get("/");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
  const missing = await page.goto("/this-route-does-not-exist");
  expect(missing?.status()).toBe(404);
  await page.getByRole("link", { name: "Return home" }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3000/");
});
