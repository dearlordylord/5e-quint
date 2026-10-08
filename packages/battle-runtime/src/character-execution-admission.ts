// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.passive-initiative-roll-mode unit-feature.ongoing-feature-activation-movement-rider
import { spellProcedureExecution } from "./spell-procedure-execution-admission.ts";
export { spellProcedureExecution } from "./spell-procedure-execution-admission.ts";
import { optionalProperty } from "./optional-property.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.bonus-action-healing-movement-rider
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
import {
  characterBattleResourceInitFromAdmissionInput,
  type CharacterBattleResourceProcedureAdmission,
} from "./character-battle-resources.ts";
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
import type { SpellProcedureExecution } from "./procedure-execution/spell-procedure-execution.ts";
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

function bindProfileUnitFeatureProcedure(
  procedure: BoundUnitFeatureProcedureFacts,
  input: {
    readonly resourcePoolRefsByUnitId: ReadonlyMap<
      AuthoredUnitSource["id"],
      BattleResourcePoolExecutionRef
    >;
    readonly classLevels: CharacterBattleClassLevels;
    readonly executionContext: UnitFeatureProcedureExecutionContext;
  },
): ResourceFeatureProcedureBinding {
  if (procedure.facts.kind === "failedSavingThrowReroll") {
    const binding = bindFailedSavingThrowRerollProcedure(
      { sourceUnitId: procedure.sourceUnitId, facts: procedure.facts },
      input,
    );
    return binding.tag === "rejected"
      ? {
          tag: "rejected",
          messages: resourceFeatureBindingMessages(binding.issues),
        }
      : {
          tag: "bound",
          candidate: {
            unitId: procedure.sourceUnitId,
            execution: binding.procedure.execution,
          },
        };
  }
  const execution = unitFeatureProcedureExecution(
    procedure.facts,
    input.executionContext,
  );
  if (execution !== undefined) {
    return {
      tag: "bound",
      candidate: { unitId: procedure.sourceUnitId, execution },
    };
  }
  return procedure.facts.kind === "cunningStrike" ||
    procedure.facts.kind === "cunningStrikeOptionGrant"
    ? { tag: "notAvailable" }
    : {
        tag: "rejected",
        messages: [
          `Unit feature profile ${procedure.facts.kind} references an unavailable mechanical execution resource.`,
        ],
      };
}

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

function resourceUnitFeatureProcedures(
  admissions: readonly CharacterBattleResourceProcedureAdmission[],
): readonly BoundUnitFeatureProcedureFacts[] {
  return admissions.flatMap((admission) =>
    Match.value(admission).pipe(
      Match.discriminatorsExhaustive("tag")({
        resourceWithoutProcedure: () => [],
        resourceFeatureProcedure: () => [],
        unitFeatureProcedure: ({ resource, facts }) => [
          { sourceUnitId: resource.unit.id, facts },
        ],
      }),
    ),
  );
}

function admittedResourceFeatures(
  admissions: readonly CharacterBattleResourceProcedureAdmission[],
): readonly AdmittedResourceFeature[] {
  return admissions.flatMap((admission) =>
    Match.value(admission).pipe(
      Match.discriminatorsExhaustive("tag")({
        resourceWithoutProcedure: () => [],
        unitFeatureProcedure: () => [],
        resourceFeatureProcedure: ({ resource }) => [
          {
            sourceUnitId: resource.init.unit.id,
            procedure: resource.procedure,
          },
        ],
      }),
    ),
  );
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

function isAcquiredClassFeature(
  unit: BattleUnitSupportSource,
  classLevels: CharacterBattleClassLevels,
): boolean {
  if (
    unit.kind !== "class_feature" ||
    !("className" in unit) ||
    !("acquiredAtLevel" in unit)
  )
    return false;
  const owningLevel = classLevels.find(
    (level) => level.className === unit.className,
  )?.level;
  return owningLevel !== undefined && owningLevel >= unit.acquiredAtLevel;
}

function hasAcquiredHealingMovementActivation(
  unit: BattleUnitSupportSource,
  profile: Extract<
    BattleUnitSupportProfile,
    { readonly kind: "bonusActionHealingMovementRider" }
  >,
  classLevels: CharacterBattleClassLevels,
  resourceProcedures: ReturnType<typeof resourceUnitFeatureProcedures>,
): boolean {
  if (
    unit.kind !== "class_feature" ||
    unit.mechanics.family !== "bonus_action_healing_movement_rider" ||
    !isAcquiredClassFeature(unit, classLevels)
  )
    return false;
  return (
    profile.activatesWith.resourceUnitId ===
      unit.mechanics.activatesWith.resourceUnitId &&
    resourceProcedures.some(
      (procedure) =>
        procedure.sourceUnitId === profile.activatesWith.resourceUnitId &&
        procedure.facts.kind === "selfBonusActionHealing",
    )
  );
}

function hasAcquiredOngoingFeatureMovementActivation(
  unit: BattleUnitSupportSource,
  profile: Extract<
    BattleUnitSupportProfile,
    { readonly kind: "ongoingFeatureActivationMovementRider" }
  >,
  classLevels: CharacterBattleClassLevels,
  resourceProcedures: ReturnType<typeof resourceUnitFeatureProcedures>,
): boolean {
  return (
    isAcquiredClassFeature(unit, classLevels) &&
    unit.kind === "class_feature" &&
    unit.mechanics.family === "ongoing_feature_activation_movement_rider" &&
    unit.mechanics.activatesWith.resourceUnitId ===
      profile.activatesWith.resourceUnitId &&
    resourceProcedures.some(
      (procedure) =>
        procedure.sourceUnitId === profile.activatesWith.resourceUnitId &&
        procedure.facts.kind === "ongoingFeature" &&
        procedure.facts.activationTrigger === "bonusAction",
    )
  );
}

function passiveInitiativeProfileAdmission(
  unit: BattleUnitSupportSource,
  profile: BattleUnitSupportProfile,
  classLevels: CharacterBattleClassLevels,
  procedureRefs: UnitSupportProcedureExecutionContext["unitFeatureProcedureRefsByUnitId"],
): Result.Result<boolean, BattleUnitSupportProfileIssue> {
  if (
    typeof profile !== "object" ||
    profile.kind !== "passiveInitiativeRollMode"
  )
    return Result.succeed(true);
  if (!isAcquiredClassFeature(unit, classLevels))
    return Result.fail({
      tag: "battleUnitSupportProfileIssue",
      message:
        "Passive Initiative roll mode requires an acquired class feature Unit.",
    });
  return Result.succeed(
    !(
      unit.kind === "class_feature" &&
      unit.mechanics.family === "remarkable_athlete" &&
      !procedureRefs.has(unit.id)
    ),
  );
}

function activationMovementProfileAdmissionIssue(
  unit: BattleUnitSupportSource,
  profile: BattleUnitSupportProfile,
  classLevels: CharacterBattleClassLevels,
  resourceProcedures: ReturnType<typeof resourceUnitFeatureProcedures>,
): BattleUnitSupportProfileIssue | undefined {
  if (
    typeof profile !== "object" ||
    (profile.kind !== "bonusActionHealingMovementRider" &&
      profile.kind !== "ongoingFeatureActivationMovementRider")
  )
    return undefined;
  const acquired =
    profile.kind === "bonusActionHealingMovementRider"
      ? hasAcquiredHealingMovementActivation(
          unit,
          profile,
          classLevels,
          resourceProcedures,
        )
      : hasAcquiredOngoingFeatureMovementActivation(
          unit,
          profile,
          classLevels,
          resourceProcedures,
        );
  if (acquired) return undefined;
  return {
    tag: "battleUnitSupportProfileIssue",
    message:
      "Activation movement requires an acquired matching class feature Unit.",
  };
}

export function characterExecutionFromUnits(input: {
  readonly battleId: BattleId;
  readonly combatantId: CombatantId;
  readonly scopeOrdinal: BattleExecutionScopeOrdinal;
  readonly unitFeatureProcedures: readonly BoundUnitFeatureProcedureFacts[];
  readonly resourceAdmissions: readonly CharacterBattleResourceProcedureAdmission[];
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
  const resourceUnits = input.resourceAdmissions.map(
    ({ resource }) =>
      characterBattleResourceInitFromAdmissionInput(resource).unit,
  );
  const resourcePoolRefsByUnitId = new Map(
    resourceUnits.map((unit, ordinal) => [
      unit.id,
      battleResourcePoolExecutionRef(scopeRef, NonNegativeInteger(ordinal)),
    ]),
  );
  const unitFeatureExecutionContext: UnitFeatureProcedureExecutionContext = {
    resourcePoolRefsByUnitId,
  };
  const resourceProfileProcedures = resourceUnitFeatureProcedures(
    input.resourceAdmissions,
  );
  const unitFeatureProcedures = [
    ...resourceProfileProcedures,
    ...input.unitFeatureProcedures,
  ];
  const resourceFeatureUnitProcedures = admittedResourceFeatures(
    input.resourceAdmissions,
  ).flatMap((feature) => {
    const binding = bindResourceFeatureProcedure(feature, {
      resourcePoolRefsByUnitId,
      classLevels: input.classLevels,
    });
    return Match.value(binding).pipe(
      Match.discriminatorsExhaustive("tag")({
        bound: ({ candidate }) => [
          {
            ...candidate,
            source: characterUnitProcedureSourceForAdmission(
              scopeRef,
              resourceUnits,
              candidate.unitId,
            ),
          },
        ],
        notAvailable: () => [],
        rejected: ({ messages }) => {
          supportProfileIssues.push(
            ...messages.map((message) => ({
              tag: "battleUnitSupportProfileIssue" as const,
              message,
            })),
          );
          return [];
        },
      }),
    );
  });
  const boundProfileUnitProcedures = unitFeatureProcedures.flatMap(
    (procedure) => {
      const binding = bindProfileUnitFeatureProcedure(procedure, {
        resourcePoolRefsByUnitId,
        classLevels: input.classLevels,
        executionContext: unitFeatureExecutionContext,
      });
      return Match.value(binding).pipe(
        Match.discriminatorsExhaustive("tag")({
          bound: ({ candidate }) => [
            {
              ...candidate,
              source: characterUnitProcedureSourceForAdmission(
                scopeRef,
                resourceUnits,
                procedure.sourceUnitId,
              ),
            },
          ],
          notAvailable: () => [],
          rejected: ({ messages }) => {
            supportProfileIssues.push(
              ...messages.map((message) => ({
                tag: "battleUnitSupportProfileIssue" as const,
                message,
              })),
            );
            return [];
          },
        }),
      );
    },
  );
  const unitProcedures = [
    ...resourceFeatureUnitProcedures,
    ...boundProfileUnitProcedures,
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
      unitRef.supportProfiles.flatMap((profile) => {
        const initiativeAdmission = passiveInitiativeProfileAdmission(
          unitRef.unit,
          profile,
          input.classLevels,
          unitFeatureProcedureRefsByUnitId,
        );
        if (Result.isFailure(initiativeAdmission)) {
          supportProfileIssues.push(initiativeAdmission.failure);
          return [];
        }
        if (!initiativeAdmission.success) return [];
        const activationIssue = activationMovementProfileAdmissionIssue(
          unitRef.unit,
          profile,
          input.classLevels,
          resourceProfileProcedures,
        );
        if (activationIssue !== undefined) {
          supportProfileIssues.push(activationIssue);
          return [];
        }
        return [{ unitId: unitRef.unit.id, profile }];
      }),
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
            resourceUnits,
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
            resourceUnits,
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
      attackRollDefense: (value) => ({
        kind: value.kind,
        selection: value.selection,
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
      ongoingFeatureActivationMovementRider: (value) => {
        const resourcePoolRef = context.resourcePoolRefsByUnitId.get(
          value.activatesWith.resourceUnitId,
        );
        return resourcePoolRef === undefined
          ? undefined
          : {
              kind: value.kind,
              activatesWith: { resourcePoolRef },
              movement: value.movement,
            };
      },
      passiveInitiativeRollMode: (value) => ({
        kind: value.kind,
        initiative: value.initiative,
      }),
      bonusActionHealingMovementRider: (value) => {
        const resourcePoolRef = context.resourcePoolRefsByUnitId.get(
          value.activatesWith.resourceUnitId,
        );
        return resourcePoolRef === undefined
          ? undefined
          : {
              kind: value.kind,
              activatesWith: { resourcePoolRef },
              movement: value.movement,
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
