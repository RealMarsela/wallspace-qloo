import type { Metadata } from "next";
import { HowItWorks } from "@/components/learn/HowItWorks";

export const metadata: Metadata = { title: "How it works", description: "The route a brief takes: every model, guardrail and Qloo call, each linked to where it runs." };

export default function HowPage() {
  return <HowItWorks variant="app" />;
}
