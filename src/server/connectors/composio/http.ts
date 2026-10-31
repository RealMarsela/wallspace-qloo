import { ZodError } from "zod";
import { NotConnectedError } from "./accounts";
import { ComposioError } from "./client";
import { SlackError } from "../slack/api";
import { ApiFailure, failureResponse } from "../../auth/errors";

// Every connector route answers { error, code? }. Only messages from our own error classes pass through.
export function errorResponse(e: unknown): Response {
  if (e instanceof ApiFailure) return failureResponse(e); // 401 / 403 / 404 from the session and ownership checks
  if (e instanceof ZodError) return Response.json({ error: e.issues[0]?.message ?? "invalid request", code: "bad_request" }, { status: 400 });
  if (e instanceof NotConnectedError) return Response.json({ error: e.message, code: e.code }, { status: 409 });
  if (e instanceof ComposioError) {
    const status = e.code === "no_key" ? 503 : 502;
    return Response.json({ error: e.message, code: e.code === "no_key" ? "composio_not_configured" : "composio_error" }, { status });
  }
  if (e instanceof SlackError) {
    const status = e.code === "slack_not_configured" ? 503 : e.code === "slack_manual_install" ? 409 : e.code.startsWith("slack_") && e.code !== "slack_error" ? 400 : 502;
    return Response.json({ error: e.message, code: e.code }, { status });
  }
  if (e instanceof HttpError) return Response.json({ error: e.message, code: e.code }, { status: e.status });
  return Response.json({ error: "something went wrong", code: "internal" }, { status: 500 });
}

export class HttpError extends Error {
  constructor(message: string, readonly code: string, readonly status: number) {
    super(message);
    this.name = "HttpError";
  }
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new HttpError("body must be JSON", "bad_json", 400);
  }
}
