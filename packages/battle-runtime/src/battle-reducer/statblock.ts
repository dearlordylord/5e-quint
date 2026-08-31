// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.druid-wild-shape-known-form
// RAW-COVERAGE: runtime-owner RAW-STAT-BLOCK-BONUS-ACTION-LIFECYCLE-001 RAW-STAT-BLOCK-LEGENDARY-ACTION-LIFECYCLE-001 RAW-STAT-BLOCK-MULTIATTACK-001 RAW-STAT-BLOCK-LIMITED-USAGE-001
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-slow-active-penalties stat-block.bonus-action-lifecycle stat-block.legendary-action-lifecycle stat-block.multiattack stat-block.resource-lifecycle
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.WILD_SHAPE_FORM_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SLOW_ACTIVE_PENALTIES_LIFECYCLE BATTLE.SPELL.SLOW_MULTIATTACK_ATTACK_CAP BATTLE.STAT_BLOCK.BONUS_ACTION_LIFECYCLE BATTLE.STAT_BLOCK.LEGENDARY_ACTION_LIFECYCLE BATTLE.STAT_BLOCK.MULTIATTACK BATTLE.STAT_BLOCK.RESOURCE_LIFECYCLE

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
  type BattleCreatureState,
  type BattleState,
  type StatBlockBattleCreatureState,
} from "../battle-state-execution.ts";
import {
  statBlockProcedureBinding,
  spendStatBlockProcedureResources,
  type StatBlockMultiattackDispatchResourceDemand,
  type StatBlockMultiattackProcedure,
  type StatBlockProcedureBindingFor,
} from "../stat-block-execution-state.ts";
export { statBlockAttackActionOptions } from "../stat-block-execution-state.ts";
import {
  activeDruidWildShape,
  spendActiveDruidWildShapeProcedureResources,
} from "./druid-wild-shape.ts";
import { slowActivePenaltiesEffects } from "./slow-active-penalties-effects.ts";

export function statBlockMultiattackDispatchResourceDemandForActor(
  actor: StatBlockBattleCreatureState,
  binding: StatBlockProcedureBindingFor<StatBlockMultiattackProcedure>,
): StatBlockMultiattackDispatchResourceDemand {
  return {
    kind:
      slowActivePenaltiesEffects(actor).length > 0
        ? "oneListedDispatch"
        : "allListedDispatches",
    procedureRefs: binding.procedure.dispatchProcedureRefs,
  };
}

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
  const execution = statBlockExecutionForActor(actor);
  if (execution === undefined) return null;
  const binding = statBlockProcedureBinding(execution, procedureRef);
  return statBlockAttackBindingSection(binding);
}

function statBlockExecutionForActor(actor: BattleCreatureState | undefined) {
  if (actor?.origin.kind === "statBlock") return actor.origin.execution;
  return activeDruidWildShape(actor)?.admission.execution;
}

function statBlockAttackBindingSection(
  binding: ReturnType<typeof statBlockProcedureBinding>,
): StatBlockAttackSection | null {
  if (binding?.procedure.kind === "attack") return binding.procedure.section;
  if (binding?.procedure.kind === "unarmedStrike") {
    return binding.procedure.section;
  }
  return null;
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

export function attackSubjectPart(
  attack: BoundSupportedAttackActionOption,
): CharacterAttackExecutionSelection | StatBlockAttackExecutionSelection {
  return attackExecutionSelectionForOption(attack);
}
