import type { BattleActPresentation } from "@dnd/battle-runtime";
import { Match } from "effect";
import type { AdminMirrorProjectionEnvelope } from "./admin-mirror-contract.ts";

export function battleActTimelineLabel(
  presentation: BattleActPresentation,
  selectedContent: AdminMirrorProjectionEnvelope["selectedContent"],
): string | null {
  return Match.value(presentation).pipe(
    Match.when({ kind: "intrinsic" }, () => null),
    Match.when({ kind: "attack" }, ({ name }) => name),
    Match.when({ kind: "spell" }, ({ invocation }) =>
      selectedContent?.kind === "spell" &&
      selectedContent.id === invocation.spellId
        ? selectedContent.name
        : null,
    ),
    Match.when({ kind: "unit" }, ({ unitId }) => {
      if (selectedContent === null || selectedContent.id !== unitId)
        return null;
      return "syntheticLabel" in selectedContent
        ? selectedContent.syntheticLabel
        : selectedContent.kind === "statBlock"
          ? null
          : selectedContent.name;
    }),
    Match.when({ kind: "druidWildShapeForm" }, ({ formStatBlockId }) =>
      selectedContent?.kind === "statBlock" &&
      selectedContent.id === formStatBlockId
        ? selectedContent.name
        : null,
    ),
    Match.exhaustive,
  );
}
