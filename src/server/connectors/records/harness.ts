import { MockComposio } from "@/mocks/connectors-records-composio";
import { createMemoryRecordsStore, sampleRecordsPlan } from "@/mocks/connectors-records";
import type { RecordsDeps } from "./types";

// Test harness: mock Composio + in-memory store + fixed clock and ids.
export function harness(over: Partial<RecordsDeps> = {}) {
  const composio = new MockComposio();
  const store = createMemoryRecordsStore();
  let tick = 0;
  let n = 0;
  const deps: RecordsDeps = {
    composio, store, appUrl: "https://wallspace.pages.dev",
    now: () => new Date(Date.UTC(2026, 9, 30, 9, 0, tick++)),
    newId: () => `evt-${++n}`,
    ...over,
  };
  return { deps, composio, store, data: sampleRecordsPlan, planId: sampleRecordsPlan.plan.id };
}
