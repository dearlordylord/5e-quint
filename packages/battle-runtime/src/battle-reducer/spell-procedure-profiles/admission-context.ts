import type {
  BattleCreatureState,
  BattleState,
} from "../../battle-state-execution.ts";
import {
  spellAdmissionBattleProjection,
  type SpellAdmissionActor,
  type SpellAdmissionContext,
} from "./profile.ts";

function isSpellAdmissionActor(
  actor: BattleCreatureState,
): actor is SpellAdmissionActor {
  return (
    actor.origin.kind === "character" &&
    actor.origin.spellcasting !== undefined &&
    actor.origin.spellcasting.canCastSpells
  );
}

export function spellAdmissionContextFor(
  actor: BattleCreatureState,
  state: BattleState | undefined,
): Omit<SpellAdmissionContext, "castingSource"> | null {
  if (!isSpellAdmissionActor(actor)) return null;
  return {
    actor,
    battle: spellAdmissionBattleProjection(state),
    spellCastOptions: actor.origin.spellcasting.spellSlots.map((slot) => ({
      spellLevel: slot.spellLevel,
      payment: { tag: "slot" },
    })),
  };
}
