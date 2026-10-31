import { AppGuard } from "@/components/auth/AppGuard";
import { AppShell } from "@/components/shell/AppShell";

export default function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <AppShell>
      <AppGuard>{children}</AppGuard>
    </AppShell>
  );
}
