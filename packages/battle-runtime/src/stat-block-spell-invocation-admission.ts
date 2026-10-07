import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import type { SpellPresentationSource } from "./battle-runtime-context.ts";
import { bindAuthoredSelectedSpellInvocation } from "./character-execution-admission.ts";
import { statBlockSpellInvocationProcedureRef } from "./identity.ts";
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
import { statBlockSpellInvocationActionCost } from "./stat-block-execution-state.ts";
import { mapReadonlyNonEmptyArray } from "./readonly-non-empty-array.ts";

type StatBlockSpellInvocationAdmission =
  | {
      readonly dispatch: Extract<
        StatBlockSpellInvocationDispatch,
        { readonly kind: "unsupported" }
      >;
      readonly spellPresentationSources: readonly [];
    }
  | {
      readonly dispatch: Extract<
        StatBlockSpellInvocationDispatch,
        { readonly kind: "executable" }
      >;
      readonly spellPresentationSources: ReadonlyNonEmptyArray<SpellPresentationSource>;
    };

function unsupportedSpellInvocationAdmission(
  reason: import("./stat-block-spell-invocation-dispatch.ts").StatBlockSpellInvocationUnsupportedReason,
): Extract<
  StatBlockSpellInvocationAdmission,
  { readonly dispatch: { readonly kind: "unsupported" } }
> {
  return {
    dispatch: { kind: "unsupported", reason },
    spellPresentationSources: [],
  };
}

export function admitSelectedStatBlockSpellInvocation(input: {
  readonly actor: StatBlockBattleCreatureState;
  readonly state: BattleState;
  readonly selection: SelectedStatBlockSpellInvocation;
  readonly definitionJoin: StatBlockSpellDefinitionJoin;
}): StatBlockSpellInvocationAdmission {
  const joined = input.definitionJoin;
  if (joined.kind !== "joined")
    return unsupportedSpellInvocationAdmission(joined.kind);
  if (
    input.selection.invocation.kind === "restricted" ||
    joined.value.continuation.kind === "restricted"
  ) {
    return unsupportedSpellInvocationAdmission("unsupportedRestriction");
  }
  const { selection } = input;
  const castingSourceFacts = {
    tag: "statBlock" as const,
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
  const castingSource = Match.value(joined.value.castingTime).pipe(
    Match.when({ kind: Match.is("minutes", "hours") }, (castingTime) => ({
      ...castingSourceFacts,
      castingTime,
      actionCost: statBlockSpellInvocationActionCost(
        selection.procedure,
        castingTime,
      ),
    })),
    Match.when(
      { kind: Match.is("action", "bonus_action", "reaction") },
      (castingTime) => ({
        ...castingSourceFacts,
        castingTime,
        actionCost: statBlockSpellInvocationActionCost(
          selection.procedure,
          castingTime,
        ),
      }),
    ),
    Match.exhaustive,
  );
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
        ? { kind: "atWill", castLevel }
        : {
            kind: "limited",
            castLevel,
            resourcePoolRef: selection.resource.resourcePoolRef,
          },
    castingSource,
    battle: spellAdmissionBattleProjection(input.state),
  };
  const staticAdmission = admitRegisteredSpellProcedureMechanics({
    mechanics: source.mechanics,
    spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
  });
  return Match.value(staticAdmission).pipe(
    Match.discriminatorsExhaustive("tag")({
      notBattleOwned: (admission) =>
        unsupportedSpellInvocationAdmission(
          admission.reason.kind === "unownedMechanicsFacet"
            ? "unsupportedDeathAftermath"
            : "unsupportedProfile",
        ),
      rejected: () => unsupportedSpellInvocationAdmission("unsupportedProfile"),
      admitted: ({ procedures }): StatBlockSpellInvocationAdmission => {
        const casterRequirements = procedures.flatMap((procedure) =>
          procedure.binding === "static" ? [] : [procedure.casterRequirements],
        );
        const missingAttackBonus =
          Option.isNone(castingSource.spellAttackBonus) &&
          casterRequirements.some(
            (requirements) => requirements.spellAttackBonus === "required",
          );
        const missingSaveDc =
          Option.isNone(castingSource.spellSaveDc) &&
          casterRequirements.some(
            (requirements) => requirements.spellSaveDc === "required",
          );
        if (missingAttackBonus && missingSaveDc)
          return unsupportedSpellInvocationAdmission(
            "missingCasterAttackBonusAndSaveDc",
          );
        if (missingAttackBonus)
          return unsupportedSpellInvocationAdmission(
            "missingCasterAttackBonus",
          );
        if (missingSaveDc)
          return unsupportedSpellInvocationAdmission("missingCasterSaveDc");
        const executionSource = battleSpellExecutionSourceFromAdmission(source);
        const invocations = procedures.flatMap(
          (
            procedure,
          ): readonly import("./battle-state-execution.ts").SupportedSpellInvocation[] =>
            procedure.binding === "static"
              ? []
              : procedure.admit(executionSource, context),
        );
        const executablePairs = invocations.flatMap((invocation) => {
          const facts = spellProcedureExecution(invocation);
          if (!isStatBlockSpellCastProcedureExecution(facts)) return [];
          const procedureRef = statBlockSpellInvocationProcedureRef(
            selection.ref,
            facts.procedure,
          );
          return [
            {
              facts,
              presentation: {
                procedureRef,
                invocation: bindAuthoredSelectedSpellInvocation(
                  invocation,
                  procedureRef,
                ),
              },
            },
          ];
        });
        const nonEmpty = spellProcedureNonEmpty(executablePairs);
        return nonEmpty === undefined
          ? unsupportedSpellInvocationAdmission("missingChildProcedureOwner")
          : {
              dispatch: {
                kind: "executable",
                executions: mapReadonlyNonEmptyArray(
                  nonEmpty,
                  (pair) => pair.facts,
                ),
              },
              spellPresentationSources: mapReadonlyNonEmptyArray(
                nonEmpty,
                (pair) => pair.presentation,
              ),
            };
      },
    }),
  );
}

/** Consume one catalog plan against the real actor; retain only execution facts. */
export function admitStatBlockSpellInvocations(
  actor: StatBlockBattleCreatureState,
  state: BattleState,
  plan: StatBlockSpellInvocationAdmissionPlan,
): Result.Result<
  {
    readonly creature: StatBlockBattleCreatureState;
    readonly spellPresentationSources: readonly SpellPresentationSource[];
  },
  "admissionPlanMismatch"
> {
  const execution = actor.origin.execution;
  const spellPresentationSources: SpellPresentationSource[] = [];
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
        const admitted = admitSelectedStatBlockSpellInvocation({
          actor,
          state,
          selection: selected.value,
          definitionJoin: candidate.definitionJoin,
        });
        spellPresentationSources.push(...admitted.spellPresentationSources);
        return { ...invocation, dispatch: admitted.dispatch };
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
    spellPresentationSources,
    creature: {
      ...actor,
      origin: {
        ...actor.origin,
        execution: admittedStatBlockExecutionState({
          ...execution,
          procedureBindings,
        }),
      },
    },
  });
}
