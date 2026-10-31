import type { Face } from "@/contract";
import { SHEET_FACE_COLUMNS, SHEET_SUMMARY_TAB, type PlanData } from "@/contract/connectors-records";
import { venueTypeFor } from "../ooh/taxonomy";
import { dealName, flightDates, planUrl } from "../records/dates";

export type Cell = string | number | boolean;
export type FacesRow = Record<(typeof SHEET_FACE_COLUMNS)[number], Cell>;
export interface SheetExport {
  title: string;
  faceRows: FacesRow[]; // header keys are the object keys, in SHEET_FACE_COLUMNS order
  facesValues: Cell[][]; // header row + one row per face
  summaryValues: Cell[][];
}

function flags(face: Face | undefined, p: PlanData["plan"]["picks"][number], brandSample: boolean): string {
  const out = ["sample rate"];
  if (face?.location === "sample") out.push("sample position");
  if (brandSample) out.push("sample brand");
  if (p.tasteShifted) out.push("taste shifted");
  if (p.review.status !== "ok") out.push(`review ${p.review.status}`);
  return out.join("; ");
}

function guardLabel(p: PlanData["plan"]["picks"][number]): string {
  const line = p.copy[p.chosenCopy];
  if (!line) return "no copy";
  return line.nemo ? `${line.guard.status} (live), ${line.nemo.status} (NeMo)` : `${line.guard.status} (live)`;
}

export function planToSheet(input: PlanData, appUrl: string): SheetExport {
  const { plan, brief, faces } = input;
  const byId = new Map(faces.map((f) => [f.id, f]));
  const faceRows: FacesRow[] = [];
  for (const p of [...plan.picks].sort((a, b) => a.rank - b.rank)) {
    const f = byId.get(p.faceId);
    const vt = f ? venueTypeFor(f) : null;
    faceRows.push({
      Rank: p.rank,
      "Face ID": p.faceId,
      Kind: f?.kind ?? "",
      "Venue type (OpenOOH)": vt ? `${vt.id} ${vt.name}` : "",
      Street: f?.name ?? "",
      Neighbourhood: f?.neighbourhood ?? "",
      Lat: f?.lat ?? "",
      Lng: f?.lng ?? "",
      Affinity: Math.round(p.affinity * 1000) / 1000,
      "Cost USD": p.costUsd,
      "Chosen copy": p.copy[p.chosenCopy]?.text ?? "",
      "Copy line 1": p.copy[0]?.text ?? "",
      "Copy line 2": p.copy[1]?.text ?? "",
      "Copy line 3": p.copy[2]?.text ?? "",
      Guard: guardLabel(p),
      Flags: flags(f, p, brief.brandSample),
    });
  }
  const dates = flightDates(brief.flightStart, brief.flightWeeks);
  const title = `Wallspace plan · ${dealName(brief.brandName, brief.flightStart)}`;
  const summaryValues: Cell[][] = [
    [SHEET_SUMMARY_TAB, title],
    ["Plan link", planUrl(appUrl, plan.id)],
    ["Advertiser", brief.brandName],
    ["Audience", brief.audienceText],
    ["Flight start", dates.posting],
    ["Flight end (takedown)", dates.takedown],
    ["Weeks", brief.flightWeeks],
    ["Budget USD", brief.budgetUsd],
    ["Planned spend USD", plan.spendUsd],
    ["Faces", plan.picks.length],
    [],
    ["Budget split", "USD", "Share"],
    ...plan.split.map((s): Cell[] => [s.neighbourhood, s.usd, Math.round(s.share * 1000) / 1000]),
    [],
    ["How to use", "Edit Cost USD or Chosen copy on the Faces tab. Wallspace reads the edit back into the plan event log."],
    ["Honest labels", "Faces, rates and the brand are labelled sample where they are sample. Affinity is taste by place, never identity."],
  ];
  const header = [...SHEET_FACE_COLUMNS] as string[];
  const facesValues: Cell[][] = [header, ...faceRows.map((r) => header.map((h) => r[h as keyof FacesRow]))];
  return { title, faceRows, facesValues, summaryValues };
}
