import { RecordEvent, RecordLink, type RecordsProvider } from "@/contract/connectors-records";
import type { RecordsStore } from "./types";

// In-memory RecordsStore: dev and test fallback when no D1 binding exists. Lives for the isolate only.
export function createMemoryRecordsStore(): RecordsStore & { links: RecordLink[]; events: RecordEvent[] } {
  const links: RecordLink[] = [];
  const events: RecordEvent[] = [];
  const same = (a: RecordLink, b: RecordLink) => a.planId === b.planId && a.provider === b.provider && a.kind === b.kind && a.externalId === b.externalId;
  return {
    links,
    events,
    async getLinks(planId, provider) {
      return links.filter((l) => l.planId === planId && (!provider || l.provider === provider)).map((l) => RecordLink.parse(structuredClone(l)));
    },
    async putLink(link) {
      const i = links.findIndex((l) => same(l, link));
      const copy = RecordLink.parse(structuredClone(link));
      if (i >= 0) links[i] = copy;
      else links.push(copy);
    },
    async linksByProvider(provider: RecordsProvider) {
      return links.filter((l) => l.provider === provider).map((l) => RecordLink.parse(structuredClone(l)));
    },
    async appendEvent(e) {
      events.push(RecordEvent.parse(e));
    },
    async listEvents(planId, limit = 50) {
      return events.filter((e) => e.planId === planId).slice(-limit).reverse();
    },
  };
}
