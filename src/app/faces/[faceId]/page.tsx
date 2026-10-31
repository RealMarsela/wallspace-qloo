import type { Metadata } from "next";
import { PublicFaceCard } from "@/components/owner/PublicFaceCard";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNav } from "@/components/site/SiteNav";

export async function generateMetadata({ params }: PageProps<"/faces/[faceId]">): Promise<Metadata> {
  const { faceId } = await params;
  const id = decodeURIComponent(faceId);
  return {
    title: `${id} audience card`,
    description: "Who lives around this Atlanta billboard face, by taste, and which brands' fans over-index there. Aggregate taste by place, never identity.",
  };
}

/** Public audience card: the link inside pitch e-mails. Site frame (nav + footer), no app shell, no sign-in. */
export default async function AudienceCardPage({ params }: PageProps<"/faces/[faceId]">) {
  const { faceId } = await params;
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteNav />
      <PublicFaceCard faceId={decodeURIComponent(faceId)} />
      <SiteFooter cta={false} />
    </div>
  );
}
