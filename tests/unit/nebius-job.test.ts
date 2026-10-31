import { describe, expect, it } from "vitest";
import { buildCreateArgs, jobName, parseArgs, readState, redact, CODE_FILES } from "../../scripts/nebius-job.mjs";

describe("nebius-job runner", () => {
  it("parses modes and flags, https only", () => {
    expect(parseArgs(["both", "--dry-run", "--keep"])).toMatchObject({ modes: ["sign-off", "red-team"], dryRun: true, keep: true, appUrl: "https://wallspace.pages.dev" });
    expect(parseArgs(["red-team", "--app-url", "https://preview.wallspace.pages.dev/"]).appUrl).toBe("https://preview.wallspace.pages.dev");
    expect(() => parseArgs(["sign-off", "--app-url", "http://localhost:3000"])).toThrow();
    expect(() => parseArgs(["nope"])).toThrow();
    expect(() => parseArgs(["sign-off", "--bogus"])).toThrow();
  });

  it("names jobs wallspace-nemo-<mode>-<yyyymmddhhmm>", () => {
    expect(jobName("red-team", new Date(2026, 9, 30, 15, 5))).toBe("wallspace-nemo-red-team-202610301505");
  });

  it("builds a create command on the hackathon-jobs-sa profile with secrets as files, never as text", () => {
    const args = buildCreateArgs("wallspace-nemo-sign-off-202610301505", "sign-off", "https://wallspace.pages.dev", "/tmp/sec", false);
    expect(args.slice(0, 5)).toEqual(["--profile", "hackathon-jobs-sa", "ai", "job", "create"]);
    expect(args).toContain("python:3.12-slim");
    expect(args).toContain("cpu-d3");
    expect(args).not.toContain("--dry-run");
    expect(args.filter((a) => a.includes("/opt/wallspace-secrets/"))).toHaveLength(2);
    expect(args.filter((a) => a.startsWith("/") && a.includes(":/opt/wallspace/"))).toHaveLength(CODE_FILES.length);
    expect(args.some((a) => /KEY=|SECRET=/.test(a))).toBe(false);
    expect(buildCreateArgs("n", "red-team", "https://x.dev", "/tmp/sec", true)).toContain("--dry-run");
  });

  it("redacts secret values and bearer tokens from logs", () => {
    const out = redact("key=abcdef123456 ok Authorization: Bearer tok_1234567890abcdef end", ["abcdef123456"]);
    expect(out).not.toContain("abcdef123456");
    expect(out).not.toContain("tok_1234567890abcdef");
  });

  it("reads state and exit code", () => {
    expect(readState({ status: { state: "COMPLETED", details: { exit_code: 0 } } })).toEqual({ state: "COMPLETED", exitCode: 0 });
    expect(readState({ status: { state: "failed", exitCode: 1 } }).state).toBe("FAILED");
    expect(readState({})).toEqual({ state: "UNKNOWN", exitCode: null });
  });
});
