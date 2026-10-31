import { ZodError } from "zod";

/** An error that is safe to show: the message and code go to the client as { error, code }. */
export class ApiFailure extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
    this.name = "ApiFailure";
  }
}

export const unauthorized = () => new ApiFailure(401, "unauthorized", "Sign in to continue.");
export const notFound = (what = "That") => new ApiFailure(404, "not_found", `${what} was not found.`);
export const noWorkspace = () => new ApiFailure(403, "no_workspace", "Create your workspace first.");

export function failureResponse(e: unknown): Response {
  if (e instanceof ApiFailure) return Response.json({ error: e.message, code: e.code }, { status: e.status });
  if (e instanceof ZodError) return Response.json({ error: e.issues[0]?.message ?? "Invalid request.", code: "bad_request" }, { status: 400 });
  return Response.json({ error: "Something went wrong. Try again.", code: "internal" }, { status: 500 });
}

/** Runs a route body; every failure leaves as { error, code } with no database text or stack. */
export async function guarded(run: () => Promise<Response>): Promise<Response> {
  try {
    return await run();
  } catch (e) {
    return failureResponse(e);
  }
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiFailure(400, "bad_json", "The request body must be JSON.");
  }
}
