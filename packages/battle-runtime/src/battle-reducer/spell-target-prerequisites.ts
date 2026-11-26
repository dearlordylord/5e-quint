// A spell target's prerequisites that don't depend on where it stands: no
// magical-effect interdiction, and whatever the spell's procedure requires
// of the target itself. Its imports stay below the spell routes, so the
// saving throw modifier collector can read it.
import { deathSaveStateIsDead } from "@dnd/shared-algebras/death-saves-algebra";
import type {
  BattleCreatureState,
  BattleState,
} from "../battle-state-execution.ts";
import type { RuntimeSpellProcedureExecution } from "../character-execution.ts";
import type { CombatantId } from "../identity.ts";
import { combatantWearingArmor } from "./creature-state-leaves.ts";
import { battleCreatureType } from "./domain-helpers.ts";
import {
  SPELL_MAGICAL_EFFECT_SOURCE,
  magicalEffectTargetsInterdictionMessage,
} from "./magic-suppression-magical-effect-interdiction.ts";

type RuntimeSpellProcedure = RuntimeSpellProcedureExecution;

export function spellTargetHasNonSpatialPrerequisites(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  invocation: RuntimeSpellProcedure,
): boolean {
  const target = state.combatants.get(targetId);
  if (
    magicalEffectTargetsInterdictionMessage({
      state,
      source: SPELL_MAGICAL_EFFECT_SOURCE,
      targetIds: [targetId],
    }) !== null
  ) {
    return false;
  }
  if (
    invocation.procedure === "persistentArmorEffect" &&
    target !== undefined &&
    combatantWearingArmor(state, target)
  ) {
    return false;
  }
  if (
    invocation.procedure === "markedDamageRider" &&
    invocation.action === "transfer" &&
    targetId === invocation.activeEffect.targetCombatantId
  ) {
    return false;
  }
  if (
    invocation.procedure === "linkedDefenseResistanceDamageShare" &&
    targetId === actorId
  ) {
    return false;
  }
  if (invocation.procedure === "makeStable") {
    return target !== undefined && combatantCanBeMadeStable(target);
  }
  const targetCreatureType =
    target === undefined ? null : battleCreatureType(target);
  if (
    invocation.procedure === "saveGatedCondition" &&
    invocation.targetCreatureTypes !== null &&
    (targetCreatureType === null ||
      !invocation.targetCreatureTypes.includes(targetCreatureType))
  ) {
    return false;
  }
  return target !== undefined;
}

function combatantCanBeMadeStable(combatant: BattleCreatureState): boolean {
  return (
    Number(combatant.hp) === 0 &&
    combatant.zeroHpLifecycle.policy === "usesDeathSavingThrows" &&
    !deathSaveStateIsDead(combatant.zeroHpLifecycle.deathSaves)
  );
}
