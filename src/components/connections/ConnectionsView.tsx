"use client";

import { useState, useSyncExternalStore } from "react";
import type { Connection } from "@/contract";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { useAsync } from "@/components/ui/useAsync";
import { api } from "@/lib/api-client";
import { isMock } from "@/components/site/request";
import { InventorySearch } from "@/components/owner/InventorySearch";
import { ConnectionCard } from "./ConnectionCard";
import { ConnectionsHero } from "./ConnectionsHero";
import { ConnectionsNotice, noticeFrom } from "./ConnectionsNotice";
import { categoryLabel, categoryOrder } from "./connections-api";

const noSubscribe = () => () => {};

/** The customer-tools page, driven entirely by GET /api/connections: street-network header, search, counts that
 *  filter by status and category, and one billboard-stop tile per tool. */
export function ConnectionsView() {
  const res = useAsync(() => api.connections(), "connections");
  const [local, setLocal] = useState<Record<string, Connection>>({});
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const search = useSyncExternalStore(noSubscribe, () => window.location.search, () => "");
  const notice = noticeFrom(search);

  const list = res.status === "ready" ? res.data.connections.map((c) => local[c.provider] ?? c) : null;
  const update = (c: Connection) => (next: Connection | null) => {
    if (next) return setLocal((l) => ({ ...l, [c.provider]: next }));
    if (isMock()) return setLocal((l) => ({ ...l, [c.provider]: { ...c, status: "not-connected", account: null } }));
    setLocal((l) => {
      const rest = { ...l };
      delete rest[c.provider];
      return rest;
    });
    res.retry();
  };

  return (
    <div data-testid="connections" className="flex flex-col gap-6">
      <ConnectionsHero list={list} />
      {notice ? <ConnectionsNotice notice={notice} /> : null}
      {res.status === "loading" ? <TilesSkeleton /> : null}
      {res.status === "error" ? (
        <ErrorState
          title="Connections did not load"
          message={res.error.message}
          action={<Button variant="primary" data-testid="connections-retry" onClick={res.retry}>Try again</Button>}
        />
      ) : null}
      {list && list.length === 0 ? <EmptyState title="No tools available" message="No connectors are configured on this deployment yet." /> : null}
      {list && list.length > 0 ? <Tiles list={list} filter={filter} setFilter={setFilter} query={query} setQuery={setQuery} update={update} onRefresh={() => { setLocal({}); res.retry(); }} /> : null}
    </div>
  );
}

function Tiles({ list, filter, setFilter, query, setQuery, update, onRefresh }: {
  list: Connection[];
  filter: string;
  setFilter: (v: string) => void;
  query: string;
  setQuery: (v: string) => void;
  update: (c: Connection) => (next: Connection | null) => void;
  onRefresh: () => void;
}) {
  const q = query.trim().toLowerCase();
  const searched = list.filter((c) => !q || `${c.name} ${c.provider} ${categoryLabel[c.category] ?? ""}`.toLowerCase().includes(q));
  const match = (c: Connection, f: string) => f === "all" || (f === "connected" ? c.status === "connected" : f === "attention" ? c.status === "error" : c.category === f);
  const cats = [...categoryOrder, ...new Set(list.map((c) => c.category).filter((k) => !categoryOrder.includes(k)))].filter((k) => list.some((c) => c.category === k));
  const shown = searched.filter((c) => match(c, filter));
  const n = (f: string) => <span className="font-mono text-micro text-muted">{searched.filter((c) => match(c, f)).length}</span>;
  const attention = list.some((c) => c.status === "error");
  const items = [
    { id: "all", label: <>All {n("all")}</> },
    { id: "connected", label: <>Connected {n("connected")}</> },
    ...(attention ? [{ id: "attention", label: <>Needs attention {n("attention")}</> }] : []),
    ...cats.map((k) => ({ id: k, label: <>{categoryLabel[k] ?? k} {n(k)}</> })),
  ];

  return (
    <section aria-labelledby="tools-h" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="tools-h" className="text-h3">Tools</h2>
          {isMock() ? <p data-testid="connections-mock" className="mt-1 text-small text-muted">Mock mode: sample accounts, nothing leaves the browser.</p> : null}
        </div>
        <div className="flex w-full flex-wrap items-end gap-2 sm:w-auto">
          <InventorySearch value={query} onChange={setQuery} id="connections-search" label="Search tools" placeholder="Slack, Gmail, HubSpot…" className="flex w-full min-w-0 flex-col gap-1.5 sm:w-72" />
          <Button variant="ghost" onClick={onRefresh} data-testid="connections-refresh">Refresh</Button>
        </div>
      </div>
      <SegmentedControl label="Filter tools" testId="connections-filter" value={filter} onChange={setFilter} items={items} />
      {shown.length === 0 ? (
        <EmptyState
          title="No tools match"
          message={filter === "connected" && !q ? "Nothing is connected yet. Connect Slack or a mail tool to send your first plan." : "Nothing matches the search and filter."}
          action={<Button variant="ghost" onClick={() => { setFilter("all"); setQuery(""); }}>Show all tools</Button>}
        />
      ) : (
        <ul data-testid="connections-group" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((c) => <ConnectionCard key={c.provider} c={c} onChanged={update(c)} />)}
        </ul>
      )}
    </section>
  );
}

function TilesSkeleton() {
  return (
    <div data-testid="connections-loading" role="status" aria-label="Loading connections" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-[380px] !rounded-lg" />)}
    </div>
  );
}
