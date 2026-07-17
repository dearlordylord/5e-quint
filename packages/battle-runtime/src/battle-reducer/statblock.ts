// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.druid-wild-shape-known-form
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.WILD_SHAPE_FORM_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.STAT_BLOCK.ATTACK_CONTROL

import { Match } from "effect";
import type {
  StatBlockAttackActionOption,
  StatBlockAttackSection,
  SupportedAttackActionOption,
} from "../battle-action-options.ts";
import type { BattleProcedureExecutionRef, CombatantId } from "../identity.ts";
import {
  type BattleState,
  type StatBlockBattleCreatureState,
} from "../battle-reducer.ts";
import {
  statBlockAttackActionOptions as executionStatBlockAttackActionOptions,
  statBlockProcedureBinding,
  statBlockProcedurePresentations,
  spendStatBlockProcedureResources,
  type StatBlockExecutionAdmission,
} from "../stat-block-execution.ts";
import {
  activeDruidWildShape,
  spendActiveDruidWildShapeProcedureResources,
} from "./druid-wild-shape.ts";
import { attackActionOptionName } from "./statblock-attacks.ts";

export function statBlockAttackActionOptions(
  admission: StatBlockExecutionAdmission,
): readonly StatBlockAttackActionOption[] {
  return executionStatBlockAttackActionOptions(admission);
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
  procedureRef: BattleProcedureExecutionRef,
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

export function attackActionOptionPresentationName(
  state: BattleState,
  actorId: CombatantId,
  attack: SupportedAttackActionOption,
): string {
  if (attack.kind !== "statBlockAttack") return attackActionOptionName(attack);
  const admission = activeStatBlockExecutionAdmission(state, actorId);
  if (admission === null) return attackActionOptionName(attack);
  const presentation = statBlockProcedurePresentations(admission).find(
    (candidate) =>
      candidate.kind === "attack" &&
      candidate.procedureRef === attack.procedureRef,
  );
  return presentation?.kind === "attack"
    ? presentation.name
    : attackActionOptionName(attack);
}

function activeStatBlockExecutionAdmission(
  state: BattleState,
  actorId: CombatantId,
): StatBlockExecutionAdmission | null {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind === "statBlock") return actor.origin;
  return activeDruidWildShape(actor)?.admission ?? null;
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
  procedureRef: BattleProcedureExecutionRef,
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

export function statBlockSubjectPart(attack: SupportedAttackActionOption):
  | { readonly attackName: string }
  | {
      readonly procedureRef: BattleProcedureExecutionRef;
      readonly statBlockDamageNotation?: "static";
    } {
  return Match.value(attack).pipe(
    Match.when({ kind: "weapon" }, (option) => ({
      attackName: option.weapon.name,
    })),
    Match.when({ kind: "unarmedStrike" }, () => ({
      attackName: "Unarmed Strike",
    })),
    Match.when({ kind: "statBlockAttack" }, (option) => ({
      procedureRef: option.procedureRef,
      ...(option.damageNotation === "static"
        ? { statBlockDamageNotation: "static" as const }
        : {}),
    })),
    Match.exhaustive,
  );
}
