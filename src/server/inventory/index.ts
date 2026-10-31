import { z } from "zod";
import type { Face, MediaOwner } from "@/contract";
import { faceById, faces, neighbourhoodsWithFaces, owners } from "@/data/faces";

export const FaceResponse = z.object({ face: z.custom<Face>(), owner: z.custom<MediaOwner>().nullable() });
export type FaceResponse = { face: Face; owner: MediaOwner | null };

export const FacesQuery = z.object({ neighbourhood: z.string().trim().min(1).max(80).optional() });

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/** All faces and owners, or the faces of one neighbourhood (case-insensitive). null when the neighbourhood has no inventory. */
export function listFaces(neighbourhood?: string): { faces: Face[]; owners: MediaOwner[] } | null {
  if (!neighbourhood) return { faces, owners };
  const want = norm(neighbourhood);
  const subset = faces.filter((f) => norm(f.neighbourhood) === want);
  if (!subset.length) return null;
  const ids = new Set(subset.map((f) => f.ownerId));
  return { faces: subset, owners: owners.filter((o) => ids.has(o.id)) };
}

export function getFace(id: string): FaceResponse | null {
  const face = faceById(id);
  if (!face) return null;
  return { face, owner: owners.find((o) => o.id === face.ownerId) ?? null };
}

export { neighbourhoodsWithFaces };
