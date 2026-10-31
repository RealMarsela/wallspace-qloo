import type { CommsStore } from "./store";

// Everything a workspace connects lives under its own Composio user id.

/** The store a workspace's code sees: accounts, provider-level events and threads are bound to its Composio user id. */
export function scopeStore(store: CommsStore, userId: string): CommsStore {
  const s: CommsStore = Object.create(store);
  s.getAccount = (provider) => store.getAccount(provider, userId);
  s.deleteAccount = (provider) => store.deleteAccount(provider, userId);
  s.recordEvent = (e) => store.recordEvent({ ...e, userId: e.userId ?? userId });
  s.listEvents = (q) => store.listEvents({ ...q, userId: q.planId ? undefined : userId }); // a plan's log is authorised by plan ownership
  s.lastEventAt = (provider) => store.lastEventAt(provider, userId);
  s.saveThread = (t) => store.saveThread({ ...t, userId: t.userId ?? userId });
  s.threadsForPlan = (planId, provider) => store.threadsForPlan(planId, provider, userId);
  s.openThreads = (provider, since) => store.openThreads(provider, since, userId);
  return s;
}
