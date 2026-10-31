// Run the Wallspace NeMo Guardrails job on a Nebius CPU job, from the CLI only.
// Usage: npx tsx scripts/nebius-job.mts <sign-off|red-team|both> [--app-url URL] [--dry-run] [--keep]
// Secrets come from the developer's env (NEBIUS_API_KEY, WALLSPACE_INGEST_SECRET), are shipped as injected
// files under /opt/wallspace-secrets/, and never appear in argv, --env or printed logs.
import { execFile } from "node:child_process";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
export const NEBIUS = process.env.NEBIUS_BIN ?? "nebius";
export const PROFILE = "hackathon-jobs-sa";
export const PROJECT_ID = "project-e04yk83jbc00bwhyv60mbp";
export const DEFAULT_APP_URL = "https://wallspace.pages.dev";
const JOB_DIR = resolve(fileURLToPath(new URL("../jobs/nemo", import.meta.url)));
const SECRET_NAMES = ["NEBIUS_API_KEY", "WALLSPACE_INGEST_SECRET"] as const;
const TERMINAL = /^(COMPLETED|SUCCEEDED|FINISHED|FAILED|ERROR|CANCELLED|CANCELED|STOPPED|DELETING|DELETED)$/;
const SUCCESS = /^(COMPLETED|SUCCEEDED|FINISHED)$/;
const POLL_MS = 10_000;
const MAX_WAIT_MS = 55 * 60_000;

export type Mode = "sign-off" | "red-team";
export interface Options { modes: Mode[]; appUrl: string; dryRun: boolean; keep: boolean }

let aborted = false;
process.on("SIGINT", () => { aborted = true; });
const say = (s: string) => process.stdout.write(s + "\n");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function parseArgs(argv: string[]): Options {
  const [mode, ...rest] = argv;
  if (mode !== "sign-off" && mode !== "red-team" && mode !== "both") throw new Error("first argument must be sign-off, red-team or both");
  const opts: Options = { modes: mode === "both" ? ["sign-off", "red-team"] : [mode], appUrl: DEFAULT_APP_URL, dryRun: false, keep: false };
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === "--dry-run") opts.dryRun = true;
    else if (rest[i] === "--keep") opts.keep = true;
    else if (rest[i] === "--app-url") opts.appUrl = rest[++i] ?? "";
    else throw new Error(`unknown argument ${rest[i]}`);
  }
  const u = new URL(opts.appUrl);
  if (u.protocol !== "https:") throw new Error("--app-url must be https");
  opts.appUrl = opts.appUrl.replace(/\/+$/, "");
  return opts;
}

export function stamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}`;
}

export function jobName(mode: Mode, d = new Date()): string { return `wallspace-nemo-${mode}-${stamp(d)}`; }

/** Code files shipped with --inject-file (64 KiB limit applies per file). */
export const CODE_FILES: Array<[string, string]> = [
  ["job.py", "job.py"], ["guard.py", "guard.py"], ["ingest.py", "ingest.py"], ["redteam.py", "redteam.py"],
  ["requirements.txt", "requirements.txt"], ["redteam.json", "redteam.json"], ["run.sh", "run.sh"],
  ["policy/policy.json", "policy.json"],
];

export function buildCreateArgs(name: string, mode: Mode, appUrl: string, secretsDir: string, dryRun: boolean): string[] {
  const inject: string[] = [];
  for (const [src, dest] of CODE_FILES) inject.push("--inject-file", `${join(JOB_DIR, src)}:/opt/wallspace/${dest}`);
  for (const n of SECRET_NAMES) inject.push("--inject-file", `${join(secretsDir, n)}:/opt/wallspace-secrets/${n}`);
  return [
    "--profile", PROFILE, "ai", "job", "create",
    "--parent-id", PROJECT_ID, "--name", name,
    "--platform", "cpu-d3", "--preset", "2vcpu-8gb",
    "--image", "python:3.12-slim", "--timeout", "1h", "--disk-size", "20Gi", "--restart-policy", "never",
    "--container-command", "sh", "--args", "/opt/wallspace/run.sh",
    "--env", `WALLSPACE_JOB_MODE=${mode}`, "--env", `APP_URL=${appUrl}`, "--env", `JOB_NAME=${name}`,
    ...inject, ...(dryRun ? ["--dry-run"] : []),
  ];
}

export function redact(text: string, secrets: string[]): string {
  let out = text;
  for (const s of secrets) if (s.length >= 6) out = out.split(s).join("[redacted]");
  return out
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]{8,}/gi, "$1[redacted]")
    .replace(/((?:api[_-]?key|secret|token|authorization)["'\s:=]+)[A-Za-z0-9._~+/=-]{12,}/gi, "$1[redacted]");
}

export function readState(job: unknown): { state: string; exitCode: number | null } {
  const status = (job as { status?: Record<string, unknown> } | null)?.status ?? {};
  const state = String(status.state ?? "UNKNOWN").toUpperCase().replace(/^JOB_STATE_/, "");
  let exitCode: number | null = null;
  const walk = (v: unknown) => {
    if (!v || typeof v !== "object") return;
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (/^exit_?code$/i.test(k) && typeof val === "number") exitCode = val;
      else walk(val);
    }
  };
  walk(status);
  return { state, exitCode };
}

async function cli(args: string[]): Promise<string> {
  try {
    const { stdout } = await run(NEBIUS, args, { maxBuffer: 64 * 1024 * 1024, timeout: 10 * 60_000 });
    return stdout;
  } catch (e) {
    const err = e as { stderr?: string; code?: number };
    const detail = String(err.stderr ?? "").replace(/\x1b\[[0-9;]*m/g, "").trim().split("\n").slice(0, 6).join(" ");
    throw new Error(`nebius ${args.slice(2, 5).join(" ")} exited ${err.code ?? "?"}: ${detail}`);
  }
}

function prepareSecrets(dryRun: boolean): { dir: string; values: string[] } {
  const dir = mkdtempSync(join(tmpdir(), "wallspace-nebius-"));
  chmodSync(dir, 0o700);
  const values: string[] = [];
  for (const n of SECRET_NAMES) {
    let v = process.env[n]?.trim() ?? "";
    if (!v) {
      if (!dryRun) { rmSync(dir, { recursive: true, force: true }); throw new Error(`${n} is not set in the environment`); }
      v = "dry-run-placeholder"; // the CLI only validates; nothing is created
    }
    writeFileSync(join(dir, n), v + "\n", { mode: 0o600 });
    values.push(v);
  }
  return { dir, values };
}

async function runOne(mode: Mode, opts: Options, secrets: { dir: string; values: string[] }): Promise<boolean> {
  const name = jobName(mode);
  const args = buildCreateArgs(name, mode, opts.appUrl, secrets.dir, opts.dryRun);
  say(`[${mode}] job ${name}${opts.dryRun ? " (dry run)" : ""}`);
  if (opts.dryRun) {
    const out = await cli(args);
    say(redact(out.trim() || "dry run accepted", secrets.values));
    return true;
  }
  let id = "";
  try {
    await createWhenQuotaAllows(mode, args);
    id = (await cli(["--profile", PROFILE, "ai", "job", "get-by-name", "--name", name, "--parent-id", PROJECT_ID, "--format", "jsonpath={.metadata.id}"])).trim();
    if (!id) throw new Error("job created but its id could not be resolved");
    say(`[${mode}] id ${id}`);
    return await watch(mode, name, id, secrets.values);
  } finally {
    if (id && !opts.keep && name.startsWith("wallspace-")) {
      try { await cli(["--profile", PROFILE, "ai", "job", "delete", id]); say(`[${mode}] deleted ${name}`); }
      catch (e) { say(`[${mode}] delete failed (remove ${name} manually): ${redact(String(e), secrets.values).slice(0, 200)}`); }
    } else if (id) say(`[${mode}] kept ${name} (${id})`);
  }
}

/** The tenant allows 2 concurrent instances; other sessions use them, so wait for a free slot (up to 20 min). */
async function createWhenQuotaAllows(mode: Mode, args: string[]): Promise<void> {
  const deadline = Date.now() + 20 * 60_000;
  for (;;) {
    try { await cli(args); return; }
    catch (e) {
      if (!/ResourceExhausted|Quota limit exceeded/i.test(String(e)) || Date.now() > deadline || aborted) throw e;
      say(`[${mode}] instance quota full (2 concurrent jobs allowed); retrying in 30s`);
      await sleep(30_000);
    }
  }
}

async function watch(mode: Mode, name: string, id: string, secrets: string[]): Promise<boolean> {
  let last = "";
  let final = { state: "UNKNOWN", exitCode: null as number | null };
  const deadline = Date.now() + MAX_WAIT_MS;
  while (Date.now() < deadline && !aborted) {
    final = readState(JSON.parse(await cli(["--profile", PROFILE, "ai", "job", "get", id, "--format", "json"])));
    if (final.state !== last) { say(`[${mode}] state ${final.state}`); last = final.state; }
    if (TERMINAL.test(final.state)) break;
    await sleep(POLL_MS);
  }
  say(`[${mode}] final state ${final.state}, exit status ${final.exitCode ?? "n/a"}`);
  try {
    const logs = await cli(["--profile", PROFILE, "ai", "job", "logs", id, "--since", "2h", "--timestamps"]);
    say(`--- ${name} logs (redacted) ---\n${redact(logs, secrets).trim()}\n--- end logs ---`);
  } catch (e) { say(`[${mode}] could not read logs: ${redact(String(e), secrets).slice(0, 200)}`); }
  return SUCCESS.test(final.state) && (final.exitCode ?? 0) === 0;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const secrets = prepareSecrets(opts.dryRun);
  let ok = true;
  try {
    for (const mode of opts.modes) ok = (await runOne(mode, opts, secrets)) && ok;
  } finally {
    rmSync(secrets.dir, { recursive: true, force: true });
  }
  process.exitCode = ok ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { process.stderr.write(`nebius-job failed: ${String(e instanceof Error ? e.message : e).slice(0, 400)}\n`); process.exitCode = 1; });
}
