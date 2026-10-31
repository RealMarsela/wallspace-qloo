import type { Metadata } from "next";
import { SampleProvider } from "@/components/landing/data";
import { Bento } from "@/components/landing/Bento";
import { BuiltOn } from "@/components/landing/BuiltOn";
import { Connectors } from "@/components/landing/Connectors";
import { Faq } from "@/components/landing/Faq";
import { Features } from "@/components/landing/Features";
import { NightBand } from "@/components/landing/NightBand";
import { ProofCards } from "@/components/landing/ProofCards";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Hero } from "@/components/landing/Hero";
import { SiteNav } from "@/components/site/SiteNav";

export const metadata: Metadata = {
  title: { absolute: "Wallspace · put the billboard where the fans live" },
  description:
    "Wallspace picks the billboards, bus shelters and street screens where a brand's audience lives, using Qloo taste data by place instead of phone tracking, and writes a line for each face with NVIDIA Nemotron on Nebius.",
};

export default function Home() {
  return (
    <SampleProvider>
      <SiteNav />
      <main id="main" data-testid="landing" className="flex-1">
        <Hero />
        <BuiltOn />
        <Features />
        <Bento />
        <NightBand />
        <ProofCards />
        <Connectors />
        <Faq />
      </main>
      <SiteFooter />
    </SampleProvider>
  );
}
