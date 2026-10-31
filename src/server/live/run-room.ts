import { DurableObject } from "cloudflare:workers";
import { RunStep } from "@/contract";
import { RunRoomCore, type RoomStatus } from "./run-room-core";

// One Durable Object per run. Browsers connect with a WebSocket (hibernating: the object sleeps between steps);
// the Workflow posts each RunStep to /step, which persists it and pushes the same JSON to every open socket.
// A finished run closes its sockets (code 1000, reason "done" | "failed"); a late connection gets the backlog, then the close.

declare const WebSocketPair: new () => { 0: WebSocket; 1: WebSocket };

export class RunRoom extends DurableObject {
  private core = new RunRoomCore(this.ctx.storage);

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.headers.get("Upgrade") === "websocket") return this.connect();
    if (request.method === "POST" && url.pathname === "/step") {
      const parsed = RunStep.safeParse(await request.json().catch(() => null));
      if (!parsed.success) return Response.json({ error: "invalid step", code: "bad_request" }, { status: 400 });
      const { fresh } = await this.core.addStep(parsed.data);
      if (fresh) for (const ws of this.ctx.getWebSockets()) ws.send(JSON.stringify(parsed.data));
      return Response.json({ ok: true });
    }
    if (request.method === "POST" && url.pathname === "/finish") {
      const body = (await request.json().catch(() => ({}))) as { status?: RoomStatus };
      const status: RoomStatus = body.status === "failed" ? "failed" : "done";
      await this.core.setStatus(status);
      for (const ws of this.ctx.getWebSockets()) ws.close(1000, status);
      return Response.json({ ok: true });
    }
    if (request.method === "GET" && url.pathname === "/steps") {
      return Response.json({ status: await this.core.status(), steps: await this.core.steps() });
    }
    return Response.json({ error: "not found", code: "not_found" }, { status: 404 });
  }

  private async connect(): Promise<Response> {
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1]);
    for (const s of await this.core.steps()) pair[1].send(JSON.stringify(s));
    const status = await this.core.status();
    if (status !== "running") pair[1].close(1000, status);
    return new Response(null, { status: 101, webSocket: pair[0] } as ResponseInit);
  }

  webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): void {
    if (message === "ping") ws.send("pong");
  }

  webSocketClose(ws: WebSocket, code: number): void {
    try {
      ws.close(code === 1005 ? 1000 : code, "closed");
    } catch {
      // already closed
    }
  }
}
