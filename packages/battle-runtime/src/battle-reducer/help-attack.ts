import type {
  BattleHelpAttackAllyDecisionHole,
  BattleHelpAttackEnemyDecisionHole,
  BattleState,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import {
  HELP_ATTACK_ALLY_HOLE_ID,
  HELP_ATTACK_ALLY_HOLE_INSTANCE,
  HELP_ATTACK_TARGET_HOLE_ID,
  HELP_ATTACK_TARGET_HOLE_INSTANCE,
} from "./battle-runtime-protocol.ts";
import { zeroHpLifecycleIsTerminal } from "./creature-state-leaves.ts";

export function helpAttackAllyHole(
  state: BattleState,
  helperId: CombatantId,
): BattleHelpAttackAllyDecisionHole {
  return {
    kind: "helpAttackAllyDecision",
    holeInstanceKey: HELP_ATTACK_ALLY_HOLE_INSTANCE,
    holeId: HELP_ATTACK_ALLY_HOLE_ID,
    label: "Help ally",
    helperId,
    choices: helpAttackAllyChoices(state, helperId),
  };
}

export function helpAttackTargetHole(
  state: BattleState,
  helperId: CombatantId,
  allyId: CombatantId,
): BattleHelpAttackEnemyDecisionHole {
  return {
    kind: "helpAttackEnemyDecision",
    holeInstanceKey: HELP_ATTACK_TARGET_HOLE_INSTANCE,
    holeId: HELP_ATTACK_TARGET_HOLE_ID,
    label: "Help attack target",
    helperId,
    allyId,
    choices: helpAttackTargetChoices(state, helperId, allyId),
  };
}

export function helpAttackAllyChoices(
  state: BattleState,
  helperId: CombatantId,
): readonly CombatantId[] {
  const participants = helpAttackParticipantChoices(state, helperId);
  return participants.length >= 2 ? participants : [];
}

export function helpAttackTargetChoices(
  state: BattleState,
  helperId: CombatantId,
  allyId: CombatantId,
): readonly CombatantId[] {
  if (!helpAttackAllyChoices(state, helperId).includes(allyId)) return [];
  return helpAttackParticipantChoices(state, helperId).filter(
    (combatantId) => combatantId !== allyId,
  );
}

function helpAttackParticipantChoices(
  state: BattleState,
  helperId: CombatantId,
): readonly CombatantId[] {
  return [...state.combatants]
    .filter(
      ([combatantId, combatant]) =>
        combatantId !== helperId && !zeroHpLifecycleIsTerminal(combatant),
    )
    .map(([combatantId]) => combatantId);
}
