import type { ReactNode } from "react";
import { Tooltip } from "@/components/ui/Tooltip";
import { Pen, Shield, Viewfinder } from "@/components/ui/icons";
import type { PickChecks } from "./plan-derive";

function Chip({ cls, icon, children, tip, testId }: { cls: string; icon: ReactNode; children: ReactNode; tip: string; testId: string }) {
  return (
    <Tooltip tip={tip} focusable>
      <span data-testid={testId} className={`inline-flex items-center gap-1 whitespace-nowrap rounded-xs border px-1.5 py-px text-[0.68rem] ${cls}`}>
        {icon}
        {children}
      </span>
    </Tooltip>
  );
}

/** Per-pick status chips: NeMo-checked, vision-checked, redrafted (and taste shifted after a re-scan). */
export function CheckChips({ checks, faceId, shifted = false, compact = false }: { checks: PickChecks; faceId: string; shifted?: boolean; compact?: boolean }) {
  const none = !checks.nemo && !checks.vision && !checks.redrafted && !shifted;
  return (
    <span className="flex flex-wrap gap-1">
      {checks.nemo ? (
        <Chip testId={`pick-check-nemo-${faceId}`} cls="border-park/45 bg-park-soft text-park-deep" icon={<Shield size={12} />} tip="The chosen line passed NeMo Guardrails (Nebius job).">
          {compact ? "NeMo" : "NeMo-checked"}
        </Chip>
      ) : null}
      {checks.vision ? (
        <Chip testId={`pick-check-vision-${faceId}`} cls="border-cobalt/35 bg-cobalt-soft text-cobalt-deep" icon={<Viewfinder size={12} />} tip="Nemotron 3.5 Super VL read the site photo: sightline and clutter.">
          {compact ? "Vision" : "Vision-checked"}
        </Chip>
      ) : null}
      {checks.redrafted ? (
        <Chip testId={`pick-check-redrafted-${faceId}`} cls="border-lilac/50 bg-lilac-soft text-lilac-deep" icon={<Pen size={12} />} tip="Nemotron 3 Ultra 550B flagged the first lines; Lightning redrafted them.">
          Redrafted
        </Chip>
      ) : null}
      {shifted ? (
        <span data-testid={`pick-taste-shifted-${faceId}`} className="inline-flex items-center whitespace-nowrap rounded-xs border border-signal/50 bg-signal-soft px-1.5 py-px text-[0.68rem] text-signal-deep">
          Taste shifted
        </span>
      ) : null}
      {none ? <span className="text-[0.68rem] text-muted">Live guard passed</span> : null}
    </span>
  );
}
