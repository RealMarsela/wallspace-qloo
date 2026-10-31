import { describe, expect, it } from "vitest";
import { hmacSha256, toBase64, toHex } from "./crypto";
import { verifyComposioSignature } from "./signature";
import { verifySlackSignature } from "../slack/verify";

const NOW = Date.UTC(2026, 9, 30, 8, 0, 0);
const nowSec = Math.floor(NOW / 1000);

describe("Composio webhook signature", () => {
  const secret = "whsec-test-secret";
  const body = '{"id":"evt_1","type":"composio.trigger.message"}';
  const sign = async (id: string, ts: number, b = body) => `v1,${toBase64(await hmacSha256(secret, `${id}.${ts}.${b}`))}`;

  it("accepts a valid signature", async () => {
    const r = await verifyComposioSignature(body, { id: "msg_1", timestamp: String(nowSec), signature: await sign("msg_1", nowSec) }, secret, NOW);
    expect(r).toEqual({ ok: true });
  });

  it("accepts any matching entry in a multi-signature header", async () => {
    const good = await sign("msg_1", nowSec);
    const r = await verifyComposioSignature(body, { id: "msg_1", timestamp: String(nowSec), signature: `v1,AAAA ${good}` }, secret, NOW);
    expect(r.ok).toBe(true);
  });

  it("rejects a bad signature", async () => {
    const r = await verifyComposioSignature(body, { id: "msg_1", timestamp: String(nowSec), signature: "v1,Zm9vYmFy" }, secret, NOW);
    expect(r).toEqual({ ok: false, reason: "mismatch" });
  });

  it("rejects a tampered body", async () => {
    const sig = await sign("msg_1", nowSec);
    const r = await verifyComposioSignature(body + " ", { id: "msg_1", timestamp: String(nowSec), signature: sig }, secret, NOW);
    expect(r.ok).toBe(false);
  });

  it("rejects a stale timestamp even with a correct signature", async () => {
    const old = nowSec - 301;
    const r = await verifyComposioSignature(body, { id: "msg_1", timestamp: String(old), signature: await sign("msg_1", old) }, secret, NOW);
    expect(r).toEqual({ ok: false, reason: "stale" });
  });

  it("rejects missing headers and a missing secret", async () => {
    expect(await verifyComposioSignature(body, { id: null, timestamp: null, signature: null }, secret, NOW)).toEqual({ ok: false, reason: "missing" });
    expect((await verifyComposioSignature(body, { id: "m", timestamp: String(nowSec), signature: "v1,x" }, "", NOW)).ok).toBe(false);
  });
});

describe("Slack request signature", () => {
  const secret = "slack-signing-secret";
  const body = "payload=%7B%22type%22%3A%22block_actions%22%7D";
  const sign = async (ts: number) => `v0=${toHex(await hmacSha256(secret, `v0:${ts}:${body}`))}`;

  it("accepts a valid signature", async () => {
    const r = await verifySlackSignature(body, { timestamp: String(nowSec), signature: await sign(nowSec) }, secret, NOW);
    expect(r).toEqual({ ok: true });
  });

  it("rejects a bad signature", async () => {
    const r = await verifySlackSignature(body, { timestamp: String(nowSec), signature: "v0=00" }, secret, NOW);
    expect(r).toEqual({ ok: false, reason: "mismatch" });
  });

  it("rejects a timestamp more than five minutes old", async () => {
    const old = nowSec - 400;
    const r = await verifySlackSignature(body, { timestamp: String(old), signature: await sign(old) }, secret, NOW);
    expect(r).toEqual({ ok: false, reason: "stale" });
  });

  it("rejects when the secret differs", async () => {
    const r = await verifySlackSignature(body, { timestamp: String(nowSec), signature: await sign(nowSec) }, "other-secret", NOW);
    expect(r.ok).toBe(false);
  });
});
