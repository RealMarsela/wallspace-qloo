import { Suspense } from "react";
import { FaceSheet } from "@/components/face/FaceSheet";
import { FaceSkeleton } from "@/components/face/FaceSkeleton";

export const metadata = { title: "Face" };

export default function FacePage({ params }: PageProps<"/app/plans/[planId]/faces/[faceId]">) {
  return (
    <Suspense fallback={<FaceSkeleton />}>
      {params.then(({ planId, faceId }) => (
        <FaceSheet planId={decodeURIComponent(planId)} faceId={decodeURIComponent(faceId)} />
      ))}
    </Suspense>
  );
}
