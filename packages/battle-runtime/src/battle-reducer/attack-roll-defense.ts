// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.ATTACK_ROLL_DEFENSE
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.attack-roll-defense
// RAW: .references/srd-5.2.1/classes.md:6825-6832.
import { Match } from "effect";
import type {
  BattleState,
  BattleCreatureState,
} from "../battle-state-execution.ts";
import type { BattleProcedureExecutionRef, CombatantId } from "../identity.ts";

function defenses(creature: BattleCreatureState | undefined) {
  return creature?.origin.kind === "character"
    ? creature.origin.execution.procedureBindings.flatMap(
        ({ procedureRef, procedure }) =>
          procedure.kind === "unitSupportProfile" &&
          typeof procedure.execution !== "string" &&
          procedure.execution.kind === "attackRollDefense"
            ? [{ procedureRef, selection: procedure.execution.selection }]
            : [],
      )
    : [];
}

export function attackRollDefenseGrantsDisadvantage(input: {
  readonly state: BattleState;
  readonly attackerId: CombatantId;
  readonly defenderId: CombatantId;
  readonly opportunityAttack: boolean;
}): boolean {
  return defenses(input.state.combatants.get(input.defenderId)).some(
    (defense) =>
      Match.value(defense.selection).pipe(
        Match.when(
          "opportunityAttackDisadvantage",
          () => input.opportunityAttack,
        ),
        Match.when("repeatAttackerAfterHitDisadvantage", () =>
          input.state.currentTurnResources.attackRollDefensesTriggeredThisTurn.some(
            (effect) =>
              effect.sourceProcedureRef === defense.procedureRef &&
              effect.defenderId === input.defenderId &&
              effect.attackerId === input.attackerId,
          ),
        ),
        Match.exhaustive,
      ),
  );
}

export type AttackRollDefenseTurnEffect = {
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly defenderId: CombatantId;
  readonly attackerId: CombatantId;
};

export function recordAttackRollDefenseHit(
  state: BattleState,
  attackerId: CombatantId,
  defenderId: CombatantId,
  hit: boolean,
): BattleState {
  if (!hit) return state;
  const effects = defenses(state.combatants.get(defenderId)).flatMap(
    (defense): readonly AttackRollDefenseTurnEffect[] =>
      defense.selection === "repeatAttackerAfterHitDisadvantage" &&
      !state.currentTurnResources.attackRollDefensesTriggeredThisTurn.some(
        (effect) =>
          effect.sourceProcedureRef === defense.procedureRef &&
          effect.defenderId === defenderId &&
          effect.attackerId === attackerId,
      )
        ? [{ sourceProcedureRef: defense.procedureRef, defenderId, attackerId }]
        : [],
  );
  return effects.length === 0
    ? state
    : {
        ...state,
        currentTurnResources: {
          ...state.currentTurnResources,
          attackRollDefensesTriggeredThisTurn: [
            ...state.currentTurnResources.attackRollDefensesTriggeredThisTurn,
            ...effects,
          ],
        },
      };
}
