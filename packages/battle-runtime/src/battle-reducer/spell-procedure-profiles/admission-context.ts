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
): SpellAdmissionContext | null {
  if (!isSpellAdmissionActor(actor)) return null;
  return {
    actor,
    battle: spellAdmissionBattleProjection(state),
  };
}
