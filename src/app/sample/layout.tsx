import { AppShell } from "@/components/shell/AppShell";

// The public read-only sample plan: same frame as the product, no guard, so a judge can open it signed out.
export default function SampleLayout({ children }: LayoutProps<"/sample">) {
  return <AppShell>{children}</AppShell>;
}
