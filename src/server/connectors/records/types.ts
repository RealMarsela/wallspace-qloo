import type { RecordEvent, RecordLink, RecordsProvider, SheetEdit } from "@/contract/connectors-records";

// What the records connectors need from the host. B3's Composio client satisfies ComposioPort through a thin
// adapter (registerRecordsProviders); tests and DATA_MODE=mock use the in-memory fakes in src/mocks.

export interface ToolResult {
  successful: boolean;
  data: Record<string, unknown>;
  error: string | null;
}

export interface ComposioPort {
  // Executes a Composio tool on the connected account for `provider`. Rejects with NotConnectedError when none exists.
  execute(slug: string, args: Record<string, unknown>, provider: RecordsProvider): Promise<ToolResult>;
  // Optional: create a Composio trigger instance (POST /trigger_instances/{slug}/upsert) on the provider's account.
  upsertTrigger?(slug: string, config: Record<string, unknown>, provider: RecordsProvider): Promise<void>;
}

export class NotConnectedError extends Error {
  readonly code = "not-connected";
  constructor(readonly provider: RecordsProvider) {
    super(`${provider} is not connected`);
  }
}

export class ToolError extends Error {
  readonly code = "tool-error";
  constructor(readonly slug: string, message: string) {
    super(`${slug}: ${message}`);
  }
}

export interface RecordsStore {
  getLinks(planId: string, provider?: RecordsProvider): Promise<RecordLink[]>;
  putLink(link: RecordLink): Promise<void>; // upsert on (planId, provider, kind, externalId)
  linksByProvider(provider: RecordsProvider): Promise<RecordLink[]>; // every plan's links, for polling
  appendEvent(event: RecordEvent): Promise<void>;
  listEvents(planId: string, limit?: number): Promise<RecordEvent[]>;
}

export interface RecordsDeps {
  composio: ComposioPort;
  store: RecordsStore;
  appUrl: string;
  now?: () => Date;
  newId?: () => string;
  // Mirror every sync-log row into the shared plan event log (B3's events table), when the host wires it.
  emit?: (event: RecordEvent) => Promise<void>;
  // Apply a planner's sheet edit to the plan itself. Without it the edit is recorded in the event log only.
  applySheetEdit?: (edit: SheetEdit) => Promise<void>;
}
