// Product navigation, grouped like the shadcn/ReUI application sidebar. Signed-out visitors (the public /sample subtree)
// get the public versions of the Learn pages so a judge never meets a sign-in wall.
export type NavIcon = "dashboard" | "brief" | "sample" | "compare" | "inventory" | "connections" | "how" | "help";

export interface NavItem {
  id: string;
  href: string;
  publicHref?: string;
  label: string;
  icon: NavIcon;
  match: (path: string) => boolean;
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    id: "plan",
    label: "Plan",
    items: [
      { id: "plan", href: "/app", label: "Dashboard", icon: "dashboard", match: (p) => p === "/app" || p.startsWith("/app/plans") || p.startsWith("/app/runs") },
      { id: "new", href: "/app/new", label: "New brief", icon: "brief", match: (p) => p.startsWith("/app/new") },
      { id: "sample", href: "/sample", label: "Sample plan", icon: "sample", match: (p) => p === "/sample" || p.startsWith("/sample/faces") || p.startsWith("/sample/run") },
      { id: "compare", href: "/app/compare", label: "Compare blocks", icon: "compare", match: (p) => p.startsWith("/app/compare") },
    ],
  },
  { id: "owner", label: "Media owner", items: [{ id: "owner", href: "/app/owner", label: "Inventory", icon: "inventory", match: (p) => p.startsWith("/app/owner") }] },
  { id: "workspace", label: "Workspace", items: [{ id: "connections", href: "/app/connections", label: "Connections", icon: "connections", match: (p) => p.startsWith("/app/connections") }] },
  {
    id: "learn",
    label: "Learn",
    items: [
      { id: "how", href: "/app/how", publicHref: "/sample/how", label: "How it works", icon: "how", match: (p) => p.endsWith("/how") },
      { id: "help", href: "/app/help", publicHref: "/sample/help", label: "Help", icon: "help", match: (p) => p.endsWith("/help") },
    ],
  },
];

/** The page title for the phone top bar. */
export function currentLabel(path: string): string {
  for (const g of navGroups) for (const i of g.items) if (i.match(path)) return i.label;
  return "Wallspace";
}
