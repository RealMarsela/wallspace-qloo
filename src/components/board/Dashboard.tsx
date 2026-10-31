"use client";
import { useMemo, useState } from "react";
import { PageFrame, PageHeader } from "@/components/shell/PageHeader";
import { Button, LinkButton } from "@/components/ui/Button";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { Search } from "@/components/ui/icons-app";
import { filterMatch, type PlanFilter } from "@/components/plan/plan-status";
import { useMe } from "@/lib/use-me";
import { haystack, useDashboard } from "./dashboard-data";
import { EmptyWorkspace } from "./EmptyWorkspace";
import { PlanTable } from "./PlanTable";
import { StatFilters } from "./StatFilters";

/** /app: says little, shows a lot. Counts that filter, a search box, clean plan rows, one primary action. */
export function Dashboard() {
  const state = useDashboard();
  const me = useMe();
  const [filter, setFilter] = useState<PlanFilter>("all");
  const [q, setQ] = useState("");
  const rows = state.status === "ready" ? state.data : null;
  const ws = me.status === "ready" ? me.me.workspace : null;

  const groups = useMemo(() => {
    if (!rows) return [];
    const t = q.trim().toLowerCase();
    const shown = rows.filter((r) => filterMatch[filter](r.status) && (!t || haystack(r).includes(t)));
    return [
      { id: "own", label: ws ? `${ws.name} plans` : "Your plans", rows: shown.filter((r) => !r.sample) },
      { id: "sample", label: "Public sample plan", rows: shown.filter((r) => r.sample) },
    ].filter((g) => g.rows.length > 0);
  }, [rows, filter, q, ws]);
  const ownCount = rows?.filter((r) => !r.sample).length ?? 0;

  return (
    <PageFrame testId="dashboard">
      <PageHeader
        eyebrow={ws ? `${ws.name} · Atlanta` : "Atlanta"}
        title="Plans"
        lede="Every brief you have run, newest first. Click a count to filter."
        actions={
          <LinkButton href="/app/new" variant="primary" arrow testId="dashboard-new">
            New brief
          </LinkButton>
        }
      />
      <div className="flex flex-col gap-5">
        <StatFilters rows={rows} value={filter} onChange={setFilter} />
        {state.status === "error" ? (
          <ErrorState title="Plans not loaded" message={state.error.message} action={<Button data-testid="dashboard-retry" onClick={state.retry}>Try again</Button>} />
        ) : (
          <>
            {rows && ownCount === 0 ? <EmptyWorkspace /> : null}
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <label className="relative min-w-0 flex-1 sm:max-w-[360px]">
                  <span className="sr-only">Search plans</span>
                  <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search by brand, taste or plan ID"
                    data-testid="dashboard-search"
                    className="h-10 w-full rounded-md border border-line bg-surface pl-9 pr-3 text-small text-ink placeholder:text-muted focus:border-cobalt focus:outline-none focus:ring-[3px] focus:ring-cobalt/20"
                  />
                </label>
                {filter !== "all" || q ? (
                  <Button size="sm" variant="quiet" data-testid="dashboard-clear" onClick={() => { setFilter("all"); setQ(""); }}>
                    Clear filters
                  </Button>
                ) : null}
                <p className="ml-auto text-micro text-muted" role="status" data-testid="dashboard-result-count">
                  {rows ? `${groups.reduce((n, g) => n + g.rows.length, 0)} of ${rows.length} plans` : "Loading plans"}
                </p>
              </div>
              {!rows ? (
                <div className="flex flex-col gap-2" aria-busy="true" data-testid="dashboard-loading">
                  <Skeleton className="h-10" />
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-14" />
                  ))}
                </div>
              ) : groups.length ? (
                <PlanTable groups={groups} />
              ) : (
                <EmptyState
                  title="No plans match"
                  message={q ? `Nothing matches "${q}" with this filter.` : "No plan has this status yet."}
                  action={
                    <Button size="sm" onClick={() => { setFilter("all"); setQ(""); }} data-testid="dashboard-empty-clear">
                      Show all plans
                    </Button>
                  }
                />
              )}
            </div>
          </>
        )}
      </div>
    </PageFrame>
  );
}
