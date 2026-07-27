import { hasCondition } from "@dnd/shared-algebras/conditions-algebra";
import {
  CHARACTER_UNIT_FEATURE_PROCEDURE_QUERY,
  characterUnitProcedure,
  type UnitFeatureProcedureExecution,
} from "../character-execution-queries.ts";
import type {
  ActiveOngoingFeatureOccurrence,
  BattleCreatureState,
  BattleState,
  CharacterBattleCreatureState,
  OngoingFeatureSourceKey,
} from "../battle-state-execution.ts";
import { combatantWearingArmorCategory } from "./creature-state-leaves.ts";

export function isCharacterBattleCreatureState(
  actor: BattleCreatureState | undefined,
): actor is CharacterBattleCreatureState {
  return actor?.origin.kind === "character";
}

export function ongoingFeatureProfileForSourceKey(
  combatant: BattleCreatureState,
  key: OngoingFeatureSourceKey,
): Extract<
  UnitFeatureProcedureExecution,
  { readonly kind: "ongoingFeature" }
> | null {
  if (!isCharacterBattleCreatureState(combatant)) return null;
  const procedure = characterUnitProcedure(
    combatant.origin.execution,
    key,
    CHARACTER_UNIT_FEATURE_PROCEDURE_QUERY,
  );
  return procedure?.kind === "unitFeature" &&
    procedure.execution.kind === "ongoingFeature"
    ? procedure.execution
    : null;
}

export function activeOngoingFeatureOccurrencesForCombatant(
  state: BattleState,
  combatant: BattleCreatureState,
): ReadonlyMap<OngoingFeatureSourceKey, ActiveOngoingFeatureOccurrence> {
  return new Map(
    [...combatant.activeOngoingFeatureOccurrences].filter(([key]) => {
      const profile = ongoingFeatureProfileForSourceKey(combatant, key);
      return (
        profile !== null &&
        !profile.lifecycle.earlyEndConditions.some((condition) =>
          hasCondition(combatant.conditions, condition),
        ) &&
        !profile.lifecycle.earlyEndArmorCategories.some((category) =>
          combatantWearingArmorCategory(state, combatant, category),
        )
      );
    }),
  );
}
