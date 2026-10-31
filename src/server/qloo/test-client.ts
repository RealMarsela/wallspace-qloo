import { QlooClient, newLocalMeter, type QlooDeps } from "./client";
import type { QlooParams } from "./types";

// Test helper: a live-mode QlooClient whose fetch answers from a list of routes. Bodies in tests are invented values in the shapes
// observed from Qloo (SHAPES.md); nothing here is copied from a real response.
export interface Route { endpoint: string; match?: QlooParams; body: unknown; status?: number }
export interface Fake { client: QlooClient; calls: { endpoint: string; params: Record<string, string> }[] }

export function fakeQloo(routes: Route[], over: Partial<QlooDeps> = {}): Fake {
  const calls: Fake["calls"] = [];
  const fetchImpl = async (input: string) => {
    const u = new URL(input);
    const params = Object.fromEntries(u.searchParams.entries());
    calls.push({ endpoint: u.pathname, params });
    const hit = routes.find((r) => r.endpoint === u.pathname && Object.entries(r.match ?? {}).every(([k, v]) => params[k] === String(v)) && Object.keys(params).length === Object.keys(r.match ?? params).length);
    if (!hit) return new Response(JSON.stringify({ errors: [{ message: "no route in the test", path: u.pathname }] }), { status: 400 });
    return new Response(JSON.stringify(hit.body), { status: hit.status ?? 200, headers: { "x-qloo-request-id": `req-${calls.length}` } });
  };
  return { calls, client: new QlooClient({ apiKey: "test-key", localMeter: newLocalMeter(), fetchImpl: fetchImpl as never, ...over }) };
}
