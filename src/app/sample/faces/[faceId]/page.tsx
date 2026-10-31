import { Suspense } from "react";
import { FaceSheet } from "@/components/face/FaceSheet";
import { FaceSkeleton } from "@/components/face/FaceSkeleton";
import { SAMPLE_PLAN_ID } from "@/lib/routes";

export const metadata = { title: "Sample face" };

export default function SampleFacePage({ params }: PageProps<"/sample/faces/[faceId]">) {
  return (
    <Suspense fallback={<FaceSkeleton />}>
      {params.then(({ faceId }) => (
        <FaceSheet planId={SAMPLE_PLAN_ID} faceId={decodeURIComponent(faceId)} />
      ))}
    </Suspense>
  );
}
