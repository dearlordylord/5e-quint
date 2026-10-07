import type { StatBlockSpellInvocationAdmissionPlan } from "./stat-block-spell-invocation-admission-plan.ts";
// KERNEL-COVERAGE: runtime-owner BATTLE.STAT_BLOCK.SPELLCASTING_PROCEDURE
import {
  abilityScoreToMod,
  abilityModifier,
  attackBonus,
  difficultyClass,
  spellSlotLevel,
} from "@dnd/shared/types";
import { Match, Option, Result } from "effect";
import type {
  BattleState,
  StatBlockBattleCreatureState,
  BattleSpellAdmissionSource,
} from "./battle-state-execution.ts";
import { type StatBlockSpellDefinitionJoin } from "./procedure-admission/stat-block-spell-definition.ts";
import {
  selectStatBlockSpellInvocation,
  type SelectedStatBlockSpellInvocation,
} from "./stat-block-spell-invocation-selection.ts";
import { admitRegisteredSpellProcedureMechanics } from "./battle-reducer/spell-procedure-profiles/admission-registry.ts";
import {
  spellAdmissionBattleProjection,
  type SpellAdmissionContext,
} from "./battle-reducer/spell-procedure-profiles/profile.ts";
import { spellProcedureNonEmpty } from "./battle-reducer/spell-procedure-profiles/spell-mechanics-admission.ts";
import { battleSpellExecutionSourceFromAdmission } from "./battle-state-execution.ts";
import { spellProcedureExecution } from "./spell-procedure-execution-admission.ts";
import {
  isStatBlockSpellCastProcedureExecution,
  type StatBlockSpellInvocationDispatch,
} from "./stat-block-spell-invocation-dispatch.ts";
import { admittedStatBlockExecutionState } from "./stat-block-execution-state.ts";
import { statBlockSpellcastingActionCost } from "./stat-block-execution-state.ts";
import { mapReadonlyNonEmptyArray } from "./readonly-non-empty-array.ts";

export function admitSelectedStatBlockSpellInvocation(input: {
  readonly actor: StatBlockBattleCreatureState;
  readonly state: BattleState;
  readonly selection: SelectedStatBlockSpellInvocation;
  readonly definitionJoin: StatBlockSpellDefinitionJoin;
}): StatBlockSpellInvocationDispatch {
  const joined = input.definitionJoin;
  if (joined.kind !== "joined")
    return { kind: "unsupported", reason: joined.kind };
  if (
    input.selection.invocation.kind === "restricted" ||
    joined.value.continuation.kind === "restricted"
  ) {
    return { kind: "unsupported", reason: "unsupportedRestriction" };
  }
  const { selection } = input;
  const castingSource = {
    tag: "statBlock" as const,
    castingTime: joined.value.castingTime,
    actionCost: statBlockSpellcastingActionCost(selection.procedure),
    invocationRef: selection.ref,
    abilityModifier: abilityModifier(
      abilityScoreToMod(
        input.actor.origin.mechanics.abilityScores[selection.procedure.ability],
      ),
    ),
    spellSaveDc:
      selection.procedure.spellSaveDc === undefined
        ? Option.none()
        : Option.some(difficultyClass(selection.procedure.spellSaveDc)),
    spellAttackBonus:
      selection.procedure.spellAttackBonus === undefined
        ? Option.none()
        : Option.some(attackBonus(selection.procedure.spellAttackBonus)),
  };
  const listedComponents = selection.procedure.components;
  const definitionRuleFacts =
    listedComponents === undefined
      ? joined.value.definitionRuleFacts
      : {
          ...joined.value.definitionRuleFacts,
          components: {
            verbal: listedComponents.v,
            somatic: listedComponents.s,
            hasMaterial: listedComponents.m === "required",
            hasPricedOrConsumedMaterial:
              listedComponents.m === "required" &&
              joined.value.definitionRuleFacts.components
                .hasPricedOrConsumedMaterial,
          },
        };
  const source: BattleSpellAdmissionSource = {
    id: joined.value.definition.id,
    name: joined.value.definition.name,
    mechanics: joined.value.definition.mechanics,
    spellDefinitionRuleFacts: definitionRuleFacts,
    castingSource,
    spellAccessFreeCastResourcePoolRefs: [],
  };
  const castLevel = joined.value.castLevel;
  const context: SpellAdmissionContext = {
    kind: "statBlock",
    actor: input.actor,
    payment:
      selection.resource.kind === "atWill"
        ? { kind: "atWill" }
        : {
            kind: "limited",
            resourcePoolRef: selection.resource.resourcePoolRef,
          },
    castingSource,
    battle: spellAdmissionBattleProjection(input.state),
    spellCastOptions:
      castLevel === 0
        ? []
        : [
            {
              spellLevel: spellSlotLevel(castLevel),
              payment:
                selection.resource.kind === "atWill"
                  ? { tag: "statBlockAtWill" }
                  : {
                      tag: "statBlockLimited",
                      resourcePoolRef: selection.resource.resourcePoolRef,
                    },
            },
          ],
  };
  const staticAdmission = admitRegisteredSpellProcedureMechanics({
    mechanics: source.mechanics,
    spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
  });
  return Match.value(staticAdmission).pipe(
    Match.discriminatorsExhaustive("tag")({
      notBattleOwned: () => ({
        kind: "unsupported" as const,
        reason: "unsupportedProfile" as const,
      }),
      rejected: () => ({
        kind: "unsupported" as const,
        reason: "unsupportedProfile" as const,
      }),
      admitted: ({ procedures }): StatBlockSpellInvocationDispatch => {
        const executionSource = battleSpellExecutionSourceFromAdmission(source);
        const executions = procedures
          .flatMap(
            (
              procedure,
            ): readonly import("./battle-state-execution.ts").SupportedSpellInvocation[] =>
              procedure.binding === "static"
                ? []
                : procedure.admit(executionSource, context),
          )
          .map(spellProcedureExecution)
          .filter(isStatBlockSpellCastProcedureExecution);
        if (
          Option.isNone(castingSource.spellSaveDc) &&
          executions.some(
            (execution) =>
              "dc" in execution && execution.dc.kind === "caster_spell_save_dc",
          )
        ) {
          return { kind: "unsupported", reason: "missingCasterSaveDc" };
        }
        const nonEmpty = spellProcedureNonEmpty(executions);
        return nonEmpty === undefined
          ? { kind: "unsupported", reason: "missingChildProcedureOwner" }
          : { kind: "executable", executions: nonEmpty };
      },
    }),
  );
}

/** Consume one catalog plan against the real actor; retain only execution facts. */
export function statBlockCreatureWithAdmittedSpellInvocations(
  actor: StatBlockBattleCreatureState,
  state: BattleState,
  plan: StatBlockSpellInvocationAdmissionPlan,
): Result.Result<StatBlockBattleCreatureState, "admissionPlanMismatch"> {
  const execution = actor.origin.execution;
  const expectedCoordinates = execution.procedureBindings.flatMap((binding) => {
    const procedure = binding.procedure;
    if (procedure.kind !== "spellcasting") return [];
    return procedure.groups.flatMap((group) =>
      group.invocations.map((invocation) => ({
        procedureOrdinal: procedure.procedureOrdinal,
        groupOrdinal: group.groupOrdinal,
        invocationOrdinal: invocation.invocationOrdinal,
        invocation,
      })),
    );
  });
  const coordinateKey = (entry: {
    readonly procedureOrdinal: number;
    readonly groupOrdinal: number;
    readonly invocationOrdinal: number;
  }) =>
    JSON.stringify([
      entry.procedureOrdinal,
      entry.groupOrdinal,
      entry.invocationOrdinal,
    ]);
  const candidatesByKey = new Map(
    plan.map((candidate) => [coordinateKey(candidate), candidate]),
  );
  if (
    candidatesByKey.size !== plan.length ||
    plan.length !== expectedCoordinates.length ||
    !expectedCoordinates.every((entry) => {
      const candidate = candidatesByKey.get(coordinateKey(entry));
      if (candidate === undefined) return false;
      if (candidate.definitionJoin.kind !== "joined") return true;
      const continuation = candidate.definitionJoin.value.continuation;
      if (continuation.kind !== entry.invocation.kind) return false;
      return true;
    })
  )
    return Result.fail("admissionPlanMismatch");
  const procedureBindings = execution.procedureBindings.map((binding) => {
    if (binding.procedure.kind !== "spellcasting") return binding;
    const procedure = binding.procedure;
    const groups = mapReadonlyNonEmptyArray(procedure.groups, (group) => {
      function admittedInvocation<
        Invocation extends
          import("./stat-block-execution-state.ts").StatBlockSpellcastingInvocationOutcome,
      >(invocation: Invocation): Invocation {
        const candidate = plan.find(
          (entry) =>
            entry.procedureOrdinal === procedure.procedureOrdinal &&
            entry.groupOrdinal === group.groupOrdinal &&
            entry.invocationOrdinal === invocation.invocationOrdinal,
        );
        if (candidate === undefined) return invocation;
        const selected = selectStatBlockSpellInvocation(execution, {
          procedureRef: binding.procedureRef,
          groupOrdinal: group.groupOrdinal,
          invocationOrdinal: invocation.invocationOrdinal,
        });
        if (selected.kind !== "selected") return invocation;
        const dispatch = admitSelectedStatBlockSpellInvocation({
          actor,
          state,
          selection: selected.value,
          definitionJoin: candidate.definitionJoin,
        });
        return { ...invocation, dispatch };
      }
      return Match.value(group).pipe(
        Match.when({ kind: "at_will" }, (value) => ({
          ...value,
          invocations: mapReadonlyNonEmptyArray(
            value.invocations,
            admittedInvocation,
          ),
        })),
        Match.when({ kind: "limited", resourceOwnership: "each" }, (value) => ({
          ...value,
          invocations: mapReadonlyNonEmptyArray(
            value.invocations,
            admittedInvocation,
          ),
        })),
        Match.when(
          { kind: "limited", resourceOwnership: "shared" },
          (value) => ({
            ...value,
            invocations: mapReadonlyNonEmptyArray(
              value.invocations,
              admittedInvocation,
            ),
          }),
        ),
        Match.exhaustive,
      );
    });
    return {
      ...binding,
      resourcePoolRefs: [] as const,
      procedure: { ...procedure, groups },
    };
  });
  return Result.succeed({
    ...actor,
    origin: {
      ...actor.origin,
      execution: admittedStatBlockExecutionState({
        ...execution,
        procedureBindings,
      }),
    },
  });
}
