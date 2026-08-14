// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.druid-wild-shape-known-form
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.WILD_SHAPE_FORM_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.STAT_BLOCK.ATTACK_CONTROL

import type {
  CharacterAttackExecutionSelection,
  StatBlockAttackExecutionSelection,
  BoundSupportedAttackActionOption,
  StatBlockAttackSection,
  SupportedAttackActionOption,
} from "../battle-action-options.ts";
import { attackExecutionSelectionForOption } from "../battle-action-options.ts";
import type {
  BattleStatBlockProcedureExecutionRef,
  CombatantId,
} from "../identity.ts";
import {
  type BattleState,
  type StatBlockBattleCreatureState,
} from "../battle-state-execution.ts";
import {
  statBlockProcedureBinding,
  spendStatBlockProcedureResources,
} from "../stat-block-execution-state.ts";
export { statBlockAttackActionOptions } from "../stat-block-execution-state.ts";
import {
  activeDruidWildShape,
  spendActiveDruidWildShapeProcedureResources,
} from "./druid-wild-shape.ts";

export function attackActionOptionIsOrdinaryAttackAction(
  state: BattleState,
  actorId: CombatantId,
  attack: SupportedAttackActionOption,
): boolean {
  return (
    attack.kind !== "statBlockAttack" ||
    statBlockAttackProcedureSection(state, actorId, attack.procedureRef) ===
      "actions"
  );
}

export function statBlockAttackProcedureSection(
  state: BattleState,
  actorId: CombatantId,
  procedureRef: BattleStatBlockProcedureExecutionRef,
): StatBlockAttackSection | null {
  const actor = state.combatants.get(actorId);
  const execution =
    actor?.origin.kind === "statBlock"
      ? actor.origin.execution
      : activeDruidWildShape(actor)?.admission.execution;
  if (execution === undefined) return null;
  const binding = statBlockProcedureBinding(execution, procedureRef);
  return binding?.procedure.kind === "attack"
    ? binding.procedure.section
    : null;
}

export function spendStatBlockAttackResources(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly attack: SupportedAttackActionOption;
}): BattleState {
  if (input.attack.kind !== "statBlockAttack") return input.state;
  const actor = input.state.combatants.get(input.actorId);
  const wildShape = activeDruidWildShape(actor);
  if (actor?.origin.kind === "character" && wildShape !== null) {
    return {
      ...input.state,
      combatants: new Map(input.state.combatants).set(
        input.actorId,
        spendActiveDruidWildShapeProcedureResources(
          actor,
          input.attack.procedureRef,
        ),
      ),
    };
  }
  if (actor?.origin.kind !== "statBlock") return input.state;

  const execution = spendStatBlockProcedureResources(
    actor.origin.execution,
    input.attack.procedureRef,
  );
  return {
    ...input.state,
    combatants: new Map(input.state.combatants).set(input.actorId, {
      ...actor,
      origin: { ...actor.origin, execution },
    }),
  };
}

export function updateStatBlockActorResources(
  state: BattleState,
  actor: StatBlockBattleCreatureState,
  procedureRef: BattleStatBlockProcedureExecutionRef,
): BattleState {
  const currentActor = state.combatants.get(actor.combatantId);
  if (currentActor?.origin.kind !== "statBlock") return state;
  const execution = spendStatBlockProcedureResources(
    currentActor.origin.execution,
    procedureRef,
  );
  return {
    ...state,
    combatants: new Map(state.combatants).set(actor.combatantId, {
      ...currentActor,
      origin: { ...currentActor.origin, execution },
    }),
  };
}

export function attackSubjectPart(attack: BoundSupportedAttackActionOption):
  | (CharacterAttackExecutionSelection & {
      readonly statBlockDamageNotation?: never;
    })
  | (StatBlockAttackExecutionSelection & {
      readonly statBlockDamageNotation?: "static";
    }) {
  return attackExecutionSelectionForOption(attack);
}
