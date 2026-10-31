"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { PlanMap } from "@/components/map/PlanMap";
import { ProductWindow } from "@/components/motif/ProductWindow";
import { Button } from "@/components/ui/Button";
import { Listbox } from "@/components/ui/Listbox";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { kindName } from "@/components/ui/format";
import { useAsync } from "@/components/ui/useAsync";
import { api } from "@/lib/api-client";
import { FaceRows } from "./FaceRows";
import { InventorySearch } from "./InventorySearch";
import { useHeadlines, useStableFaces, type Headline } from "./owner-headlines";
import { appCardHref } from "./owner-format";

type DataFilter = "all" | "qloo" | "photo";
type Sort = "id" | "lift" | "affinity";
const NONE: never[] = [];
const PAGE = 20;

const topLift = (h?: Headline) => (h?.status === "ready" ? Math.max(0, ...h.card.topTags.map((t) => t.lift ?? 0)) : -1);
const topBrand = (h?: Headline) => (h?.status === "ready" ? (h.card.brands[0]?.score ?? 0) : -1);

/** Media-owner inventory: owner switcher, search, format and sort menus, counts that filter, a list or map view. */
export function OwnerInventory() {
  const router = useRouter();
  const inv = useAsync(() => api.faces(), "faces");
  const [ownerId, setOwnerId] = useState("");
  const [query, setQuery] = useState("");
  const [data, setData] = useState<DataFilter>("all");
  const [kind, setKind] = useState("all");
  const [sort, setSort] = useState<Sort>("id");
  const [view, setView] = useState<"list" | "map">("list");
  const [limit, setLimit] = useState(PAGE);

  const owners = useMemo(() => inv.data?.owners ?? [], [inv.data]);
  const current = ownerId || owners[0]?.id || "";
  const faces = useMemo(() => (inv.data?.faces ?? []).filter((f) => f.ownerId === current), [inv.data, current]);
  const { heads, retry } = useHeadlines(faces);

  const provOf = (id: string) => {
    const h = heads[id];
    return h?.status === "ready" ? "qloo" : null;
  };
  const q = query.trim().toLowerCase();
  const searched = faces.filter((f) => (kind === "all" || f.kind === kind) && (!q || `${f.id} ${f.name} ${f.neighbourhood}`.toLowerCase().includes(q)));
  const count = (d: DataFilter) => (d === "all" ? searched.length : d === "photo" ? searched.filter((f) => f.photoUrl).length : searched.filter((f) => provOf(f.id) === d).length);
  const filtered = searched.filter((f) => data === "all" || (data === "photo" ? Boolean(f.photoUrl) : provOf(f.id) === data));
  const shown = sort === "id" ? filtered : [...filtered].sort((a, b) => (sort === "lift" ? topLift(heads[b.id]) - topLift(heads[a.id]) : topBrand(heads[b.id]) - topBrand(heads[a.id])));
  // The map gets a stable array: it only changes when the set of shown faces does, not on every headline update.
  const mapFaces = useStableFaces(faces, shown.map((f) => f.id).join(","));
  const loadingHeads = faces.some((f) => !heads[f.id] || heads[f.id].status === "loading");
  const kinds = [...new Set(faces.map((f) => f.kind))];

  if (inv.status === "loading")
    return (
      <div data-testid="owner-loading" className="flex flex-col gap-4" role="status" aria-label="Loading inventory">
        <div className="flex flex-wrap gap-3"><Skeleton className="h-16 w-72" /><Skeleton className="h-16 w-80" /><Skeleton className="h-16 w-52" /></div>
        <Skeleton className="h-10 w-full max-w-2xl" />
        <div className="flex flex-col gap-2">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-16" />)}</div>
      </div>
    );
  if (inv.status === "error")
    return (
      <div className="py-8">
        <ErrorState title="Inventory did not load" message={inv.error.message} action={<Button variant="primary" data-testid="owner-retry" onClick={inv.retry}>Try again</Button>} />
      </div>
    );

  const owner = owners.find((o) => o.id === current);
  const reset = () => setLimit(PAGE);
  const clear = () => {
    setQuery("");
    setData("all");
    setKind("all");
    reset();
  };
  const n = (d: DataFilter) => <span className="font-mono text-micro">{d !== "all" && d !== "photo" && loadingHeads ? "…" : count(d)}</span>;
  const label = "text-small text-ink";

  return (
    <div data-testid="owner-inventory" className="flex flex-1 flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_auto] lg:items-end">
        <div className="col-span-2 flex min-w-0 flex-col gap-1.5 sm:col-span-1">
          <span className={label}>Media owner</span>
          <Listbox
            label="Media owner"
            testId="owner-filter"
            value={current}
            onChange={(v) => { setOwnerId(v); clear(); }}
            options={owners.map((o) => {
              const total = (inv.data?.faces ?? []).filter((f) => f.ownerId === o.id).length;
              return { value: o.id, label: o.name, hint: `${total} ${total === 1 ? "face" : "faces"}${o.sample ? " · sample owner" : ""}` };
            })}
          />
        </div>
        <InventorySearch value={query} onChange={(v) => { setQuery(v); reset(); }} className="col-span-2 flex min-w-0 flex-col gap-1.5 sm:col-span-1" />
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className={label}>Format</span>
          <Listbox
            label="Format"
            testId="owner-kind"
            value={kind}
            onChange={(v) => { setKind(v); reset(); }}
            options={[{ value: "all", label: "All formats", hint: `${faces.length} faces` }, ...kinds.map((k) => ({ value: k, label: kindName(k), hint: `${faces.filter((f) => f.kind === k).length} faces` }))]}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className={label}>Sort by</span>
          <Listbox
            label="Sort by"
            testId="owner-sort"
            value={sort}
            onChange={(v) => setSort(v as Sort)}
            options={[
              { value: "id", label: "Face ID", hint: "Inventory order" },
              { value: "lift", label: "Strongest lift", hint: "Top block tag vs Atlanta" },
              { value: "affinity", label: "Top brand fit", hint: "Highest brand affinity" },
            ]}
          />
        </div>
        <SegmentedControl
          className="col-span-2 h-10 self-end justify-self-start lg:col-span-1"
          label="View"
          testId="owner-view"
          size="sm"
          value={view}
          onChange={(v) => setView(v as "list" | "map")}
          items={[{ id: "list", label: "List", testId: "owner-view-list" }, { id: "map", label: "Map", testId: "owner-view-map" }]}
        />
      </div>

      <SegmentedControl
        label="Filter faces by data source"
        testId="owner-counts"
        value={data}
        onChange={(v) => { setData(v as DataFilter); reset(); }}
        className="w-full sm:w-auto"
        items={[
          { id: "all", label: <>All faces {n("all")}</> },
          { id: "qloo", label: <>Qloo data {n("qloo")}</> },
          { id: "photo", label: <>With photo {n("photo")}</> },
        ]}
      />
      <p data-testid="owner-summary" className="text-small text-muted" aria-live="polite">
        {shown.length} of {faces.length} {faces.length === 1 ? "face" : "faces"} from {owner?.name.replace(/\s*\(sample\)$/, "") ?? "this owner"}
        {owner?.sample ? " (a sample owner)" : ""}. Open a face for its audience card and pitch.
      </p>

      {view === "map" ? (
        <ProductWindow crumbs={[owner?.name ?? "Owner", `${shown.length} faces`]} label="Map of this owner's faces" bodyClassName="relative h-[420px] sm:h-[600px]" testId="owner-map">
          <PlanMap heat={NONE} faces={mapFaces} picks={NONE} legend={false} onSelectFace={(id) => router.push(appCardHref(id))} />
        </ProductWindow>
      ) : faces.length === 0 ? (
        <EmptyState title="No faces for this owner" message="This owner has no faces in the Atlanta inventory yet. Pick another owner above." />
      ) : shown.length === 0 ? (
        <EmptyState
          title="No faces match"
          message={loadingHeads && data !== "all" && data !== "photo" ? "Audience cards are still loading; counts fill in as they arrive." : "Nothing in this owner's inventory matches the search and filters."}
          action={<Button variant="ghost" onClick={clear} data-testid="owner-clear">Clear filters</Button>}
        />
      ) : (
        <>
          <FaceRows faces={shown.slice(0, limit)} heads={heads} onRetry={retry} />
          {shown.length > limit ? (
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <span className="text-small text-muted">Showing {limit} of {shown.length}</span>
              <Button variant="ghost" size="sm" data-testid="owner-more" onClick={() => setLimit((l) => l + PAGE)}>
                Show {Math.min(PAGE, shown.length - limit)} more
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
