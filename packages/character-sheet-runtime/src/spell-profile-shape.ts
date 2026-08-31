import type { ActivationPhase } from "@dnd/surface/surface/types";

import type { CharacterSheetSpellFacts } from "./character-spell-projection.ts";

export function characterSheetTopLevelSpellCastingTime(
  mechanics: CharacterSheetSpellFacts["mechanics"],
) {
  return "castingTime" in mechanics ? mechanics.castingTime : null;
}

type SaveGatePhase = Extract<ActivationPhase, { readonly kind: "save_gate" }>;
type HoleAttachment = Extract<
  SaveGatePhase["attachment"],
  { readonly kind: "hole" }
>;

export function hasSingleDirectSelfNoEffectPhase(
  spell: CharacterSheetSpellFacts,
): boolean {
  return (
    spell.mechanics.family === "activation" &&
    spell.mechanics.phases.some(
      (phase) =>
        phase.kind === "direct" &&
        phase.attachment.kind === "self" &&
        /* v8 ignore next -- @preserve -- Unsupported authored spell data: this shared profile requires exactly one explicit no-op effect. */
        (phase.effects ?? []).length === 1 &&
        phase.effects?.[0]?.kind === "none",
    )
  );
}

export function hasWisdomSaveGatePhase(
  spell: CharacterSheetSpellFacts,
  holeId: string,
  supports: (phase: SaveGatePhase, attachment: HoleAttachment) => boolean,
): boolean {
  /* v8 ignore start -- @preserve -- A non-activation record is unsupported authored input for a save-gate profile reader. */
  if (spell.mechanics.family !== "activation") return false;
  /* v8 ignore stop -- @preserve */
  return spell.mechanics.phases.some((phase) => {
    /* v8 ignore start -- @preserve -- A mismatched phase is unsupported authored save-gate profile data. */
    if (
      phase.kind !== "save_gate" ||
      phase.ability !== "wis" ||
      phase.dc.kind !== "caster_spell_save_dc" ||
      phase.attachment.kind !== "hole" ||
      phase.attachment.holeId !== holeId
    ) {
      return false;
    }
    /* v8 ignore stop -- @preserve */
    return supports(phase, phase.attachment);
  });
}
