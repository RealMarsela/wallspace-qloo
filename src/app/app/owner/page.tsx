import type { Metadata } from "next";
import { OwnerInventory } from "@/components/owner/OwnerInventory";
import { PageFrame, PageHeader } from "@/components/shell/PageHeader";
import { Em } from "@/components/ui/SectionHeading";

export const metadata: Metadata = {
  title: "Faces",
  description: "Media-owner inventory: who lives around each face, by taste, and which brands to pitch it to.",
};

export default function OwnerInventoryPage() {
  return (
    <PageFrame testId="owner-page">
      <PageHeader
        eyebrow="Media owner · Inventory"
        title={<>Your faces, by who <Em>lives</Em> around them</>}
        lede="What the people around each face love, ranked against Atlanta as a whole, and the brands whose fans over-index there. Aggregate taste by place from Qloo, never identity."
        street
      />
      <OwnerInventory />
    </PageFrame>
  );
}
