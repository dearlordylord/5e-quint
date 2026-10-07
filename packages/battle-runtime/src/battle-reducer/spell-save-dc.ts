import { Option } from "effect";
import { creatureSpellProcedure } from "../creature-spell-procedure.ts";
import type { BattleProcedureExecutionRef } from "../identity.ts";
import { difficultyClass, type DifficultyClass } from "@dnd/shared/types";
import type {
  BattleCreatureState,
  BattleState,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import {
  activeOngoingFeatureOccurrencesForCombatant,
  isCharacterBattleCreatureState,
  ongoingFeatureProfileForSourceKey,
} from "./creature-state-execution.ts";

export function spellSaveDcForCaster(
  state: BattleState,
  casterId: CombatantId,
  sourceProcedureRef?: BattleProcedureExecutionRef,
): DifficultyClass | null {
  const caster = state.combatants.get(casterId);
  if (caster === undefined) return null;
  if (caster.origin.kind === "statBlock") {
    const invocation =
      sourceProcedureRef === undefined
        ? undefined
        : creatureSpellProcedure(caster, sourceProcedureRef);
    return invocation?.spellRuleFacts.castingSource.tag === "statBlock"
      ? Option.getOrNull(invocation.spellRuleFacts.castingSource.spellSaveDc)
      : null;
  }
  const spellcasting = caster.origin.spellcasting;
  if (
    spellcasting === undefined ||
    spellcasting.spellcastingSource.tag !== "classSpellcasting"
  ) {
    return null;
  }
  return difficultyClass(
    8 +
      Number(spellcasting.spellcastingSource.abilityModifier) +
      spellcasting.proficiencyBonus +
      activeOngoingFeatureSpellSaveDcBonus(state, caster),
  );
}

function activeOngoingFeatureSpellSaveDcBonus(
  state: BattleState,
  caster: BattleCreatureState,
): number {
  if (!isCharacterBattleCreatureState(caster)) {
    return 0;
  }
  const spellcasting = caster.origin.spellcasting;
  if (spellcasting === undefined) {
    return 0;
  }
  return [...activeOngoingFeatureOccurrencesForCombatant(state, caster)].reduce(
    (total, [key]) => {
      const profile = ongoingFeatureProfileForSourceKey(caster, key);
      if (profile === null) {
        return total;
      }
      return (
        total +
        profile.spellModifiers.reduce(
          (modifierTotal, modifier) =>
            spellcasting.spellcastingSource.tag === "classSpellcasting" &&
            modifier.sourceClassName ===
              spellcasting.spellcastingSource.className
              ? modifierTotal + modifier.saveDcBonus
              : modifierTotal,
          0,
        )
      );
    },
    0,
  );
}
