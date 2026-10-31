// Ambient types for the `cloudflare:workers` module (it exists only inside workerd). Minimal on purpose: just what Wallspace's
// Durable Objects and Workflows use. Vitest never imports files that import this module; logic lives in plain cores.
declare module "cloudflare:workers" {
  export interface DurableObjectStorageLike {
    get<T = unknown>(key: string): Promise<T | undefined>;
    put<T = unknown>(key: string, value: T): Promise<void>;
    delete(key: string): Promise<boolean>;
    list<T = unknown>(opts?: { prefix?: string; limit?: number }): Promise<Map<string, T>>;
    setAlarm?(scheduledTime: number): Promise<void>;
  }
  export interface DurableObjectStateLike {
    storage: DurableObjectStorageLike;
    id: { toString(): string; name?: string };
    waitUntil(promise: Promise<unknown>): void;
    blockConcurrencyWhile<T>(fn: () => Promise<T>): Promise<T>;
    acceptWebSocket(ws: WebSocket, tags?: string[]): void;
    getWebSockets(tag?: string): WebSocket[];
  }
  export class DurableObject<Env = unknown> {
    constructor(ctx: DurableObjectStateLike, env: Env);
    protected ctx: DurableObjectStateLike;
    protected env: Env;
    fetch?(request: Request): Response | Promise<Response>;
    alarm?(): void | Promise<void>;
    webSocketMessage?(ws: WebSocket, message: string | ArrayBuffer): void | Promise<void>;
    webSocketClose?(ws: WebSocket, code: number, reason: string, wasClean: boolean): void | Promise<void>;
    webSocketError?(ws: WebSocket, error: unknown): void | Promise<void>;
  }

  export interface WorkflowEvent<T = unknown> {
    payload: Readonly<T>;
    timestamp: Date;
    instanceId: string;
  }
  export interface WorkflowStepConfig {
    retries?: { limit: number; delay: string | number; backoff?: "constant" | "linear" | "exponential" };
    timeout?: string | number;
  }
  export interface WorkflowStep {
    do<T>(name: string, callback: () => Promise<T>): Promise<T>;
    do<T>(name: string, config: WorkflowStepConfig, callback: () => Promise<T>): Promise<T>;
    sleep(name: string, duration: string | number): Promise<void>;
  }
  export abstract class WorkflowEntrypoint<Env = unknown, Params = unknown> {
    constructor(ctx: unknown, env: Env);
    protected ctx: unknown;
    protected env: Env;
    abstract run(event: Readonly<WorkflowEvent<Params>>, step: WorkflowStep): Promise<unknown>;
  }
}
