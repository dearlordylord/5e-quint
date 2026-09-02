import { optionalProperty } from "./optional-property.ts";
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL_ACCESS.MAGIC_INITIATE_CASTING
// UNIT-PROFILE-COVERAGE: runtime-owner battle.spell-access-magic-initiate-casting
import { sameSpellProcedureExecution } from "./same-spell-procedure-execution.ts";
import {
  characterStoredExecutionProcedureRef,
  unitSupportProfileKind,
} from "./character-execution-queries.ts";
export {
  BONUS_ACTION_STANDARD_ACTION_PROCEDURE_QUERY,
  CHARACTER_UNIT_FEATURE_PROCEDURE_QUERY,
  DRUID_WILD_SHAPE_PROCEDURE_QUERY,
  MONK_FOCUS_PROCEDURE_QUERY,
  bindStoredSpellProcedureExecutionFacts,
  characterExecutionWithMovableLightReposition,
  characterExecutionWithSpatialMeleeSpellAttackProxyRepeatAttack,
  characterExecutionWithHeldLightHurl,
  characterExecutionWithMarkedDamageRiderTransfer,
  characterExecutionWithObjectContactDamageRepeat,
  characterExecutionWithSpellCreatedHeldObjectProcedures,
  characterProcedureBinding,
  characterProcedureBindingSnapshots,
  characterSpellProcedure,
  characterSpellProcedureExecution,
  characterRetainedSpellProcedureExecution,
  characterUnitProcedure,
  characterUnitProcedureBindings,
  unitSupportProfileKind,
  type CharacterUnitProcedureQuery,
} from "./character-execution-queries.ts";
import { Result } from "effect";
import type { CharacterBattleClassLevels } from "./character-class-level.ts";
import {
  NonNegativeInteger,
  type ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
import type { AuthoredUnitSource } from "@dnd/surface/surface/types";
import type {
  BattleCharacterExecutionScopeRef,
  BattleProcedureExecutionRef,
  BattleResourcePoolExecutionRef,
  BattleId,
  CombatantId,
  BattleExecutionScopeOrdinal,
  BattleProcedureExecutionCursor,
} from "./identity.ts";
import {
  battleCharacterExecutionScopeRef,
  battleProcedureExecutionCursor,
  battleProcedureExecutionRef,
  battleResourcePoolExecutionRef,
} from "./identity.ts";
import {
  type BattleUnitSupportProfile,
  type BattleUnitSupportProfileIssue,
  type BattleUnitSupportSource,
  type SupportedUnitFeatureFacts,
  type SupportedUnitFeatureProfile,
} from "./unit-feature-support.ts";
import type {
  BattleSelectedSpellInvocation,
  SelectableSpellProcedureExecution,
  SupportedSpellInvocation,
} from "./battle-state-execution.ts";
import type {
  CharacterExecutionState,
  CharacterProcedureBinding,
  CharacterUnitProcedureExecution,
  CharacterUnitProcedureSource,
  UnitFeatureProcedureExecution,
} from "./character-execution-vocabulary.ts";
import { bindFailedSavingThrowRerollProcedure } from "./procedure-admission/failed-saving-throw-reroll.ts";
import { bindDruidWildShapeProcedure } from "./procedure-admission/druid-wild-shape.ts";
import { bindMonkFocusProcedure } from "./procedure-admission/monk-focus.ts";
import type { AdmittedResourceFeature } from "./procedure-admission/resource-feature-admission.ts";
export type {
  CharacterExecutionState,
  CharacterProcedureBinding,
  CharacterProcedureBindingSnapshot,
  CharacterUnitProcedureExecution,
  CharacterUnitProcedureSource,
  UnitFeatureProcedureExecution,
  UnitSupportProcedureExecution,
} from "./character-execution-vocabulary.ts";

/** Authored spell admission retained only until execution projection. */
export type AuthoredSupportedSpellInvocation = SupportedSpellInvocation;

export type AuthoredSelectedSpellInvocation<
  I extends AuthoredSupportedSpellInvocation = AuthoredSupportedSpellInvocation,
> = I & { readonly sourceProcedureRef: BattleProcedureExecutionRef };
import { Brand, Match } from "effect";
import { spellRuleExecutionFactsWithCastingSource } from "./procedure-execution/spell-rule-facts.ts";
import type { SpellProcedureExecution } from "./procedure-execution/spell-procedure-execution.ts";
import { isCantripSpellAccess } from "./procedure-execution/spell-invocation-vocabulary.ts";
export type { SpellRuleExecutionFacts } from "./procedure-execution/spell-rule-facts.ts";
export type { WeaponAttackOverrideSpellProcedureExecution } from "./procedure-execution/weapon-attack-override.ts";
export type * from "./procedure-execution/spell-procedure-execution.ts";

type RefreshableSpellInvocation =
  AuthoredSupportedSpellInvocation extends infer Invocation
    ? Invocation extends AuthoredSupportedSpellInvocation
      ?
          | (Invocation & { readonly sourceProcedureRef?: never })
          | AuthoredSelectedSpellInvocation<Invocation>
      : never
    : never;

type StoredSpellProcedureBinding = Extract<
  CharacterProcedureBinding,
  {
    readonly procedure: {
      readonly kind: "spellInvocation" | "unavailableSpellInvocation";
    };
  }
>;

export type CharacterUnitProcedureBinding = {
  readonly procedureRef: BattleProcedureExecutionRef;
  readonly procedure: CharacterUnitProcedureExecution;
};

export type CharacterUnitProcedureOwnership = {
  readonly unitId: AuthoredUnitSource["id"];
  readonly procedureRef: BattleProcedureExecutionRef;
};

export type BoundUnitFeatureProcedureFacts<
  Facts extends SupportedUnitFeatureFacts = SupportedUnitFeatureFacts,
> = {
  readonly sourceUnitId: AuthoredUnitSource["id"];
  readonly facts: Facts;
};

export function boundUnitFeatureProcedureFactsFromProfile(
  profile: SupportedUnitFeatureProfile,
): BoundUnitFeatureProcedureFacts {
  const { unit, ...facts } = profile;
  return { sourceUnitId: unit.id, facts };
}

export type UnitSupportProcedureExecutionContext = {
  readonly resourcePoolRefsByUnitId: ReadonlyMap<
    AuthoredUnitSource["id"],
    BattleResourcePoolExecutionRef
  >;
  readonly unitFeatureProcedureRefsByUnitId: ReadonlyMap<
    AuthoredUnitSource["id"],
    BattleProcedureExecutionRef
  >;
  readonly supportProcedureRefsByUnitId: ReadonlyMap<
    AuthoredUnitSource["id"],
    BattleProcedureExecutionRef
  >;
};

export type UnitFeatureProcedureExecutionContext = Pick<
  UnitSupportProcedureExecutionContext,
  "resourcePoolRefsByUnitId"
>;

type CharacterProcedureWithoutRef =
  CharacterProcedureBinding extends infer TBinding
    ? TBinding extends CharacterProcedureBinding
      ? Omit<TBinding, "procedureRef">
      : never
    : never;

const CharacterExecutionState = Brand.nominal<CharacterExecutionState>();

export type CharacterExecutionAdmission = {
  readonly execution: CharacterExecutionState;
  readonly unitProcedureOwnership: readonly CharacterUnitProcedureOwnership[];
};

type UnitSupportProcedureCandidate = {
  readonly unitId: AuthoredUnitSource["id"];
  readonly profile: BattleUnitSupportProfile;
};

type UnitFeatureProcedureCandidate = {
  readonly unitId: AuthoredUnitSource["id"];
  readonly execution: UnitFeatureProcedureExecution;
};

type ResourceFeatureProcedureBinding =
  | {
      readonly tag: "bound";
      readonly candidate: UnitFeatureProcedureCandidate;
    }
  | { readonly tag: "notAvailable" }
  | {
      readonly tag: "rejected";
      readonly messages: ReadonlyNonEmptyArray<string>;
    };

function resourceFeatureBindingMessages(
  issues: ReadonlyNonEmptyArray<{ readonly message: string }>,
): ReadonlyNonEmptyArray<string> {
  const [firstIssue, ...remainingIssues] = issues;
  return [firstIssue.message, ...remainingIssues.map(({ message }) => message)];
}

function bindResourceFeatureProcedure(
  feature: AdmittedResourceFeature,
  input: {
    readonly resourcePoolRefsByUnitId: ReadonlyMap<
      AuthoredUnitSource["id"],
      BattleResourcePoolExecutionRef
    >;
    readonly classLevels: CharacterBattleClassLevels;
  },
): ResourceFeatureProcedureBinding {
  return Match.value(feature.procedure).pipe(
    Match.discriminatorsExhaustive("kind")({
      failedSavingThrowReroll: ({ admitted }) => {
        const binding = bindFailedSavingThrowRerollProcedure(
          { sourceUnitId: feature.sourceUnitId, facts: admitted.facts },
          input,
        );
        return binding.tag === "rejected"
          ? {
              tag: "rejected" as const,
              messages: resourceFeatureBindingMessages(binding.issues),
            }
          : {
              tag: "bound" as const,
              candidate: {
                unitId: feature.sourceUnitId,
                execution: binding.procedure.execution,
              },
            };
      },
      druidWildShape: ({ admitted }) => {
        const binding = bindDruidWildShapeProcedure(
          { sourceUnitId: feature.sourceUnitId, projection: admitted },
          input,
        );
        return Match.value(binding).pipe(
          Match.discriminatorsExhaustive("tag")({
            bound: ({ procedure }) => ({
              tag: "bound" as const,
              candidate: {
                unitId: feature.sourceUnitId,
                execution: procedure.execution,
              },
            }),
            notAvailable: () => ({ tag: "notAvailable" as const }),
            rejected: ({ issues }) => ({
              tag: "rejected" as const,
              messages: resourceFeatureBindingMessages(issues),
            }),
          }),
        );
      },
      monkFocus: ({ admitted }) => {
        const binding = bindMonkFocusProcedure(
          { sourceUnitId: feature.sourceUnitId, procedure: admitted },
          input,
        );
        if (binding.tag === "rejected") {
          return {
            tag: "rejected" as const,
            messages: resourceFeatureBindingMessages(binding.issues),
          };
        }
        const execution = unitFeatureProcedureExecution(
          binding.procedure.facts,
          input,
        );
        return execution === undefined
          ? {
              tag: "rejected" as const,
              messages: [
                "Bound Monk Focus facts must project a Battle execution.",
              ] as const,
            }
          : {
              tag: "bound" as const,
              candidate: { unitId: feature.sourceUnitId, execution },
            };
      },
    }),
  );
}

function resourceSelectedAreaDamageReplacementProcedures(input: {
  readonly resourceUnits: readonly AuthoredUnitSource[];
  readonly unitRefs: readonly {
    readonly unit: BattleUnitSupportSource;
    readonly supportProfiles: readonly BattleUnitSupportProfile[];
  }[];
}): readonly BoundUnitFeatureProcedureFacts[] {
  const resourceUnitsById = new Map(
    input.resourceUnits.map((unit) => [unit.id, unit]),
  );
  return input.unitRefs.flatMap((unitRef) => {
    const resourceUnit = resourceUnitsById.get(unitRef.unit.id);
    if (resourceUnit === undefined) return [];
    return unitRef.supportProfiles.flatMap(
      (profile): readonly BoundUnitFeatureProcedureFacts[] =>
        typeof profile === "object" &&
        profile.kind === "attackActionAreaSaveDamageReplacement"
          ? [{ sourceUnitId: resourceUnit.id, facts: profile }]
          : [],
    );
  });
}

function unitSupportProcedureIsOwnedByUnitFeature(
  unitFeatureProcedures: readonly UnitFeatureProcedureCandidate[],
  candidate: UnitSupportProcedureCandidate,
  context: UnitSupportProcedureExecutionContext,
): boolean {
  if (
    typeof candidate.profile === "object" &&
    candidate.profile.kind === "failedSavingThrowReroll"
  ) {
    const supportProfileKind = candidate.profile.kind;
    return unitFeatureProcedures.some(
      (feature) =>
        feature.unitId === candidate.unitId &&
        feature.execution.kind === supportProfileKind,
    );
  }
  const supportExecution = unitSupportProcedureExecution(
    candidate.profile,
    context,
  );
  return (
    supportExecution !== undefined &&
    unitFeatureProcedures.some(
      (feature) =>
        feature.unitId === candidate.unitId &&
        feature.execution.kind === unitSupportProfileKind(supportExecution),
    )
  );
}

export function characterExecutionFromUnits(input: {
  readonly battleId: BattleId;
  readonly combatantId: CombatantId;
  readonly scopeOrdinal: BattleExecutionScopeOrdinal;
  readonly unitFeatureProcedures: readonly BoundUnitFeatureProcedureFacts[];
  readonly resourceFeatureProcedures: readonly AdmittedResourceFeature[];
  readonly resourceUnits: readonly AuthoredUnitSource[];
  readonly units: readonly AuthoredUnitSource[];
  readonly unitRefs: readonly {
    readonly unit: BattleUnitSupportSource;
    readonly supportProfiles: readonly BattleUnitSupportProfile[];
  }[];
  readonly classLevels: CharacterBattleClassLevels;
}): Result.Result<
  CharacterExecutionAdmission,
  ReadonlyNonEmptyArray<BattleUnitSupportProfileIssue>
> {
  const scopeRef = battleCharacterExecutionScopeRef(
    input.battleId,
    input.combatantId,
    input.scopeOrdinal,
  );
  const supportProfileIssues: BattleUnitSupportProfileIssue[] = [];
  const resourcePoolRefsByUnitId = new Map(
    input.resourceUnits.map((unit, ordinal) => [
      unit.id,
      battleResourcePoolExecutionRef(scopeRef, NonNegativeInteger(ordinal)),
    ]),
  );
  const unitFeatureExecutionContext: UnitFeatureProcedureExecutionContext = {
    resourcePoolRefsByUnitId,
  };
  const resourceSelectedProcedures =
    resourceSelectedAreaDamageReplacementProcedures(input);
  const unitFeatureProcedures = [
    ...input.unitFeatureProcedures,
    ...resourceSelectedProcedures.filter(
      (selected) =>
        !input.unitFeatureProcedures.some(
          (procedure) =>
            procedure.sourceUnitId === selected.sourceUnitId &&
            procedure.facts.kind === selected.facts.kind,
        ),
    ),
  ];
  const resourceFeatureUnitProcedures = input.resourceFeatureProcedures.flatMap(
    (feature) => {
      const binding = bindResourceFeatureProcedure(feature, {
        resourcePoolRefsByUnitId,
        classLevels: input.classLevels,
      });
      if (binding.tag === "rejected") {
        supportProfileIssues.push(
          ...binding.messages.map((message) => ({
            tag: "battleUnitSupportProfileIssue" as const,
            message,
          })),
        );
        return [];
      }
      return binding.tag === "notAvailable"
        ? []
        : [
            {
              ...binding.candidate,
              source: characterUnitProcedureSourceForAdmission(
                scopeRef,
                input.resourceUnits,
                binding.candidate.unitId,
              ),
            },
          ];
    },
  );
  const boundProfileUnitProcedures = unitFeatureProcedures.flatMap(
    (procedure) => {
      const failedSavingThrowBinding =
        procedure.facts.kind === "failedSavingThrowReroll"
          ? bindFailedSavingThrowRerollProcedure(
              {
                sourceUnitId: procedure.sourceUnitId,
                facts: procedure.facts,
              },
              {
                resourcePoolRefsByUnitId,
                classLevels: input.classLevels,
              },
            )
          : null;
      if (failedSavingThrowBinding?.tag === "rejected") {
        supportProfileIssues.push(
          ...failedSavingThrowBinding.issues.map((issue) => ({
            tag: "battleUnitSupportProfileIssue" as const,
            message: issue.message,
          })),
        );
        return [];
      }
      const execution =
        failedSavingThrowBinding?.procedure.execution ??
        unitFeatureProcedureExecution(
          procedure.facts,
          unitFeatureExecutionContext,
        );
      if (
        execution === undefined &&
        procedure.facts.kind !== "cunningStrike" &&
        procedure.facts.kind !== "cunningStrikeOptionGrant"
      ) {
        supportProfileIssues.push({
          tag: "battleUnitSupportProfileIssue",
          message: `Unit feature profile ${procedure.facts.kind} references an unavailable mechanical execution resource.`,
        });
      }
      return execution === undefined
        ? []
        : [
            {
              unitId: procedure.sourceUnitId,
              execution,
              source: characterUnitProcedureSourceForAdmission(
                scopeRef,
                input.resourceUnits,
                procedure.sourceUnitId,
              ),
            },
          ];
    },
  );
  const resourceFeatureProcedureKeys = new Set(
    resourceFeatureUnitProcedures.map(
      ({ unitId, execution }) => `${unitId}\u0000${execution.kind}`,
    ),
  );
  const unitProcedures = [
    ...resourceFeatureUnitProcedures,
    ...boundProfileUnitProcedures.filter(
      ({ unitId, execution }) =>
        !resourceFeatureProcedureKeys.has(`${unitId}\u0000${execution.kind}`),
    ),
  ];
  if (supportProfileIssues.length > 0) {
    const [firstIssue, ...remainingIssues] = supportProfileIssues;
    return Result.fail([firstIssue, ...remainingIssues]);
  }
  const allocatedUnitProcedures = allocateCharacterProcedureOccurrences(
    scopeRef,
    battleProcedureExecutionCursor(0),
    unitProcedures,
    ({ execution, source }) => ({
      procedure: {
        kind: "unitFeature" as const,
        source,
        execution,
      },
    }),
  );
  const unitFeatureProcedureRefsByUnitId = new Map(
    allocatedUnitProcedures.occurrences.map(
      ({ input: { unitId }, binding }) =>
        [unitId, binding.procedureRef] as const,
    ),
  );
  const unitSupportExecutionContext: UnitSupportProcedureExecutionContext = {
    resourcePoolRefsByUnitId,
    unitFeatureProcedureRefsByUnitId,
    supportProcedureRefsByUnitId: new Map(),
  };
  const unitSupportProcedures = input.unitRefs
    .flatMap((unitRef) =>
      unitRef.supportProfiles.map((profile) => ({
        unitId: unitRef.unit.id,
        profile,
      })),
    )
    .filter(
      (candidate) =>
        !unitSupportProcedureIsOwnedByUnitFeature(
          unitProcedures,
          candidate,
          unitSupportExecutionContext,
        ),
    );
  const primarySupportProcedures = unitSupportProcedures.filter(
    ({ profile }) =>
      typeof profile !== "object" ||
      profile.kind !== "cunningStrikeOptionGrant",
  );
  const projectedPrimarySupportProcedures: Array<{
    readonly unitId: AuthoredUnitSource["id"];
    readonly binding: CharacterProcedureWithoutRef;
  }> = [];
  for (const { profile, unitId } of primarySupportProcedures) {
    const execution = unitSupportProcedureExecution(
      profile,
      unitSupportExecutionContext,
    );
    if (execution === undefined) {
      supportProfileIssues.push({
        tag: "battleUnitSupportProfileIssue",
        message: `Unit support profile ${typeof profile === "string" ? profile : profile.kind} references an unavailable mechanical execution resource or procedure.`,
      });
      continue;
    }
    projectedPrimarySupportProcedures.push({
      unitId,
      binding: {
        procedure: {
          kind: "unitSupportProfile",
          source: characterUnitProcedureSourceForAdmission(
            scopeRef,
            input.resourceUnits,
            unitId,
          ),
          execution,
        },
      },
    });
  }
  if (supportProfileIssues.length > 0) {
    const [firstIssue, ...remainingIssues] = supportProfileIssues;
    return Result.fail([firstIssue, ...remainingIssues]);
  }
  const allocatedPrimarySupportProcedures =
    allocateCharacterProcedureOccurrences(
      scopeRef,
      allocatedUnitProcedures.nextProcedureOrdinal,
      projectedPrimarySupportProcedures,
      ({ binding }) => binding,
    );
  const supportProcedureRefsByUnitId = new Map(
    allocatedPrimarySupportProcedures.occurrences.map(
      ({ input: { unitId }, binding }) =>
        [unitId, binding.procedureRef] as const,
    ),
  );
  const grantContext: UnitSupportProcedureExecutionContext = {
    ...unitSupportExecutionContext,
    supportProcedureRefsByUnitId,
  };
  const grantProcedures: Array<{
    readonly unitId: AuthoredUnitSource["id"];
    readonly binding: CharacterProcedureWithoutRef;
  }> = [];
  for (const { profile, unitId } of unitSupportProcedures) {
    if (
      typeof profile !== "object" ||
      profile.kind !== "cunningStrikeOptionGrant"
    ) {
      continue;
    }
    const execution = unitSupportProcedureExecution(profile, grantContext);
    if (execution === undefined) {
      supportProfileIssues.push({
        tag: "battleUnitSupportProfileIssue",
        message: `Unit support profile ${profile.kind} references an unavailable mechanical procedure.`,
      });
      continue;
    }
    grantProcedures.push({
      unitId,
      binding: {
        procedure: {
          kind: "unitSupportProfile",
          source: characterUnitProcedureSourceForAdmission(
            scopeRef,
            input.resourceUnits,
            unitId,
          ),
          execution,
        },
      },
    });
  }
  if (supportProfileIssues.length > 0) {
    const [firstIssue, ...remainingIssues] = supportProfileIssues;
    return Result.fail([firstIssue, ...remainingIssues]);
  }
  const allocatedGrantProcedures = allocateCharacterProcedureOccurrences(
    scopeRef,
    allocatedPrimarySupportProcedures.nextProcedureOrdinal,
    grantProcedures,
    ({ binding }) => binding,
  );
  return Result.succeed({
    execution: CharacterExecutionState({
      scopeRef,
      nextProcedureOrdinal: allocatedGrantProcedures.nextProcedureOrdinal,
      procedureBindings: [
        ...allocatedUnitProcedures.procedureBindings,
        ...allocatedPrimarySupportProcedures.procedureBindings,
        ...allocatedGrantProcedures.procedureBindings,
      ],
    }),
    unitProcedureOwnership: [
      ...allocatedUnitProcedures.occurrences,
      ...allocatedPrimarySupportProcedures.occurrences,
      ...allocatedGrantProcedures.occurrences,
    ].map(({ input: { unitId }, binding }) => ({
      unitId,
      procedureRef: binding.procedureRef,
    })),
  });
}

function allocateCharacterProcedureOccurrences<Input>(
  scopeRef: BattleCharacterExecutionScopeRef,
  nextProcedureOrdinal: BattleProcedureExecutionCursor,
  inputs: readonly Input[],
  procedureFor: (input: Input) => CharacterProcedureWithoutRef,
): {
  readonly nextProcedureOrdinal: BattleProcedureExecutionCursor;
  readonly occurrences: readonly {
    readonly input: Input;
    readonly binding: CharacterProcedureBinding;
  }[];
  readonly procedureBindings: readonly CharacterProcedureBinding[];
} {
  let cursor = nextProcedureOrdinal;
  const occurrences = inputs.map((input) => {
    const procedureRef = battleProcedureExecutionRef(
      scopeRef,
      NonNegativeInteger(cursor),
    );
    cursor = battleProcedureExecutionCursor(cursor + 1);
    return {
      input,
      binding: {
        procedureRef,
        ...procedureFor(input),
      } satisfies CharacterProcedureBinding,
    };
  });
  return {
    nextProcedureOrdinal: cursor,
    occurrences,
    procedureBindings: occurrences.map(({ binding }) => binding),
  };
}

export function characterExecutionWithSpellInvocations(
  execution: CharacterExecutionState,
  invocations: readonly RefreshableSpellInvocation[],
): CharacterExecutionState {
  let refreshed = false;
  const remainingInvocations = [...invocations];
  const invocationByProcedureRef = new Map<
    BattleProcedureExecutionRef,
    SupportedSpellInvocation
  >();
  const selectedInvocationIndexes = new Set<number>();
  const selectedProcedureRef = (
    invocation: RefreshableSpellInvocation,
  ): BattleProcedureExecutionRef | undefined => {
    if (!("sourceProcedureRef" in invocation)) return undefined;
    return invocation.sourceProcedureRef;
  };
  remainingInvocations.forEach((invocation, invocationIndex) => {
    const procedureRef = selectedProcedureRef(invocation);
    if (procedureRef === undefined) return;
    selectedInvocationIndexes.add(invocationIndex);
    if (invocationByProcedureRef.has(procedureRef)) return;
    const binding = execution.procedureBindings.find(
      (candidate) => candidate.procedureRef === procedureRef,
    );
    if (
      (binding?.procedure.kind !== "spellInvocation" &&
        binding?.procedure.kind !== "unavailableSpellInvocation") ||
      !spellInvocationMatchesExecution(invocation, binding.procedure.execution)
    ) {
      return;
    }
    invocationByProcedureRef.set(procedureRef, invocation);
  });
  for (let index = remainingInvocations.length - 1; index >= 0; index -= 1) {
    if (selectedInvocationIndexes.has(index)) {
      remainingInvocations.splice(index, 1);
    }
  }
  const reserveMatchingInvocation = (binding: StoredSpellProcedureBinding) => {
    if (invocationByProcedureRef.has(binding.procedureRef)) return;
    const storedExecution = binding.procedure.execution;
    const currentInvocationIndex = remainingInvocations.findIndex(
      (invocation) =>
        spellInvocationMatchesExecution(invocation, storedExecution),
    );
    if (currentInvocationIndex < 0) return;
    const currentInvocation = remainingInvocations[currentInvocationIndex];
    invocationByProcedureRef.set(binding.procedureRef, currentInvocation);
    remainingInvocations.splice(currentInvocationIndex, 1);
  };
  // Live occurrences retain their refs first. Only genuinely new occurrences
  // are then available to restore an unavailable binding.
  const storedSpellBindings = execution.procedureBindings.filter(
    isStoredSpellProcedureBinding,
  );
  storedSpellBindings.forEach((binding) => {
    if (binding.procedure.kind === "spellInvocation") {
      reserveMatchingInvocation(binding);
    }
  });
  storedSpellBindings.forEach((binding) => {
    if (binding.procedure.kind === "unavailableSpellInvocation") {
      reserveMatchingInvocation(binding);
    }
  });

  const refreshedBindings = execution.procedureBindings.map(
    (binding): CharacterProcedureBinding => {
      if (
        binding.procedure.kind !== "spellInvocation" &&
        binding.procedure.kind !== "unavailableSpellInvocation"
      ) {
        return binding;
      }
      const currentInvocation = invocationByProcedureRef.get(
        binding.procedureRef,
      );
      if (currentInvocation === undefined) {
        if (binding.procedure.kind === "unavailableSpellInvocation") {
          return binding;
        }
        refreshed = true;
        return {
          ...binding,
          procedure: {
            kind: "unavailableSpellInvocation",
            execution: binding.procedure.execution,
          },
        };
      }
      const currentExecution = spellProcedureExecution(currentInvocation);
      if (
        binding.procedure.kind === "spellInvocation" &&
        sameSpellProcedureExecution(
          binding.procedure.execution,
          currentExecution,
        )
      ) {
        return binding;
      }
      refreshed = true;
      return {
        ...binding,
        procedure: {
          kind: "spellInvocation",
          execution: currentExecution,
        },
      };
    },
  );
  const newInvocations = remainingInvocations;
  const allocated = allocateCharacterProcedureBindings(
    execution.scopeRef,
    execution.nextProcedureOrdinal,
    newInvocations.map(
      (invocation): CharacterProcedureWithoutRef => ({
        procedure: {
          kind: "spellInvocation",
          execution: spellProcedureExecution(invocation),
        },
      }),
    ),
  );
  const spellBindings = allocated.procedureBindings;
  if (spellBindings.length === 0 && !refreshed) return execution;
  return CharacterExecutionState({
    scopeRef: execution.scopeRef,
    nextProcedureOrdinal: allocated.nextProcedureOrdinal,
    procedureBindings: [...refreshedBindings, ...spellBindings],
  });
}

function isStoredSpellProcedureBinding(
  binding: CharacterProcedureBinding,
): binding is StoredSpellProcedureBinding {
  return (
    binding.procedure.kind === "spellInvocation" ||
    binding.procedure.kind === "unavailableSpellInvocation"
  );
}

function allocateCharacterProcedureBindings(
  scopeRef: BattleCharacterExecutionScopeRef,
  nextProcedureOrdinal: BattleProcedureExecutionCursor,
  procedures: readonly CharacterProcedureWithoutRef[],
): {
  readonly nextProcedureOrdinal: BattleProcedureExecutionCursor;
  readonly procedureBindings: readonly CharacterProcedureBinding[];
} {
  const procedureBindings: CharacterProcedureBinding[] = [];
  let cursor = Number(nextProcedureOrdinal);
  for (const procedure of procedures) {
    procedureBindings.push({
      ...procedure,
      procedureRef: battleProcedureExecutionRef(
        scopeRef,
        NonNegativeInteger(cursor),
      ),
    });
    cursor += 1;
  }
  return {
    nextProcedureOrdinal: battleProcedureExecutionCursor(cursor),
    procedureBindings,
  };
}

function characterUnitProcedureSourceForAdmission(
  scopeRef: BattleCharacterExecutionScopeRef,
  resourceUnits: readonly AuthoredUnitSource[],
  unitId: AuthoredUnitSource["id"],
): CharacterUnitProcedureSource {
  const resourceOrdinal = resourceUnits.findIndex((unit) => unit.id === unitId);
  return resourceOrdinal < 0
    ? { kind: "intrinsic" }
    : {
        kind: "resourcePool",
        resourcePoolRef: battleResourcePoolExecutionRef(
          scopeRef,
          NonNegativeInteger(resourceOrdinal),
        ),
      };
}

export function unitFeatureProcedureExecution(
  profile: SupportedUnitFeatureFacts,
  context: UnitFeatureProcedureExecutionContext,
) {
  return Match.value(profile).pipe(
    Match.discriminatorsExhaustive("kind")({
      extraActionGrant: (value) => ({
        kind: value.kind,
        restriction: value.restriction,
      }),
      selfBonusActionHealing: (value) => ({
        kind: value.kind,
        dice: value.dice,
        dieSize: value.dieSize,
        flatBase: value.flatBase,
        flatPerLevel: value.flatPerLevel,
        startingAtLevel: value.startingAtLevel,
        className: value.className,
        classLevel: value.classLevel,
      }),
      ongoingFeature: (value) => ({
        kind: value.kind,
        activationTrigger: value.activationTrigger,
        spendsUse: value.spendsUse,
        lifecycle: value.lifecycle,
        ...optionalProperty("concentrationEffect", value.concentrationEffect),
        actionRestrictions: value.actionRestrictions,
        rollModifiers: value.rollModifiers,
        spellModifiers: value.spellModifiers,
        damageModifiers: value.damageModifiers,
        resistances: value.resistances,
      }),
      attackDamageRider: (value) =>
        Match.value(value).pipe(
          Match.when({ optional: true }, (variant) => ({
            kind: variant.kind,
            optional: variant.optional,
            usageLimit: variant.usageLimit,
            trigger: variant.trigger,
            eligibility: variant.eligibility,
            classLevel: variant.classLevel,
            dice: variant.dice,
          })),
          Match.when({ optional: false }, (variant) => ({
            kind: variant.kind,
            optional: variant.optional,
            usageLimit: variant.usageLimit,
            trigger: variant.trigger,
            classLevel: variant.classLevel,
            dice: variant.dice,
          })),
          Match.exhaustive,
        ),
      saveDamageReplacement: (value) => ({
        kind: value.kind,
        ability: value.ability,
        requiredSuccessDamage: value.requiredSuccessDamage,
        onSuccess: value.onSuccess,
        onFail: value.onFail,
        suppressedByCondition: value.suppressedByCondition,
      }),
      reactionRollOrDamageReduction: (value) => {
        const projectedModifiers = value.modifiers.map((modifier) =>
          Match.value(modifier).pipe(
            Match.discriminatorsExhaustive("kind")({
              attackRollReduction: (variant) => {
                const resourcePoolRef = context.resourcePoolRefsByUnitId.get(
                  variant.reduction.spends.resourceUnitId,
                );
                return resourcePoolRef === undefined
                  ? undefined
                  : {
                      kind: variant.kind,
                      rangeFeet: variant.rangeFeet,
                      requiresVisibleCreature: variant.requiresVisibleCreature,
                      reduction: {
                        kind: variant.reduction.kind,
                        dice: variant.reduction.dice,
                        dieSize: variant.reduction.dieSize,
                        flatModifier: variant.reduction.flatModifier,
                        spends: {
                          resourcePoolRef,
                          amount: variant.reduction.spends.amount,
                        },
                      },
                    };
              },
              abilityCheckReduction: (variant) => {
                const resourcePoolRef = context.resourcePoolRefsByUnitId.get(
                  variant.reduction.spends.resourceUnitId,
                );
                return resourcePoolRef === undefined
                  ? undefined
                  : {
                      kind: variant.kind,
                      rangeFeet: variant.rangeFeet,
                      requiresVisibleCreature: variant.requiresVisibleCreature,
                      reduction: {
                        kind: variant.reduction.kind,
                        dice: variant.reduction.dice,
                        dieSize: variant.reduction.dieSize,
                        flatModifier: variant.reduction.flatModifier,
                        spends: {
                          resourcePoolRef,
                          amount: variant.reduction.spends.amount,
                        },
                      },
                    };
              },
              attackDamageRollReduction: (variant) => {
                const resourcePoolRef = context.resourcePoolRefsByUnitId.get(
                  variant.reduction.spends.resourceUnitId,
                );
                return resourcePoolRef === undefined
                  ? undefined
                  : {
                      kind: variant.kind,
                      rangeFeet: variant.rangeFeet,
                      requiresVisibleCreature: variant.requiresVisibleCreature,
                      reduction: {
                        kind: variant.reduction.kind,
                        dice: variant.reduction.dice,
                        dieSize: variant.reduction.dieSize,
                        flatModifier: variant.reduction.flatModifier,
                        spends: {
                          resourcePoolRef,
                          amount: variant.reduction.spends.amount,
                        },
                      },
                    };
              },
              attackDamageReduction: (variant) => {
                const redirect = variant.zeroDamageRedirect;
                if (redirect === undefined) {
                  return {
                    kind: variant.kind,
                    ...(variant.requiresVisibleAttacker === undefined
                      ? {}
                      : {
                          requiresVisibleAttacker:
                            variant.requiresVisibleAttacker,
                        }),
                    ...optionalProperty(
                      "damageIncludes",
                      variant.damageIncludes,
                    ),
                    reduction: variant.reduction,
                  };
                }
                const resourcePoolRef = context.resourcePoolRefsByUnitId.get(
                  redirect.spends.resourceUnitId,
                );
                return resourcePoolRef === undefined
                  ? undefined
                  : {
                      kind: variant.kind,
                      ...(variant.requiresVisibleAttacker === undefined
                        ? {}
                        : {
                            requiresVisibleAttacker:
                              variant.requiresVisibleAttacker,
                          }),
                      ...optionalProperty(
                        "damageIncludes",
                        variant.damageIncludes,
                      ),
                      reduction: variant.reduction,
                      zeroDamageRedirect: {
                        spends: {
                          resourcePoolRef,
                          amount: redirect.spends.amount,
                        },
                        save: redirect.save,
                        damage: redirect.damage,
                        targetGate: redirect.targetGate,
                      },
                    };
              },
              fallDamageReduction: (variant) => ({
                kind: variant.kind,
                reduction: variant.reduction,
              }),
            }),
          ),
        );
        if (projectedModifiers.some((modifier) => modifier === undefined)) {
          return undefined;
        }
        const modifiers = projectedModifiers.filter(
          (modifier): modifier is Exclude<typeof modifier, undefined> =>
            modifier !== undefined,
        );
        return {
          kind: value.kind,
          classLevel: value.classLevel,
          modifiers,
        };
      },
      passiveArmorClassBonus: (value) => ({
        kind: value.kind,
        armorClass: value.armorClass,
      }),
      passiveRangedAttackRollBonus: (value) => ({
        kind: value.kind,
        attackRoll: value.attackRoll,
      }),
      initiativeProficiencyAndSwap: (value) => ({
        kind: value.kind,
        initiative: value.initiative,
      }),
      attackRollMissToHitReplacement: (value) => ({
        kind: value.kind,
        replacement: value.replacement,
      }),
      attackActionAreaSaveDamageReplacement: (value) => ({
        kind: value.kind,
        breath: value.breath,
      }),
      d20TestNaturalOneReroll: (value) => ({
        kind: value.kind,
        reroll: value.reroll,
      }),
      passiveSavingThrowRollMode: (value) => ({
        kind: value.kind,
        savingThrow: value.savingThrow,
      }),
      passiveAbilityCheckRollMode: (value) => ({
        kind: value.kind,
        abilityCheck: value.abilityCheck,
      }),
      passiveSpeedBonus: (value) => ({
        kind: value.kind,
        speed: value.speed,
      }),
      passiveSpeedKindGrants: (value) => ({
        kind: value.kind,
        speedKindGrants: value.speedKindGrants,
      }),
      acrobaticMovement: (value) => ({
        kind: value.kind,
        acrobaticMovement: value.acrobaticMovement,
      }),
      creatureSpaceMovementPermission: (value) => ({
        kind: value.kind,
        permission: value.permission,
      }),
      hideActionObscurementPermission: (value) => ({
        kind: value.kind,
        permission: value.permission,
      }),
      weaponDamageDiceRollChoice: (value) => ({
        kind: value.kind,
        damageDiceChoice: value.damageDiceChoice,
      }),
      attackDamageDieFloor: (value) => ({
        kind: value.kind,
        damageDieFloor: value.damageDieFloor,
      }),
      lightExtraAttackDamageAbilityModifier: (value) => ({
        kind: value.kind,
        damageAbilityModifier: value.damageAbilityModifier,
      }),
      martialArtsAttackProjection: (value) => ({
        kind: value.kind,
        classLevel: value.classLevel,
        martialArts: value.martialArts,
      }),
      bardicInspirationGrant: (value) => {
        const resourcePoolRef = context.resourcePoolRefsByUnitId.get(
          value.spends.resourceUnitId,
        );
        return resourcePoolRef === undefined
          ? undefined
          : {
              kind: value.kind,
              rangeFeet: value.rangeFeet,
              dieSize: value.dieSize,
              durationTicks: value.durationTicks,
              spends: { resourcePoolRef, amount: value.spends.amount },
            };
      },
      druidWildShapeKnownForm: (value) => ({
        kind: value.kind,
        classLevel: value.classLevel,
        knownFormRoster: value.knownFormRoster,
      }),
      cunningStrike: () => undefined,
      cunningStrikeOptionGrant: () => undefined,
      attackActionAttackCountScaling: (value) => ({
        kind: value.kind,
        additionalAttacks: value.additionalAttacks,
      }),
      zeroHitPointReplacement: (value) => ({
        kind: value.kind,
        optional: value.optional,
        trigger: value.trigger,
        replacementHp: value.replacementHp,
        resetCadence: value.resetCadence,
      }),
      bonusActionDashTemporaryHitPoints: (value) => ({
        kind: value.kind,
        dashTemporaryHitPoints: value.dashTemporaryHitPoints,
      }),
      failedAbilityCheckResourceBoost: (value) => {
        const resourcePoolRef = context.resourcePoolRefsByUnitId.get(
          value.abilityCheck.spends.resourceUnitId,
        );
        return resourcePoolRef === undefined
          ? undefined
          : {
              kind: value.kind,
              abilityCheck: {
                trigger: value.abilityCheck.trigger,
                bonus: value.abilityCheck.bonus,
                spends: { resourcePoolRef },
                refundSpendOnStillFailed:
                  value.abilityCheck.refundSpendOnStillFailed,
              },
            };
      },
      failedSavingThrowReroll: (value) => {
        void value;
        return undefined;
      },
      spellSlotHealingModifier: (value) => ({
        kind: value.kind,
        healingModifier: value.healingModifier,
      }),
      magicActionHealingPool: (value) => {
        const resourcePoolRef = context.resourcePoolRefsByUnitId.get(
          value.healingPool.spends.resourceUnitId,
        );
        return resourcePoolRef === undefined
          ? undefined
          : {
              kind: value.kind,
              className: value.className,
              healingPool: {
                activationCost: value.healingPool.activationCost,
                spends: {
                  resourcePoolRef,
                  amount: value.healingPool.spends.amount,
                },
                rangeFeet: value.healingPool.rangeFeet,
                targetSelection: value.healingPool.targetSelection,
                pool: value.healingPool.pool,
                perTargetCap: value.healingPool.perTargetCap,
              },
            };
      },
      magicActionAreaSaveDamageHealing: (value) => {
        const resourcePoolRef = context.resourcePoolRefsByUnitId.get(
          value.damageHealing.spends.resourceUnitId,
        );
        return resourcePoolRef === undefined
          ? undefined
          : {
              kind: value.kind,
              damageHealing: {
                activationCost: value.damageHealing.activationCost,
                spends: {
                  resourcePoolRef,
                  amount: value.damageHealing.spends.amount,
                },
                area: value.damageHealing.area,
                save: value.damageHealing.save,
                damage: value.damageHealing.damage,
                healing: value.damageHealing.healing,
              },
            };
      },
      magicActionSaveGatedCondition: (value) => {
        const resourcePoolRef = context.resourcePoolRefsByUnitId.get(
          value.condition.spends.resourceUnitId,
        );
        return resourcePoolRef === undefined
          ? undefined
          : {
              kind: value.kind,
              condition: {
                activationCost: value.condition.activationCost,
                spends: {
                  resourcePoolRef,
                  amount: value.condition.spends.amount,
                },
                targetSelection: value.condition.targetSelection,
                save: value.condition.save,
                onFail: value.condition.onFail,
              },
            };
      },
      enemyZeroHitPointTemporaryHitPoints: (value) => ({
        kind: value.kind,
        className: value.className,
        temporaryHitPoints: value.temporaryHitPoints,
      }),
      bonusActionDelegatedStandardActions: (value) => ({
        kind: value.kind,
        actionEconomy: value.actionEconomy,
      }),
      monkFocusBattleOptions: (value) => ({
        kind: value.kind,
        effectSaveDc: value.effectSaveDc,
        flurryOfBlows: {
          focusPointCost: value.flurryOfBlows.focusPointCost,
          strikeCount: value.flurryOfBlows.strikeCount,
        },
        patientDefense: {
          freeAction: value.patientDefense.freeAction,
          focusPointCost: value.patientDefense.focusPointCost,
          focusActions: value.patientDefense.focusActions,
        },
        stepOfTheWind: {
          freeAction: value.stepOfTheWind.freeAction,
          focusPointCost: value.stepOfTheWind.focusPointCost,
          focusActions: value.stepOfTheWind.focusActions,
          jumpDistanceMultiplier: value.stepOfTheWind.jumpDistanceMultiplier,
        },
      }),
      remarkableAthlete: (value) => ({
        kind: value.kind,
        remarkableAthlete: value.remarkableAthlete,
      }),
      openHandTechnique: (value) => {
        const resourcePoolRef = context.resourcePoolRefsByUnitId.get(
          value.technique.trigger.resourceUnitId,
        );
        return resourcePoolRef === undefined
          ? undefined
          : {
              kind: value.kind,
              technique: {
                trigger: {
                  kind: value.technique.trigger.kind,
                  resourcePoolRef,
                  optionId: value.technique.trigger.optionId,
                },
                optional: value.technique.optional,
                effectSaveDc: value.technique.effectSaveDc,
                effects: value.technique.effects,
              },
            };
      },
      stunningStrike: (value) => {
        const resourcePoolRef = context.resourcePoolRefsByUnitId.get(
          value.stunningStrike.spends.resourceUnitId,
        );
        return resourcePoolRef === undefined
          ? undefined
          : {
              kind: value.kind,
              stunningStrike: {
                trigger: value.stunningStrike.trigger,
                optional: value.stunningStrike.optional,
                spends: {
                  resourcePoolRef,
                  amount: value.stunningStrike.spends.amount,
                },
                savingThrow: value.stunningStrike.savingThrow,
                onFail: value.stunningStrike.onFail,
                onSuccess: value.stunningStrike.onSuccess,
              },
            };
      },
      paladinSacredWeapon: (value) => {
        const resourcePoolRef = context.resourcePoolRefsByUnitId.get(
          value.sacredWeapon.spends.resourceUnitId,
        );
        return resourcePoolRef === undefined
          ? undefined
          : {
              kind: value.kind,
              sacredWeapon: {
                activationCost: value.sacredWeapon.activationCost,
                spends: {
                  resourcePoolRef,
                  amount: value.sacredWeapon.spends.amount,
                },
                target: value.sacredWeapon.target,
                duration: value.sacredWeapon.duration,
                attackRollBonus: value.sacredWeapon.attackRollBonus,
                hitDamageTypeChoice: value.sacredWeapon.hitDamageTypeChoice,
                light: value.sacredWeapon.light,
              },
            };
      },
      rogueSteadyAim: (value) => ({
        kind: value.kind,
        steadyAim: value.steadyAim,
      }),
      potentCantrip: (value) => ({
        kind: value.kind,
        potentCantrip: value.potentCantrip,
      }),
      grappler: (value) => ({
        kind: value.kind,
        grappler: value.grappler,
      }),
      retaliationReactionAttack: (value) => ({
        kind: value.kind,
        retaliation: value.retaliation,
      }),
    }),
  );
}

export function unitSupportProcedureExecution(
  profile: BattleUnitSupportProfile,
  context: UnitSupportProcedureExecutionContext,
) {
  if (typeof profile === "string") return profile;
  return Match.value(profile).pipe(
    Match.discriminatorsExhaustive("kind")({
      alternateActionCost: (value) => ({
        kind: value.kind,
        from: value.from,
        to: value.to,
      }),
      bonusActionDelegatedStandardActions: (value) => ({
        kind: value.kind,
        activationCost: value.activationCost,
        sleightOfHand: value.sleightOfHand,
        objectUse: value.objectUse,
      }),
      passiveRangedAttackRollBonus: (value) => ({
        kind: value.kind,
        attackRoll: value.attackRoll,
      }),
      initiativeProficiencyAndSwap: (value) => ({
        kind: value.kind,
        initiative: value.initiative,
      }),
      attackRollMissToHitReplacement: (value) => ({
        kind: value.kind,
        replacement: value.replacement,
      }),
      attackActionAreaSaveDamageReplacement: (value) => ({
        kind: value.kind,
        breath: value.breath,
      }),
      d20TestNaturalOneReroll: (value) => ({
        kind: value.kind,
        reroll: value.reroll,
      }),
      passiveSavingThrowRollMode: (value) => ({
        kind: value.kind,
        savingThrow: value.savingThrow,
      }),
      passiveAbilityCheckRollMode: (value) => ({
        kind: value.kind,
        abilityCheck: value.abilityCheck,
      }),
      passiveDamageResistance: (value) => ({
        kind: value.kind,
        resistance: value.resistance,
      }),
      passiveSpeedBonus: (value) => ({
        kind: value.kind,
        deltaFeet: value.deltaFeet,
        condition: value.condition,
      }),
      passiveSpeedKindGrants: (value) => ({
        kind: value.kind,
        ...optionalProperty("speed", value.speed),
        grants: value.grants,
      }),
      acrobaticMovement: (value) => ({
        kind: value.kind,
        acrobaticMovement: value.acrobaticMovement,
      }),
      creatureSpaceMovementPermission: (value) => ({
        kind: value.kind,
        permission: value.permission,
      }),
      hideActionObscurementPermission: (value) => ({
        kind: value.kind,
        permission: value.permission,
      }),
      attackActionAttackCountScaling: (value) => ({
        kind: value.kind,
        additionalAttacks: value.additionalAttacks,
      }),
      bonusActionDashTemporaryHitPoints: (value) => ({
        kind: value.kind,
        dashTemporaryHitPoints: value.dashTemporaryHitPoints,
      }),
      spellSlotHealingModifier: (value) => ({
        kind: value.kind,
        healingModifier: value.healingModifier,
      }),
      enemyZeroHitPointTemporaryHitPoints: (value) => ({
        kind: value.kind,
        className: value.className,
        temporaryHitPoints: value.temporaryHitPoints,
      }),
      druidWildShapeKnownForm: (value) => ({
        kind: value.kind,
        classLevel: value.classLevel,
        knownFormRoster: value.knownFormRoster,
      }),
      remarkableAthlete: (value) => ({
        kind: value.kind,
        remarkableAthlete: value.remarkableAthlete,
      }),
      huntersPrey: (value) => ({
        kind: value.kind,
        huntersPrey: value.huntersPrey,
      }),
      rogueSteadyAim: (value) => ({
        kind: value.kind,
        steadyAim: value.steadyAim,
      }),
      potentCantrip: (value) => ({
        kind: value.kind,
        potentCantrip: value.potentCantrip,
      }),
      grappler: (value) => ({
        kind: value.kind,
        grappler: value.grappler,
      }),
      brutalStrike: (value) => ({
        kind: value.kind,
        brutalStrike: value.brutalStrike,
      }),
      retaliationReactionAttack: (value) => ({
        kind: value.kind,
        retaliation: value.retaliation,
      }),
      tacticalMasterReplacement: (value) => ({
        kind: value.kind,
        replacementProperties: value.replacementProperties,
      }),
      lightExtraAttackDamageAbilityModifier: (value) => ({
        kind: value.kind,
        damageAbilityModifier: value.damageAbilityModifier,
      }),
      monkFocusBattleOptions: (value) => ({
        kind: value.kind,
        effectSaveDc: value.effectSaveDc,
        flurryOfBlows: {
          focusPointCost: value.flurryOfBlows.focusPointCost,
          strikeCount: value.flurryOfBlows.strikeCount,
        },
        patientDefense: {
          freeAction: value.patientDefense.freeAction,
          focusPointCost: value.patientDefense.focusPointCost,
          focusActions: value.patientDefense.focusActions,
        },
        stepOfTheWind: {
          freeAction: value.stepOfTheWind.freeAction,
          focusPointCost: value.stepOfTheWind.focusPointCost,
          focusActions: value.stepOfTheWind.focusActions,
          jumpDistanceMultiplier: value.stepOfTheWind.jumpDistanceMultiplier,
        },
      }),
      failedAbilityCheckResourceBoost: (value) => {
        const resourcePoolRef = context.resourcePoolRefsByUnitId.get(
          value.abilityCheck.spends.resourceUnitId,
        );
        return resourcePoolRef === undefined
          ? undefined
          : {
              kind: value.kind,
              abilityCheck: {
                trigger: value.abilityCheck.trigger,
                bonus: value.abilityCheck.bonus,
                spends: { resourcePoolRef },
                refundSpendOnStillFailed:
                  value.abilityCheck.refundSpendOnStillFailed,
              },
            };
      },
      failedSavingThrowReroll: (value) => {
        void value;
        return undefined;
      },
      magicActionHealingPool: (value) => {
        const resourcePoolRef = context.resourcePoolRefsByUnitId.get(
          value.healingPool.spends.resourceUnitId,
        );
        return resourcePoolRef === undefined
          ? undefined
          : {
              kind: value.kind,
              className: value.className,
              healingPool: {
                activationCost: value.healingPool.activationCost,
                spends: {
                  resourcePoolRef,
                  amount: value.healingPool.spends.amount,
                },
                rangeFeet: value.healingPool.rangeFeet,
                targetSelection: value.healingPool.targetSelection,
                pool: value.healingPool.pool,
                perTargetCap: value.healingPool.perTargetCap,
              },
            };
      },
      magicActionAreaSaveDamageHealing: (value) => {
        const resourcePoolRef = context.resourcePoolRefsByUnitId.get(
          value.damageHealing.spends.resourceUnitId,
        );
        return resourcePoolRef === undefined
          ? undefined
          : {
              kind: value.kind,
              damageHealing: {
                activationCost: value.damageHealing.activationCost,
                spends: {
                  resourcePoolRef,
                  amount: value.damageHealing.spends.amount,
                },
                area: value.damageHealing.area,
                save: value.damageHealing.save,
                damage: value.damageHealing.damage,
                healing: value.damageHealing.healing,
              },
            };
      },
      magicActionSaveGatedCondition: (value) => {
        const resourcePoolRef = context.resourcePoolRefsByUnitId.get(
          value.condition.spends.resourceUnitId,
        );
        return resourcePoolRef === undefined
          ? undefined
          : {
              kind: value.kind,
              condition: {
                activationCost: value.condition.activationCost,
                spends: {
                  resourcePoolRef,
                  amount: value.condition.spends.amount,
                },
                targetSelection: value.condition.targetSelection,
                save: value.condition.save,
                onFail: value.condition.onFail,
              },
            };
      },
      openHandTechnique: (value) => {
        const resourcePoolRef = context.resourcePoolRefsByUnitId.get(
          value.technique.trigger.resourceUnitId,
        );
        return resourcePoolRef === undefined
          ? undefined
          : {
              kind: value.kind,
              technique: {
                trigger: {
                  kind: value.technique.trigger.kind,
                  resourcePoolRef,
                  optionId: value.technique.trigger.optionId,
                },
                optional: value.technique.optional,
                effectSaveDc: value.technique.effectSaveDc,
                effects: value.technique.effects,
              },
            };
      },
      stunningStrike: (value) => {
        const resourcePoolRef = context.resourcePoolRefsByUnitId.get(
          value.stunningStrike.spends.resourceUnitId,
        );
        return resourcePoolRef === undefined
          ? undefined
          : {
              kind: value.kind,
              stunningStrike: {
                trigger: value.stunningStrike.trigger,
                optional: value.stunningStrike.optional,
                spends: {
                  resourcePoolRef,
                  amount: value.stunningStrike.spends.amount,
                },
                savingThrow: value.stunningStrike.savingThrow,
                onFail: value.stunningStrike.onFail,
                onSuccess: value.stunningStrike.onSuccess,
              },
            };
      },
      cunningStrike: (value) => {
        const damageRiderProcedureRef =
          context.unitFeatureProcedureRefsByUnitId.get(
            value.cunningStrike.trigger.sourceUnitId,
          );
        return damageRiderProcedureRef === undefined
          ? undefined
          : {
              kind: value.kind,
              cunningStrike: {
                trigger: {
                  kind: value.cunningStrike.trigger.kind,
                  damageRiderProcedureRef,
                },
                choice: value.cunningStrike.choice,
                effectSaveDc: value.cunningStrike.effectSaveDc,
                options: value.cunningStrike.options,
              },
            };
      },
      cunningStrikeOptionGrant: (value) => {
        const sourceProcedureRef = context.supportProcedureRefsByUnitId.get(
          value.optionGrant.sourceUnitId,
        );
        return sourceProcedureRef === undefined
          ? undefined
          : {
              kind: value.kind,
              optionGrant: {
                sourceProcedureRef,
                option: value.optionGrant.option,
              },
            };
      },
      paladinSacredWeapon: (value) => {
        const resourcePoolRef = context.resourcePoolRefsByUnitId.get(
          value.sacredWeapon.spends.resourceUnitId,
        );
        return resourcePoolRef === undefined
          ? undefined
          : {
              kind: value.kind,
              sacredWeapon: {
                activationCost: value.sacredWeapon.activationCost,
                spends: {
                  resourcePoolRef,
                  amount: value.sacredWeapon.spends.amount,
                },
                target: value.sacredWeapon.target,
                duration: value.sacredWeapon.duration,
                attackRollBonus: value.sacredWeapon.attackRollBonus,
                hitDamageTypeChoice: value.sacredWeapon.hitDamageTypeChoice,
                light: value.sacredWeapon.light,
              },
            };
      },
    }),
  );
}

export function characterSpellProcedureRef(
  execution: CharacterExecutionState,
  invocation: SupportedSpellInvocation | SpellProcedureExecution,
): BattleProcedureExecutionRef | undefined {
  return execution.procedureBindings.find(
    (binding) =>
      binding.procedure.kind === "spellInvocation" &&
      spellInvocationMatchesExecution(invocation, binding.procedure.execution),
  )?.procedureRef;
}

export function characterSpellProcedureRefs(
  execution: CharacterExecutionState,
  invocations: readonly SupportedSpellInvocation[],
): readonly (BattleProcedureExecutionRef | undefined)[] {
  const remainingBindings = execution.procedureBindings.filter(
    (binding) => binding.procedure.kind === "spellInvocation",
  );
  return invocations.map((invocation) => {
    const bindingIndex = remainingBindings.findIndex(
      (binding) =>
        binding.procedure.kind === "spellInvocation" &&
        spellInvocationMatchesExecution(
          invocation,
          binding.procedure.execution,
        ),
    );
    if (bindingIndex < 0) return undefined;
    const [binding] = remainingBindings.splice(bindingIndex, 1);
    return binding?.procedureRef;
  });
}

export function characterStoredSpellProcedureRef(
  execution: CharacterExecutionState,
  invocation: SupportedSpellInvocation | SpellProcedureExecution,
): BattleProcedureExecutionRef | undefined {
  const stored =
    "spell" in invocation ? spellProcedureExecution(invocation) : invocation;
  return characterStoredExecutionProcedureRef(execution, stored);
}

export function spellInvocationMatchesExecution(
  invocation: SupportedSpellInvocation | SpellProcedureExecution,
  execution: SpellProcedureExecution,
): boolean {
  const projected =
    "spell" in invocation ? spellProcedureExecution(invocation) : invocation;
  return sameSpellProcedureExecution(projected, execution);
}

export function spellProcedureExecution<
  Invocation extends SupportedSpellInvocation,
>(invocation: Invocation): SpellProcedureExecution<Invocation>;
export function spellProcedureExecution(
  invocation: SupportedSpellInvocation,
): SpellProcedureExecution {
  const spellRuleFacts = spellRuleExecutionFactsWithCastingSource(
    invocation.spell.spellDefinitionRuleFacts,
    invocation.spell.castingSource,
  );
  return Match.value(invocation).pipe(
    Match.discriminatorsExhaustive("procedure")({
      abilityD20TestRollModeSaveGate: (value) => ({
        spellRuleFacts,
        ability: value.ability,
        access: value.access,
        actionCost: value.actionCost,
        dc: value.dc,
        failedSaveDamagePenaltyEffect: value.failedSaveDamagePenaltyEffect,
        failedSaveEffect: value.failedSaveEffect,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        successEffect: value.successEffect,
        targeting: value.targeting,
      }),
      afterHitDamage: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        conditionalBonusDamage: value.conditionalBonusDamage,
        damage: value.damage,
        procedure: value.procedure,
        resource: value.resource,
      }),
      afterHitDamageAndIllumination: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        damage: value.damage,
        illumination: value.illumination,
        procedure: value.procedure,
        resource: value.resource,
      }),
      afterHitSaveGatedCondition: (value) => ({
        spellRuleFacts,
        ability: value.ability,
        access: value.access,
        actionCost: value.actionCost,
        dc: value.dc,
        effect: value.effect,
        procedure: value.procedure,
        resource: value.resource,
        targeting: value.targeting,
      }),
      afterHitTimedDamageAndSave: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        immediateDamage: value.immediateDamage,
        procedure: value.procedure,
        resource: value.resource,
      }),
      magicSuppressionEmanation: (value) => ({
        spellRuleFacts,
        access: value.access,
        durationTicks: value.durationTicks,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      attackBurstSaveDamage: (value) => ({
        spellRuleFacts,
        access: value.access,
        attackBonus: value.attackBonus,
        attackKind: value.attackKind,
        burst: value.burst,
        damage: value.damage,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      perceptionGatedAttackRollDefense: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        procedure: value.procedure,
        resource: value.resource,
      }),
      chainedSpellAttackDamage: (value) => ({
        spellRuleFacts,
        access: value.access,
        attackBonus: value.attackBonus,
        attackKind: value.attackKind,
        damage: value.damage,
        damageTypeChoices: value.damageTypeChoices,
        leapRangeFeet: value.leapRangeFeet,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      chosenDamageResistance: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        damageTypeChoices: value.damageTypeChoices,
        expiresAt: value.expiresAt,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      compelledNextTurnBehavior: (value) => ({
        spellRuleFacts,
        ability: value.ability,
        access: value.access,
        actionCost: value.actionCost,
        dc: value.dc,
        procedure: value.procedure,
        resource: value.resource,
        targeting: value.targeting,
      }),
      conditionImmunityAndTurnStartTemporaryHitPoints: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        activeEffects: value.activeEffects,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      conditionRemovalProtection: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        procedure: value.procedure,
        protection: value.protection,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      spellCastInterruptionReaction: (value) => ({
        spellRuleFacts,
        ability: value.ability,
        access: value.access,
        dc: value.dc,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        triggerComponents: value.triggerComponents,
        targeting: value.targeting,
      }),
      creatureSizeDecrease: (value) => ({
        spellRuleFacts,
        ability: value.ability,
        access: value.access,
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        dc: value.dc,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      creatureSizeIncrease: (value) => ({
        spellRuleFacts,
        ability: value.ability,
        access: value.access,
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        dc: value.dc,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      creatureTypeProtection: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      damageReduction: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        amount: value.amount,
        damageTypeChoices: value.damageTypeChoices,
        expiresAt: value.expiresAt,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      movableLightManifestation: (value) =>
        Match.value(value).pipe(
          Match.when({ operation: "create" }, (created) => ({
            spellRuleFacts,
            access: created.access,
            actionCost: created.actionCost,
            dimRadiusFeet: created.dimRadiusFeet,
            expiresAt: created.expiresAt,
            form: created.form,
            maxMoveFeet: created.maxMoveFeet,
            operation: created.operation,
            procedure: created.procedure,
            rangeFeet: created.rangeFeet,
            resource: created.resource,
            spacingFeet: created.spacingFeet,
          })),
          Match.when({ operation: "reposition" }, (reposition) => ({
            spellRuleFacts,
            access: reposition.access,
            actionCost: reposition.actionCost,
            activeEffectRef: reposition.activeEffectRef,
            maxMoveFeet: reposition.maxMoveFeet,
            operation: reposition.operation,
            procedure: reposition.procedure,
            rangeFeet: reposition.rangeFeet,
            resource: reposition.resource,
            sourceManifestationProcedureRef:
              reposition.sourceManifestationProcedureRef,
            spacingFeet: reposition.spacingFeet,
          })),
          Match.exhaustive,
        ),
      directCondition: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      directConditionRemoval: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        conditionChoices: value.conditionChoices,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      directHitPointRestoration: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        healing: value.healing,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      grantedAreaSaveDamageAction: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        ability: value.ability,
        activeEffect: value.activeEffect,
        dc: value.dc,
        damageTypeChoices: value.damageTypeChoices,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      grantedAlternateActionCost: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        procedure: value.procedure,
        resource: value.resource,
      }),
      fallingCreatureMitigationReaction: (value) => ({
        spellRuleFacts,
        access: value.access,
        activeEffect: value.activeEffect,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      persistentAreaSaveDamage: (value) =>
        Match.value(value).pipe(
          Match.when({ lifecycle: { kind: "stationary" } }, (stationary) => ({
            spellRuleFacts,
            ability: stationary.ability,
            access: stationary.access,
            damage: stationary.damage,
            dc: stationary.dc,
            durationTicks: stationary.durationTicks,
            lifecycle: stationary.lifecycle,
            procedure: stationary.procedure,
            rangeFeet: stationary.rangeFeet,
            resource: stationary.resource,
            targeting: stationary.targeting,
          })),
          Match.when(
            { lifecycle: { kind: "sourceTurnTranslation" } },
            (translation) => ({
              spellRuleFacts,
              ability: translation.ability,
              access: translation.access,
              damage: translation.damage,
              dc: translation.dc,
              durationTicks: translation.durationTicks,
              lifecycle: translation.lifecycle,
              procedure: translation.procedure,
              rangeFeet: translation.rangeFeet,
              resource: translation.resource,
              targeting: translation.targeting,
            }),
          ),
          Match.when(
            {
              lifecycle: {
                kind: "casterActionReposition",
                collisionDisposition: "stopAndAffectAdjacent",
              },
            },
            (collision) => ({
              spellRuleFacts,
              ability: collision.ability,
              access: collision.access,
              damage: collision.damage,
              dc: collision.dc,
              durationTicks: collision.durationTicks,
              lifecycle: collision.lifecycle,
              procedure: collision.procedure,
              ramMaxMoveFeet: collision.ramMaxMoveFeet,
              rangeFeet: collision.rangeFeet,
              resource: collision.resource,
              targeting: collision.targeting,
            }),
          ),
          Match.when(
            {
              lifecycle: {
                kind: "casterActionReposition",
                collisionDisposition: "ignoreObstacles",
              },
            },
            (directed) => ({
              spellRuleFacts,
              ability: directed.ability,
              access: directed.access,
              damage: directed.damage,
              dc: directed.dc,
              durationTicks: directed.durationTicks,
              lifecycle: directed.lifecycle,
              procedure: directed.procedure,
              rangeFeet: directed.rangeFeet,
              repositionMaxMoveFeet: directed.repositionMaxMoveFeet,
              resource: directed.resource,
              targeting: directed.targeting,
            }),
          ),
          Match.exhaustive,
        ),
      persistentAreaTrait: (value) => ({
        spellRuleFacts,
        access: value.access,
        durationTicks: value.durationTicks,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      persistentAreaSaveCondition: (value) => ({
        spellRuleFacts,
        ability: value.ability,
        access: value.access,
        dc: value.dc,
        durationTicks: value.durationTicks,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      directionalPersistentArea: (value) => ({
        spellRuleFacts,
        ability: value.ability,
        access: value.access,
        dc: value.dc,
        durationTicks: value.durationTicks,
        movementCost: value.movementCost,
        procedure: value.procedure,
        pushDistanceFeet: value.pushDistanceFeet,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      compositeTargetBuffWithAftermath: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        activeEffects: value.activeEffects,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      heldLight: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        expiresAt: value.expiresAt,
        hurl: value.hurl,
        light: value.light,
        procedure: value.procedure,
        resource: value.resource,
      }),
      /* v8 ignore start -- @preserve -- Held-light hurl is synthesized from an admitted active effect; it is never an authored character spell invocation at this projection boundary. */
      heldLightHurl: (value) => ({
        spellRuleFacts,
        access: value.access,
        attackBonus: value.attackBonus,
        attackKind: value.attackKind,
        damage: value.damage,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        sourceEffectRef: value.sourceEffectRef,
        sourceHeldLightProcedureRef: value.sourceHeldLightProcedureRef,
        targeting: value.targeting,
      }),
      saveGatedConditionWithRepeat: (value) => ({
        spellRuleFacts,
        ability: value.ability,
        access: value.access,
        actionCost: value.actionCost,
        dc: value.dc,
        procedure: value.procedure,
        resource: value.resource,
        targeting: value.targeting,
      }),
      /* v8 ignore stop -- @preserve */
      saveGatedAreaControl: (value) => ({
        spellRuleFacts,
        ability: value.ability,
        access: value.access,
        actionCost: value.actionCost,
        dc: value.dc,
        durationTicks: value.durationTicks,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      fixedCostMovementReplacement: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      controlledVerticalSuspension: (value) => ({
        spellRuleFacts,
        ability: value.ability,
        access: value.access,
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        dc: value.dc,
        maxAltitudeChangeFeet: value.maxAltitudeChangeFeet,
        maxInitialRiseFeet: value.maxInitialRiseFeet,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      magicalDarknessPointOrigin: (value) => ({
        spellRuleFacts,
        access: value.access,
        dispelledSpellCreatedLightMaxSpellLevel:
          value.dispelledSpellCreatedLightMaxSpellLevel,
        durationTicks: value.durationTicks,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      weaponAttackDamageEnhancement: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        bonus: value.bonus,
        durationTicks: value.durationTicks,
        procedure: value.procedure,
        resource: value.resource,
      }),
      makeStable: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
      }),
      markedDamageRider: (value) =>
        Match.value(value).pipe(
          Match.when({ action: "cast" }, (cast) => {
            return {
              spellRuleFacts,
              abilityCheckBehavior: cast.abilityCheckBehavior,
              access: cast.access,
              action: cast.action,
              actionCost: cast.actionCost,
              damage: cast.damage,
              expiresAt: cast.expiresAt,
              procedure: cast.procedure,
              rangeFeet: cast.rangeFeet,
              resource: cast.resource,
              retargetTiming: cast.retargetTiming,
              targeting: cast.targeting,
            };
          }),
          Match.when({ action: "transfer" }, (transfer) => ({
            action: transfer.action,
            activeEffectRef: transfer.activeEffect.effectRef,
            activeEffectSourceProcedureRef:
              transfer.activeEffect.sourceProcedureRef,
            procedure: transfer.procedure,
          })),
          Match.exhaustive,
        ),
      duplicateHitInterception: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        procedure: value.procedure,
        resource: value.resource,
      }),
      objectContactDamage: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        damage: value.damage,
        durationTicks: value.durationTicks,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      objectContactDamageRepeat: (value) => ({
        activeEffectRef: value.activeEffect.effectRef,
        activeEffectSourceProcedureRef: value.activeEffect.sourceProcedureRef,
        procedure: value.procedure,
      }),
      objectLight: (value) =>
        Match.value(value).pipe(
          Match.when({ access: isCantripSpellAccess }, (value) => ({
            spellRuleFacts,
            access: value.access,
            actionCost: value.actionCost,
            expiresAt: value.expiresAt,
            light: value.light,
            procedure: value.procedure,
            resource: value.resource,
            targeting: value.targeting,
          })),
          Match.when({ access: { tag: "prepared" } }, (value) => ({
            spellRuleFacts,
            access: value.access,
            actionCost: value.actionCost,
            expiresAt: value.expiresAt,
            light: value.light,
            procedure: value.procedure,
            resource: value.resource,
            targeting: value.targeting,
          })),
          Match.exhaustive,
        ),
      ongoingSpellEnd: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
      }),
      persistentArmorEffect: (value) =>
        Match.value(value).pipe(
          Match.when({ access: { tag: "prepared" } }, (value) => ({
            spellRuleFacts,
            access: value.access,
            activeEffect: value.activeEffect,
            procedure: value.procedure,
            rangeFeet: value.rangeFeet,
            resource: value.resource,
          })),
          Match.when({ access: { tag: "armorOfShadows" } }, (value) => ({
            spellRuleFacts,
            access: value.access,
            activeEffect: value.activeEffect,
            procedure: value.procedure,
            rangeFeet: value.rangeFeet,
            resource: value.resource,
          })),
          Match.exhaustive,
        ),
      repeatedDamageAllocation: (value) => ({
        spellRuleFacts,
        access: value.access,
        damage: value.damage,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      rollModifier: (value) =>
        "abilityChoiceApplication" in value
          ? {
              spellRuleFacts,
              abilityChoiceApplication: value.abilityChoiceApplication,
              abilityChoices: value.abilityChoices,
              access: value.access,
              actionCost: value.actionCost,
              effect: value.effect,
              procedure: value.procedure,
              rangeFeet: value.rangeFeet,
              resource: value.resource,
              saveGate: value.saveGate,
              targeting: value.targeting,
            }
          : {
              spellRuleFacts,
              abilityChoices: value.abilityChoices,
              access: value.access,
              actionCost: value.actionCost,
              effect: value.effect,
              procedure: value.procedure,
              rangeFeet: value.rangeFeet,
              resource: value.resource,
              saveGate: value.saveGate,
              targeting: value.targeting,
            },
      targetingSaveInterdiction: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      saveGatedAttackRollAdvantage: (value) => ({
        spellRuleFacts,
        ability: value.ability,
        access: value.access,
        dc: value.dc,
        effect: value.effect,
        illumination: value.illumination,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      saveGatedCondition: (value) => ({
        spellRuleFacts,
        ability: value.ability,
        access: value.access,
        dc: value.dc,
        effect: value.effect,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        saveRollModeRule: value.saveRollModeRule,
        targetCreatureTypes: value.targetCreatureTypes,
        targeting: value.targeting,
      }),
      saveGatedConditionImmunity: (value) => ({
        spellRuleFacts,
        ability: value.ability,
        access: value.access,
        actionCost: value.actionCost,
        activeEffects: value.activeEffects,
        dc: value.dc,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targetCreatureTypes: value.targetCreatureTypes,
        targeting: value.targeting,
      }),
      saveGatedDamage: (value) =>
        Match.value(value).pipe(
          Match.when({ access: isCantripSpellAccess }, (value) => ({
            spellRuleFacts,
            ability: value.ability,
            access: value.access,
            additionalDamageComponents: value.additionalDamageComponents,
            castingTime: value.castingTime,
            damage: value.damage,
            dc: value.dc,
            failedSaveAbilityChoices: value.failedSaveAbilityChoices,
            failedSaveConditionEffects: value.failedSaveConditionEffects,
            failedSavePostDamageRiders: value.failedSavePostDamageRiders,
            postSaveAreaEffect: value.postSaveAreaEffect,
            procedure: value.procedure,
            rangeFeet: value.rangeFeet,
            resource: value.resource,
            saveRollModeRule: value.saveRollModeRule,
            successDamage: value.successDamage,
            targeting: value.targeting,
          })),
          Match.when({ access: { tag: "prepared" } }, (value) => ({
            spellRuleFacts,
            ability: value.ability,
            access: value.access,
            additionalDamageComponents: value.additionalDamageComponents,
            castingTime: value.castingTime,
            damage: value.damage,
            dc: value.dc,
            failedSaveAbilityChoices: value.failedSaveAbilityChoices,
            failedSaveConditionEffects: value.failedSaveConditionEffects,
            failedSavePostDamageRiders: value.failedSavePostDamageRiders,
            postSaveAreaEffect: value.postSaveAreaEffect,
            procedure: value.procedure,
            rangeFeet: value.rangeFeet,
            resource: value.resource,
            saveRollModeRule: value.saveRollModeRule,
            successDamage: value.successDamage,
            targeting: value.targeting,
          })),
          Match.exhaustive,
        ),
      scalarBuff: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        effect: value.effect,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      seeInvisibleObserverSight: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        procedure: value.procedure,
        resource: value.resource,
      }),
      selfTeleport: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        maxDistanceFeet: value.maxDistanceFeet,
        procedure: value.procedure,
        resource: value.resource,
      }),
      selfTransformationMode: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        expiresAt: value.expiresAt,
        modeChoices: value.modeChoices,
        naturalWeaponFacts: value.naturalWeaponFacts,
        procedure: value.procedure,
        resource: value.resource,
      }),
      triggeredArmorDefense: (value) => ({
        spellRuleFacts,
        access: value.access,
        armorClassBonus: value.armorClassBonus,
        negatesRepeatedDamageAllocation: value.negatesRepeatedDamageAllocation,
        procedure: value.procedure,
        resource: value.resource,
      }),
      saveGatedTurnConstraintBundle: (value) => ({
        spellRuleFacts,
        ability: value.ability,
        access: value.access,
        actionCost: value.actionCost,
        dc: value.dc,
        durationTicks: value.durationTicks,
        maxTargets: value.maxTargets,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      persistentAreaSaveComposite: (value) => ({
        spellRuleFacts,
        ability: value.ability,
        access: value.access,
        dc: value.dc,
        durationTicks: value.durationTicks,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      stagedSaveCondition: (value) => ({
        spellRuleFacts,
        ability: value.ability,
        access: value.access,
        automaticSuccessPredicates: value.automaticSuccessPredicates,
        dc: value.dc,
        escapeAction: value.escapeAction,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      spellAttackDamage: (value) =>
        Match.value(value).pipe(
          Match.when({ access: isCantripSpellAccess }, (value) => ({
            spellRuleFacts,
            access: value.access,
            attackBonus: value.attackBonus,
            attackKind: value.attackKind,
            damage: value.damage,
            laterDamage: value.laterDamage,
            missDamage: value.missDamage,
            objectHitEffect: value.objectHitEffect,
            postDamageRiders: value.postDamageRiders,
            procedure: value.procedure,
            rangeFeet: value.rangeFeet,
            resource: value.resource,
            targeting: value.targeting,
          })),
          Match.when({ access: { tag: "prepared" } }, (value) => ({
            spellRuleFacts,
            access: value.access,
            attackBonus: value.attackBonus,
            attackKind: value.attackKind,
            damage: value.damage,
            laterDamage: value.laterDamage,
            missDamage: value.missDamage,
            objectHitEffect: value.objectHitEffect,
            postDamageRiders: value.postDamageRiders,
            procedure: value.procedure,
            rangeFeet: value.rangeFeet,
            resource: value.resource,
            targeting: value.targeting,
          })),
          Match.exhaustive,
        ),
      spellAttackSequence: (value) =>
        Match.value(value).pipe(
          Match.when({ access: isCantripSpellAccess }, (value) => ({
            spellRuleFacts,
            access: value.access,
            attackBonus: value.attackBonus,
            attackKind: value.attackKind,
            damage: value.damage,
            procedure: value.procedure,
            rangeFeet: value.rangeFeet,
            resource: value.resource,
            targeting: value.targeting,
          })),
          Match.when({ access: { tag: "prepared" } }, (value) => ({
            spellRuleFacts,
            access: value.access,
            attackBonus: value.attackBonus,
            attackKind: value.attackKind,
            damage: value.damage,
            procedure: value.procedure,
            rangeFeet: value.rangeFeet,
            resource: value.resource,
            targeting: value.targeting,
          })),
          Match.exhaustive,
        ),
      spellCreatedHeldObject: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        procedure: value.procedure,
        resource: value.resource,
      }),
      /* v8 ignore start -- @preserve -- The held-object attack is synthesized from an admitted active effect; it is never an authored character spell invocation at this projection boundary. */
      spellCreatedHeldObjectAttack: (value) => ({
        spellRuleFacts,
        access: value.access,
        sourceEffectRef: value.sourceEffectRef,
        sourceHeldObjectProcedureRef: value.sourceHeldObjectProcedureRef,
        attackBonus: value.attackBonus,
        attackKind: value.attackKind,
        damage: value.damage,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Held-object re-evocation is synthesized from an admitted active effect; it is never an authored character spell invocation at this projection boundary. */
      spellCreatedHeldObjectReEvoke: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        sourceEffectRef: value.sourceEffectRef,
        sourceHeldObjectProcedureRef: value.sourceHeldObjectProcedureRef,
        procedure: value.procedure,
        resource: value.resource,
      }),
      /* v8 ignore stop -- @preserve */
      spellHostedWeaponAttack: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        attackBonus: value.attackBonus,
        bonusDamage: value.bonusDamage,
        componentWeaponObjectId: value.componentWeapon.objectId,
        damageTypeChoices: value.damageTypeChoices,
        procedure: value.procedure,
        resource: value.resource,
        spellcastingAbilityModifier: value.spellcastingAbilityModifier,
      }),
      areaMovementDistanceDamage: (value) => ({
        spellRuleFacts,
        access: value.access,
        damage: value.damage,
        damagePerFeet: value.damagePerFeet,
        durationTicks: value.durationTicks,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      spatialMeleeSpellAttackProxy: (value) =>
        Match.value(value).pipe(
          Match.when({ operation: "createAndAttack" }, (created) => {
            return {
              spellRuleFacts,
              access: created.access,
              actionCost: created.actionCost,
              attackBonus: created.attackBonus,
              attackKind: created.attackKind,
              damage: created.damage,
              durationTicks: created.durationTicks,
              forceReachFeet: created.forceReachFeet,
              operation: created.operation,
              procedure: created.procedure,
              rangeFeet: created.rangeFeet,
              repeatMoveMaxFeet: created.repeatMoveMaxFeet,
              resource: created.resource,
              targeting: created.targeting,
            };
          }),
          Match.when({ operation: "repositionAndAttack" }, (repeat) => ({
            activeEffectRef: repeat.activeEffect.effectRef,
            activeEffectSourceProcedureRef:
              repeat.activeEffect.sourceProcedureRef,
            operation: repeat.operation,
            procedure: repeat.procedure,
            repeatTargeting: repeat.repeatTargeting,
          })),
          Match.exhaustive,
        ),
      spawnedCompanionLifecycle: (value) => ({
        casting: value.casting,
        control: value.control,
        formEligibility: value.formEligibility,
        initialPlacement: value.initialPlacement,
        lifecycle: value.lifecycle,
        procedure: value.procedure,
        sharedSensesActionCost: value.sharedSensesActionCost,
        telepathyRangeFeet: value.telepathyRangeFeet,
        touchSpellProxy: value.touchSpellProxy,
      }),
      temporaryAbilityCheckRollMode: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        selectedMode: value.selectedMode,
        concurrentDurationModeLimit: value.concurrentDurationModeLimit,
      }),
      linkedDefenseResistanceDamageShare: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        connectionRangeFeet: value.connectionRangeFeet,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
      }),
      weaponAttackOverride: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        attachedWeaponSlot: value.attachedWeaponSlot,
        procedure: value.procedure,
        resource: value.resource,
      }),
      weaponDamageRider: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        procedure: value.procedure,
        resource: value.resource,
      }),
      persistentAreaSaveConditionEscape: (value) => ({
        spellRuleFacts,
        ability: value.ability,
        access: value.access,
        dc: value.dc,
        durationTicks: value.durationTicks,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
    }),
  );
}

export function bindSelectedSpellInvocation(
  execution: SelectableSpellProcedureExecution,
  procedureRef: BattleProcedureExecutionRef,
): BattleSelectedSpellInvocation {
  return { ...execution, sourceProcedureRef: procedureRef };
}

export function bindAuthoredSelectedSpellInvocation<
  I extends AuthoredSupportedSpellInvocation,
>(
  invocation: I,
  procedureRef: BattleProcedureExecutionRef,
): AuthoredSelectedSpellInvocation<I> {
  return { ...invocation, sourceProcedureRef: procedureRef };
}
