import { expect, test } from "@playwright/test";

// Route protection in three states: signed out, a cookie that is present but not a valid session (expired or forged), and old
// links. Runs against any deployment (E2E_BASE_URL). No account is needed.
const cookieName = (base: string) => (base.startsWith("https") ? "__Secure-" : "") + "wallspace.session_token";

test("signed out: /app/* goes to /signin?next, the sample and public pages stay open", async ({ page, baseURL }) => {
  for (const path of ["/app", "/app/new", "/app/connections", "/app/owner", "/app/plans/plan-private", "/app/onboarding"]) {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`/signin\\?next=${encodeURIComponent(path)}$`));
    await expect(page.getByTestId("signin-page")).toBeVisible();
  }
  for (const path of ["/", "/limits", "/privacy", "/terms", "/sample", "/sample/run", "/sample/faces/ATL-0021", "/faces/ATL-0021"]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
    expect(new URL(page.url()).pathname, path).toBe(path);
  }
  await page.goto("/sample");
  await expect(page.getByTestId("plan-view")).toBeVisible();
  await expect(page.getByTestId("auth-indicator")).toHaveAttribute("data-state", "signed-out");
  await page.goto("/");
  await expect(page.getByTestId("landing-cta-start")).toHaveAttribute("href", "/signin");
  expect(baseURL).toBeTruthy();
});

test("old paths redirect permanently and keep the query", async ({ request }) => {
  const cases: [string, string][] = [
    ["/sign-in?next=/app/new", "/signin?next=%2Fapp%2Fnew"],
    ["/sign-up", "/signin?mode=sign-up"],
    ["/onboarding", "/app/onboarding"],
    ["/owner", "/app/owner"],
    ["/owner/faces/ATL-0101", "/faces/ATL-0101"],
    ["/app/plans/plan-sample", "/sample"],
    ["/app/plans/plan-sample/faces/ATL-0021", "/sample/faces/ATL-0021"],
    ["/app/runs/run-sample", "/sample/run"],
  ];
  for (const [from, to] of cases) {
    const res = await request.get(from, { maxRedirects: 0 });
    expect(res.status(), from).toBe(308);
    expect(res.headers()["location"], from).toContain(to);
  }
});

test("expired or forged cookie: the guard and the API refuse it", async ({ page, baseURL }) => {
  const url = new URL(baseURL ?? "http://localhost:3209");
  await page.context().addCookies([{ name: cookieName(url.origin), value: "expired.invalid-signature", domain: url.hostname, path: "/", secure: url.protocol === "https:", httpOnly: true }]);
  await page.goto("/app/new");
  await expect(page).toHaveURL(/\/signin\?next=%2Fapp%2Fnew$/);
  await expect(page.getByTestId("signin-page")).toBeVisible(); // no redirect loop: the form shows
  const briefs = await page.request.get("/api/briefs");
  expect(briefs.status()).toBe(401);
  expect(await briefs.json()).toMatchObject({ code: "unauthorized" });
  expect((await page.request.get("/api/plans/plan-sample")).status()).toBe(200);
  const me = await (await page.request.get("/api/me")).json();
  expect(me.user).toBeNull();
});
