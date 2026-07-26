import type { ActivationPhase, SpellRecord } from "@dnd/surface/surface/types";

type SaveGatePhase = Extract<ActivationPhase, { readonly kind: "save_gate" }>;
type HoleAttachment = Extract<
  SaveGatePhase["attachment"],
  { readonly kind: "hole" }
>;

export function hasSingleDirectSelfNoEffectPhase(spell: SpellRecord): boolean {
  return (
    spell.mechanics.family === "activation" &&
    spell.mechanics.phases.some(
      (phase) =>
        phase.kind === "direct" &&
        phase.attachment.kind === "self" &&
        (phase.effects ?? []).length === 1 &&
        phase.effects?.[0]?.kind === "none",
    )
  );
}

export function hasWisdomSaveGatePhase(
  spell: SpellRecord,
  holeId: string,
  supports: (phase: SaveGatePhase, attachment: HoleAttachment) => boolean,
): boolean {
  if (spell.mechanics.family !== "activation") return false;
  return spell.mechanics.phases.some((phase) => {
    if (
      phase.kind !== "save_gate" ||
      phase.ability !== "wis" ||
      phase.dc.kind !== "caster_spell_save_dc" ||
      phase.attachment.kind !== "hole" ||
      phase.attachment.holeId !== holeId
    ) {
      return false;
    }
    return supports(phase, phase.attachment);
  });
}
