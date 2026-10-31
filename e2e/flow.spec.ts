import { expect, test } from "@playwright/test";

// The main flow, clicked end to end: /signin (sign-up) -> onboarding -> new brief -> run -> plan page -> sign out -> /sample.
// Starts a REAL plan run (Token Factory calls cost a few cents), so it only runs with E2E_RUN_BRIEF=1.
test.skip(!process.env.E2E_RUN_BRIEF, "set E2E_RUN_BRIEF=1 to start a real plan run");

test("sign up, onboard, run a brief, open its plan, sign out, the sample still opens", async ({ page }) => {
  test.setTimeout(660_000);
  const email = process.env.E2E_EMAIL ?? `flow-${Date.now().toString(36)}@harborlight.test`;
  await page.goto("/signin");
  await page.getByTestId("signin-mode-switch").click();
  await page.getByTestId("signup-name").fill("Dana Whitfield");
  await page.getByTestId("signup-email").fill(email);
  await page.getByTestId("signup-password").fill("correct horse battery staple");
  await page.getByTestId("signup-submit").click();

  await expect(page).toHaveURL(/\/app\/onboarding$/);
  await page.getByTestId("onboarding-workspace-name").fill("Harbor Light Coffee");
  await page.getByTestId("onboarding-create-workspace").click();
  await page.getByTestId("onboarding-tools-skip").click();
  await expect(page.getByTestId("onboarding-step")).toHaveAttribute("data-step", "first");

  await page.getByTestId("onboarding-brief-link").click();
  await expect(page).toHaveURL(/\/app\/new$/);
  await page.getByTestId("preset-sample").click();
  await page.getByTestId("brief-brand").fill("Harbor Light Coffee");
  await page.getByTestId("brief-submit").click();

  await expect(page).toHaveURL(/\/app\/runs\/run-/);
  await expect(page.getByTestId("run-phase")).toHaveAttribute("data-phase", "done", { timeout: 600_000 });
  await page.getByTestId("run-open-plan").click();
  await expect(page).toHaveURL(/\/app\/plans\/plan-/);
  await expect(page.getByTestId("plan-view")).toBeVisible();

  await page.getByTestId("auth-sign-out").click();
  await expect(page).not.toHaveURL(/\/app(\/|$)/);
  await page.goto("/sample");
  await expect(page.getByTestId("plan-view")).toBeVisible();
  await expect(page.getByTestId("auth-indicator")).toHaveAttribute("data-state", "signed-out");
});
