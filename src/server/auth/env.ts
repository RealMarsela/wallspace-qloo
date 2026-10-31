import { runtimeEnv, type WallspaceEnv } from "../db";

/** Bindings and settings the auth layer reads. Secrets come from Worker secrets (WALLSPACE_*), never from code. */
export interface AuthEnv extends WallspaceEnv {
  WALLSPACE_AUTH_SECRET?: string;
  WALLSPACE_GOOGLE_CLIENT_ID?: string;
  WALLSPACE_GOOGLE_CLIENT_SECRET?: string;
  APP_URL?: string;
  AUTH_DEV_DB?: string;
}
export type Env = AuthEnv & Record<string, unknown>;

export const authEnv = (): Env => runtimeEnv() as Env;

export const googleEnabled = (env: AuthEnv): boolean => Boolean(env.WALLSPACE_GOOGLE_CLIENT_ID && env.WALLSPACE_GOOGLE_CLIENT_SECRET);
