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
): DifficultyClass | null {
  const caster = state.combatants.get(casterId);
  if (caster?.origin.kind !== "character") {
    return null;
  }
  const spellcasting = caster.origin.spellcasting;
  if (spellcasting === undefined) {
    return null;
  }
  return difficultyClass(
    8 +
      Number(spellcasting.spellcastingAbilityModifier) +
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
            modifier.sourceClassName === spellcasting.sourceClassName
              ? modifierTotal + modifier.saveDcBonus
              : modifierTotal,
          0,
        )
      );
    },
    0,
  );
}
