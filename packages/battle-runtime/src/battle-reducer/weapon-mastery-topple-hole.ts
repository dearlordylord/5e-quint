import { difficultyClass } from "@dnd/shared/types";
import { savingThrowTargetModifiers } from "./saving-throw-modifier-collector.ts";
import type { SupportedAttackActionOption } from "../battle-action-options.ts";
import type {
  BattleUnitFeatureSavingThrowOutcomeHole,
  BattleState,
  BattleCreatureState,
} from "../battle-state-execution.ts";
import {
  WEAPON_MASTERY_TOPPLE_SAVE_HOLE_ID,
  WEAPON_MASTERY_TOPPLE_SAVE_HOLE_INSTANCE,
} from "./domain-constants.ts";
import { combatantProficiencyBonus } from "./movement-speed.ts";
import { ongoingFeatureEnemyRelationshipDecisionRequired } from "./ongoing-feature-relationship.ts";
import { selectedWeaponMasteryProperty } from "./attack-roll.ts";
import { WEAPON_MASTERY_TOPPLE_SUPPORT_PROFILE } from "../unit-feature-execution-constants.ts";

export function weaponMasteryToppleSavingThrowHole({
  state,
  attacker,
  target,
  attack,
}: {
  readonly state: BattleState;
  readonly attacker: BattleCreatureState;
  readonly target: BattleCreatureState;
  readonly attack: SupportedAttackActionOption;
}): BattleUnitFeatureSavingThrowOutcomeHole | null {
  const attackerId = attacker.combatantId;
  const selection = selectedWeaponMasteryProperty({
    attacker,
    attack,
    supportProfile: WEAPON_MASTERY_TOPPLE_SUPPORT_PROFILE,
  });
  if (selection === null) {
    return null;
  }
  return {
    kind: "savingThrowOutcome",
    holeId: WEAPON_MASTERY_TOPPLE_SAVE_HOLE_ID,
    holeInstanceKey: WEAPON_MASTERY_TOPPLE_SAVE_HOLE_INSTANCE,
    label: "Topple Constitution saving throw",
    ...(ongoingFeatureEnemyRelationshipDecisionRequired(
      state,
      attackerId,
      "enemySavingThrow",
    )
      ? {
          relationshipFactRequest: {
            kind: "savingThrowTargetIsEnemy" as const,
            actorId: attackerId,
          },
        }
      : {}),
    ability: "con",
    dc: {
      kind: "fixed",
      dc: difficultyClass(
        8 +
          Number(selection.attack.abilityModifier) +
          combatantProficiencyBonus(attacker),
      ),
    },
    targetIds: [target.combatantId],
    ...savingThrowTargetModifiers(
      state,
      { ability: "con", avoidsCondition: "prone" },
      "everyCombatant",
    ),
  };
}
