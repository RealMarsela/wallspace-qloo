import type { Connection } from "@/contract";
import type { ComposioWebhookBody } from "@/contract/connectors-comms";
import type { PlanResponse } from "@/contract";
import type { z } from "zod";
import type { ComposioClient } from "./client";
import type { RuntimeContext } from "./env";
import type { CommsStore } from "./store";

// Provider, sender and trigger registries. Lane B4 registers its providers from its own register.ts, which
// boot.ts imports. Registration is idempotent: the last definition for an id wins.

export type PlanBundle = z.infer<typeof PlanResponse>;

export interface ProviderCtx {
  rt: RuntimeContext;
  store: CommsStore;
  composio: ComposioClient;
  userId: string;
  origin: string;
}

export interface ProviderStatus {
  status: Connection["status"];
  account: string | null;
}

export interface ProviderDef {
  id: string; // matches Connection.provider
  name: string;
  category: Connection["category"];
  realtime: Connection["realtime"];
  toolkit?: string; // Composio toolkit slug; status, connect and disconnect then work from connected accounts
  // Own-app providers (Slack) supply these instead of a toolkit.
  status?: (ctx: ProviderCtx) => Promise<ProviderStatus>;
  connect?: (ctx: ProviderCtx, callbackUrl: string) => Promise<{ redirectUrl: string }>;
  disconnect?: (ctx: ProviderCtx) => Promise<void>;
}

export interface SendContext extends ProviderCtx {
  bundle: PlanBundle;
  to: string | null;
  note: string | null;
  planUrl: string;
}

export interface SendOutcome {
  externalId: string | null;
  url: string | null;
}

export type Sender = (ctx: SendContext) => Promise<SendOutcome>;

export interface TriggerContext extends ProviderCtx {
  event: ComposioWebhookBody;
}
export type TriggerHandler = (ctx: TriggerContext) => Promise<void>;

const providers = new Map<string, ProviderDef>();
const senders = new Map<string, Sender>();
const triggers = new Map<string, TriggerHandler>();

export function registerProvider(def: ProviderDef): void {
  providers.set(def.id, def);
}
export function registerSender(provider: string, fn: Sender): void {
  senders.set(provider, fn);
}
export function registerTriggerHandler(triggerSlug: string, fn: TriggerHandler): void {
  triggers.set(triggerSlug, fn);
}

export const listProviders = (): ProviderDef[] => [...providers.values()];
export const getProvider = (id: string): ProviderDef | undefined => providers.get(id);
export const getSender = (provider: string): Sender | undefined => senders.get(provider);
export const getTriggerHandler = (slug: string): TriggerHandler | undefined => triggers.get(slug);
export const senderProviders = (): string[] => [...senders.keys()];

// Test hook.
export function resetRegistries(): void {
  providers.clear();
  senders.clear();
  triggers.clear();
}
