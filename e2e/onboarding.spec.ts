import { expect, test } from "@playwright/test";

// sign up -> onboarding -> create a brief -> see it listed -> sign out -> the sample plan is still open.
// The brief is created through the API with the page's own session: the brief form also starts a live plan run (model calls).
test("a new buyer signs up, onboards, saves a brief, signs out and still reads the sample plan", async ({ page }) => {
  const email = process.env.E2E_EMAIL ?? `e2e-${Date.now().toString(36)}@harborlight.test`;
  const password = process.env.E2E_PASSWORD ?? "correct horse battery staple";

  await page.goto("/signin");
  await page.getByTestId("signin-mode-switch").click(); // sign-in and sign-up share one page
  await page.getByTestId("signup-name").fill("Dana Whitfield");
  await page.getByTestId("signup-email").fill(email);
  await page.getByTestId("signup-password").fill(password);
  await page.getByTestId("signup-submit").click();

  await expect(page).toHaveURL(/\/app\/onboarding$/);
  await expect(page.getByTestId("auth-indicator")).toHaveAttribute("data-state", "signed-in");
  await expect(page.getByTestId("onboarding-step")).toHaveAttribute("data-step", "workspace");
  await page.getByTestId("onboarding-workspace-name").fill("Harbor Light Coffee");
  await page.getByTestId("onboarding-role-buyer").check();
  await page.getByTestId("onboarding-create-workspace").click();

  await expect(page.getByTestId("onboarding-step")).toHaveAttribute("data-step", "tools");
  await expect(page.getByTestId("auth-user")).toContainText("Harbor Light Coffee");
  await page.getByTestId("onboarding-tools-skip").click();
  await expect(page.getByTestId("onboarding-step")).toHaveAttribute("data-step", "first");
  await expect(page.getByTestId("onboarding-finish")).toBeDisabled(); // a buyer needs a brief (or skips)

  const made = await page.request.post("/api/briefs", {
    data: {
      brandName: "Harbor Light Coffee", audienceText: "people who love live stand-up and late-night food", loves: ["stand-up comedy specials"],
      budgetUsd: 6000, flightStart: "2026-12-01", flightWeeks: 4,
    },
  });
  expect(made.status()).toBe(200);
  await page.reload();
  await expect(page.getByTestId("onboarding-brief-item")).toHaveText("Harbor Light Coffee");
  await expect(page.getByTestId("onboarding-brief-count")).toContainText("1");
  await page.getByTestId("onboarding-finish").click();
  await expect(page.getByTestId("onboarding-done")).toBeVisible();

  await page.getByTestId("auth-sign-out").click();
  await expect(page).not.toHaveURL(/\/app(\/|$)/);
  await page.goto("/sample");
  await expect(page.getByTestId("auth-indicator")).toHaveAttribute("data-state", "signed-out");
  expect((await page.request.post("/api/briefs", { data: {} })).status()).toBe(401);

  // judges never hit a wall: the sample plan and its API stay readable signed out
  const plans = await page.request.get("/api/plans");
  expect(plans.status()).toBe(200);
  const sample = (await plans.json()).plans.find((p: { sample: boolean }) => p.sample);
  expect(sample, "the sample plan exists").toBeTruthy();
  expect((await page.request.get(`/api/plans/${sample.id}`)).status()).toBe(200);
  await page.goto("/sample");
  await expect(page.getByTestId("plan-view")).toBeVisible();
  await page.goto("/app");
  await expect(page).toHaveURL(/\/signin\?next=%2Fapp$/);

  // and the account signs back in; a visitor with a session skips the form and lands on ?next
  await page.goto("/signin?next=/app/new");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill(password);
  await page.getByTestId("signin-submit").click();
  await expect(page).toHaveURL(/\/app\/new$/);
  await expect(page.getByTestId("auth-indicator")).toHaveAttribute("data-state", "signed-in");
  await page.goto("/signin?next=https://evil.example/");
  await expect(page).toHaveURL(/\/app$/);
});
