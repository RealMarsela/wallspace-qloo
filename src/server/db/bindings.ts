// Structural stand-ins for the Cloudflare bindings Wallspace uses, so server code and tests run without workerd.
export interface D1Result<T = Record<string, unknown>> {
  results: T[];
  success: boolean;
  meta?: Record<string, unknown>;
}
export interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  run(): Promise<D1Result>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
}
export interface D1Like {
  prepare(sql: string): D1Statement;
  batch(statements: D1Statement[]): Promise<D1Result[]>;
}
export interface KvLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}
export interface R2Like {
  get(key: string): Promise<{ arrayBuffer(): Promise<ArrayBuffer>; httpMetadata?: { contentType?: string } } | null>;
  put(key: string, value: ArrayBuffer | string | ReadableStream, opts?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  delete(key: string): Promise<void>;
}
export interface DurableStubLike {
  fetch(input: Request | string, init?: RequestInit): Promise<Response>;
}
export interface DurableNsLike {
  idFromName(name: string): unknown;
  get(id: unknown): DurableStubLike;
}
export interface WorkflowBinding {
  create(opts: { id?: string; params?: unknown }): Promise<{ id: string }>;
}

/** The Worker's env: bindings from wrangler.jsonc, plus variables and secrets. */
export interface WallspaceEnv {
  WS_DB?: D1Like;
  WS_KV?: KvLike;
  WS_BLOB?: R2Like;
  RUN_ROOM?: DurableNsLike;
  QLOO_METER?: DurableNsLike;
  TAVILY_BUDGET?: DurableNsLike;
  PLAN_RUN?: WorkflowBinding;
  RESCAN?: WorkflowBinding;
  EVAL_RUN?: WorkflowBinding;
  STORE_DRIVER?: string; // d1 | file | memory
  QLOO_MODE?: string; // live (the only mode)
  QLOO_API_KEY?: string;
  QLOO_CAP_TOTAL?: string;
  QLOO_CAP_DAY?: string;
  TF_MODE?: string;
  TAVILY_MODE?: string;
  DATA_MODE?: string;
  APP_URL?: string;
}
