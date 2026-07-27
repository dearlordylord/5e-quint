import { difficultyClass } from "@dnd/shared/types";
import type { SupportedAttackActionOption } from "../battle-action-options.ts";
import type {
  BattleUnitFeatureSavingThrowOutcomeHole,
  BattleState,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import {
  WEAPON_MASTERY_TOPPLE_SAVE_HOLE_ID,
  WEAPON_MASTERY_TOPPLE_SAVE_HOLE_INSTANCE,
} from "./domain-constants.ts";
import { combatantProficiencyBonus } from "./movement-speed.ts";
import { ongoingFeatureEnemyRelationshipDecisionRequired } from "./ongoing-feature-relationship.ts";
import {
  savingThrowFlatBonusProjections,
  savingThrowRollModeProjections,
} from "./spells-damage-fills.ts";
import { weaponMasteryToppleSelection } from "./attack-roll.ts";

export function weaponMasteryToppleSavingThrowHole(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
  attack: SupportedAttackActionOption,
): BattleUnitFeatureSavingThrowOutcomeHole | null {
  const selection = weaponMasteryToppleSelection(
    state,
    attackerId,
    targetId,
    attack,
  );
  if (selection === null) {
    return null;
  }
  const attacker = state.combatants.get(attackerId);
  if (attacker === undefined) {
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
    targetIds: [targetId],
    targetRollModes: savingThrowRollModeProjections(state, "con"),
    targetFlatBonuses: savingThrowFlatBonusProjections(state, "con"),
  };
}
