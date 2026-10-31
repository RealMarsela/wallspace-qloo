import type { Metadata } from "next";
import { PublicPage } from "@/components/site/PublicPage";
import { LimitsView } from "./LimitsView";

export const metadata: Metadata = {
  title: "Limits",
  description: "What Wallspace cannot do yet, with real numbers from its run log: cost per plan, dropped faces, guard misses, coverage gaps.",
};

export default function LimitsPage() {
  return (
    <PublicPage
      testId="limits-page"
      wide
      eyebrow="Measured, not claimed"
      title="Limits"
      lede="What Wallspace cannot do yet, and how often it gets things wrong, taken from the run log. Every number on this page is read live from the app."
    >
      <LimitsView />
    </PublicPage>
  );
}
