import type { Metadata } from "next";
import { AudienceCardView } from "@/components/owner/AudienceCardView";
import { PageFrame } from "@/components/shell/PageHeader";

export async function generateMetadata({ params }: PageProps<"/app/owner/faces/[faceId]">): Promise<Metadata> {
  const { faceId } = await params;
  return { title: `${decodeURIComponent(faceId)} audience card`, description: "Who lives around this face, which brands to pitch, and the pitch flow." };
}

export default async function OwnerFacePage({ params }: PageProps<"/app/owner/faces/[faceId]">) {
  const { faceId } = await params;
  return (
    <PageFrame testId="owner-face-page">
      <AudienceCardView faceId={decodeURIComponent(faceId)} />
    </PageFrame>
  );
}
