// The route map in one place. Public: /, /signin, /sample (+ /sample/faces/:id, /sample/run), /faces/:id, /limits, /privacy, /terms.
// Product (protected): everything under /app. The sample plan always links inside /sample so a signed-out visitor never hits a sign-in wall.
export const SAMPLE_PLAN_ID = "plan-sample";
export const SAMPLE_RUN_ID = "run-sample";

export const planHref = (planId: string) => (planId === SAMPLE_PLAN_ID ? "/sample" : `/app/plans/${encodeURIComponent(planId)}`);
export const faceHref = (planId: string, faceId: string) =>
  planId === SAMPLE_PLAN_ID ? `/sample/faces/${encodeURIComponent(faceId)}` : `/app/plans/${encodeURIComponent(planId)}/faces/${encodeURIComponent(faceId)}`;
export const runHref = (runId: string) => (runId === SAMPLE_RUN_ID ? "/sample/run" : `/app/runs/${encodeURIComponent(runId)}`);
/** The public, shareable audience card for one face (the link in pitch e-mails). */
export const audienceCardHref = (faceId: string) => `/faces/${encodeURIComponent(faceId)}`;
export const signInHref = (next?: string) => (next ? `/signin?next=${encodeURIComponent(next)}` : "/signin");
