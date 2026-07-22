import * as Either from "effect/Either";
import type { CharacterBattleClassLevel } from "./character-class-level.ts";
import {
  NonNegativeInteger,
  type ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
import {
  type Attachment,
  type SpellRecord,
  type TargetSelection,
  type UnitRecord,
} from "@dnd/surface/surface/types";
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
  BattleProcedureExecutionRef as BattleProcedureExecutionRefSchema,
  battleCharacterExecutionScopeRef,
  battleProcedureExecutionCursor,
  battleProcedureExecutionRef,
  battleResourcePoolExecutionRef,
} from "./identity.ts";
import {
  BONUS_ACTION_DASH_TEMPORARY_HIT_POINTS_SUPPORT_PROFILE,
  BONUS_ACTION_DELEGATED_STANDARD_ACTIONS_SUPPORT_PROFILE,
  MONK_FOCUS_BATTLE_OPTIONS_SUPPORT_PROFILE,
  type BattleUnitSupportProfile,
  type BattleUnitSupportProfileIssue,
  type SupportedUnitFeatureProfile,
} from "./unit-feature-support.ts";
import type {
  BattleActiveEffect,
  BattleSelectedSpellInvocation,
  ClassFeatureFreeCastInvocationResource,
  SupportedSpellInvocation,
} from "./battle-reducer.ts";
import type { BattleUnitRef } from "./battle-init.ts";
import { Brand, Match, Schema } from "effect";
import type { SpellExecutionFacts } from "./battle-reducer/spell-execution-facts.ts";
import type { SpellRuleExecutionFacts } from "./procedure-execution/spell-rule-facts.ts";
import type {
  AfterHitDamageSpellProcedureExecution,
  BattleSpellProcedureExecution,
  DancingLightsRepositionSpellProcedureExecution,
  HeldLightHurlSpellProcedureExecution,
  MarkedDamageRiderTransferSpellProcedureExecution,
  ObjectContactDamageRepeatSpellProcedureExecution,
  SpellCreatedHeldObjectAttackSpellProcedureExecution,
  SpellCreatedHeldObjectReEvokeSpellProcedureExecution,
  SpellExecutableExecutionOf,
  SpellProcedureExecution,
  SpiritualWeaponRepeatAttackSpellProcedureExecution,
} from "./procedure-execution/spell-procedure-execution.ts";
export type { SpellRuleExecutionFacts } from "./procedure-execution/spell-rule-facts.ts";
export type { WeaponAttackOverrideSpellProcedureExecution } from "./procedure-execution/weapon-attack-override.ts";
export type * from "./procedure-execution/spell-procedure-execution.ts";
import {
  sameMagicalDarknessPointOriginExecution,
  sameMagicWeaponEnhancementExecution,
  sameMakeStableExecution,
  sameMarkedDamageRiderExecution,
  sameMirrorImageHitInterceptionExecution,
  sameMoonbeamExecution,
  sameObjectContactDamageExecution,
  sameObjectContactDamageRepeatExecution,
  sameObjectLightExecution,
  sameOngoingSpellEndExecution,
  samePersistentArmorEffectExecution,
  sameRepeatedDamageAllocationExecution,
  sameRollModifierExecution,
  sameSanctuaryTargetingInterdictionExecution,
  sameSaveGatedAttackRollAdvantageExecution,
  sameSaveGatedConditionExecution,
  sameScalarBuffExecution,
  sameSelfTransformationModeExecution,
  sameSleetStormAreaHazardExecution,
  sameSlowActivePenaltiesExecution,
  sameSpellAttackDamageExecution,
  sameSpellAttackSequenceExecution,
  sameSpikeGrowthMovementHazardExecution,
  sameSpiritualWeaponAttackProxyExecution,
  sameWebRestraintHazardExecution,
  sameWeaponAttackOverrideExecution,
  sameWeaponDamageRiderExecution,
} from "./spell-procedure-execution-equality-magical-darkness-web.ts";
import {
  sameMultisetBy,
  samePrimitiveMultiset,
  samePrimitiveSet,
  sameSetByKey,
  type MechanicalPrimitive,
} from "./mechanical-equality.ts";
import {
  sameAbilityD20TestRollModeSaveGateExecution,
  sameAfterHitDamageAndIlluminationExecution,
  sameAfterHitDamageExecution,
  sameAfterHitSaveGatedConditionExecution,
  sameAfterHitTimedDamageAndSaveExecution,
  sameAntimagicFieldOngoingSpellSuppressionExecution,
  sameChainedSpellAttackDamageExecution,
  sameChosenDamageResistanceExecution,
  sameCloudkillAreaHazardExecution,
  sameCommandExecution,
  sameConditionImmunityAndTurnStartTemporaryHitPointsExecution,
  sameConditionRemovalProtectionExecution,
  sameDamageReductionExecution,
  sameDancingLightsCombinedCastExecution,
  sameDancingLightsRepositionExecution,
  sameDancingLightsSeparateCastExecution,
  sameDirectHitPointRestorationExecution,
  sameDragonsBreathInitialExecution,
  sameHypnoticPatternExecution,
  sameInsectPlagueAreaHazardExecution,
} from "./spell-procedure-execution-equality-ability-insect-plague.ts";
import {
  sameSeeInvisibleObserverSightExecution,
  sameSelfTeleportExecution,
  sameShieldReactionExecution,
  sameSleepTargetAdmissionExecution,
  sameThaumaturgyBoomingVoiceExecution,
} from "./simple-spell-procedure-execution-equality.ts";
import {
  sameAttackBurstSaveDamageExecution,
  sameBlurAttackRollDefenseExecution,
} from "./spell-procedure-execution-equality-attack-blur.ts";
import {
  sameCounterspellExecution,
  sameCreatureSizeDecreaseExecution,
  sameCreatureSizeIncreaseExecution,
  sameCreatureTypeProtectionExecution,
} from "./spell-procedure-execution-equality-counterspell-size.ts";
import {
  sameHastePositiveExecution,
  sameHeldLightExecution,
} from "./spell-procedure-execution-equality-haste-light.ts";
import {
  sameDirectConditionExecution,
  sameDirectConditionRemovalExecution,
} from "./spell-procedure-execution-equality-direct-condition.ts";
import {
  sameExpeditiousRetreatDashExecution,
  sameFeatherFallMitigationExecution,
} from "./spell-procedure-execution-equality-retreat-feather-fall.ts";
import {
  sameFlamingSphereExecution,
  sameFogCloudObscurementExecution,
} from "./spell-procedure-execution-equality-sphere-fog.ts";
import {
  sameGreaseGroundHazardExecution,
  sameGustOfWindLineExecution,
} from "./spell-procedure-execution-equality-grease-gust.ts";
import {
  sameHeldLightHurlExecution,
  sameHideousLaughterExecution,
} from "./spell-procedure-execution-equality-held-hurl-laughter.ts";
import {
  sameJumpMovementReplacementExecution,
  sameLevitatedCreatureExecution,
} from "./spell-procedure-execution-equality-jump-levitate.ts";
import {
  sameSaveGatedConditionImmunityExecution,
  sameSaveGatedDamageExecution,
} from "./spell-procedure-execution-equality-save-immunity-damage.ts";
import {
  sameSpellCreatedHeldObjectAttackExecution,
  sameSpellCreatedHeldObjectExecution,
  sameSpellCreatedHeldObjectReEvokeExecution,
} from "./spell-procedure-execution-equality-created-object.ts";
import { sameSpellHostedWeaponAttackExecution } from "./spell-procedure-execution-equality-hosted-weapon.ts";
import {
  sameSpiritualWeaponRepeatAttackExecution,
  sameWardingBondExecution,
} from "./spell-procedure-execution-equality-spiritual-warding.ts";

export type UnitSupportProfileKind<TProfile = BattleUnitSupportProfile> =
  TProfile extends string
    ? TProfile
    : TProfile extends { readonly kind: infer TKind extends string }
      ? TKind
      : never;

export type CharacterUnitProcedureQuery =
  | { readonly kind: "unitFeatureOrSupportProfile" }
  | {
      readonly kind: "unitFeatureOrSupportProfileKinds";
      readonly featureKinds: ReadonlySet<UnitFeatureProcedureExecution["kind"]>;
      readonly supportKinds: ReadonlySet<UnitSupportProfileKind>;
    }
  | {
      readonly kind: "unitFeature";
      readonly featureKinds: ReadonlySet<UnitFeatureProcedureExecution["kind"]>;
    }
  | {
      readonly kind: "unitSupportProfile";
      readonly supportKinds: ReadonlySet<UnitSupportProfileKind>;
    };

export const CHARACTER_UNIT_FEATURE_PROCEDURE_QUERY = {
  kind: "unitFeatureOrSupportProfile",
} as const satisfies CharacterUnitProcedureQuery;
export const MONK_FOCUS_PROCEDURE_QUERY = {
  kind: "unitSupportProfile",
  supportKinds: new Set<UnitSupportProfileKind>([
    MONK_FOCUS_BATTLE_OPTIONS_SUPPORT_PROFILE,
  ]),
} as const satisfies CharacterUnitProcedureQuery;
export const BONUS_ACTION_STANDARD_ACTION_PROCEDURE_QUERY = {
  kind: "unitFeatureOrSupportProfileKinds",
  featureKinds: new Set<UnitFeatureProcedureExecution["kind"]>([
    BONUS_ACTION_DASH_TEMPORARY_HIT_POINTS_SUPPORT_PROFILE,
    BONUS_ACTION_DELEGATED_STANDARD_ACTIONS_SUPPORT_PROFILE,
  ]),
  supportKinds: new Set<UnitSupportProfileKind>([
    "alternateActionCost",
    BONUS_ACTION_DASH_TEMPORARY_HIT_POINTS_SUPPORT_PROFILE,
    BONUS_ACTION_DELEGATED_STANDARD_ACTIONS_SUPPORT_PROFILE,
  ]),
} as const satisfies CharacterUnitProcedureQuery;
export const DRUID_WILD_SHAPE_PROCEDURE_QUERY = {
  kind: "unitFeature",
  featureKinds: new Set<UnitFeatureProcedureExecution["kind"]>([
    "druidWildShapeKnownForm",
  ]),
} as const satisfies CharacterUnitProcedureQuery;

export type CharacterProcedureBinding =
  | {
      readonly procedureRef: BattleProcedureExecutionRef;
      readonly procedure: {
        readonly kind: "unitSupportProfile";
        readonly source: CharacterUnitProcedureSource;
        readonly execution: UnitSupportProcedureExecution;
      };
    }
  | {
      readonly procedureRef: BattleProcedureExecutionRef;
      readonly procedure: {
        readonly kind: "unitFeature";
        readonly source: CharacterUnitProcedureSource;
        readonly execution: UnitFeatureProcedureExecution;
      };
    }
  | {
      readonly procedureRef: BattleProcedureExecutionRef;
      readonly procedure: {
        readonly kind: "spellInvocation";
        readonly execution: SpellProcedureExecution;
      };
    }
  | {
      readonly procedureRef: BattleProcedureExecutionRef;
      readonly procedure: {
        readonly kind: "unavailableSpellInvocation";
        readonly execution: SpellProcedureExecution;
      };
    };

export type CharacterUnitProcedureBinding = {
  readonly procedureRef: BattleProcedureExecutionRef;
  readonly procedure: CharacterUnitProcedureExecution;
};

export type CharacterUnitProcedureOwnership = {
  readonly unitId: UnitRecord["id"];
  readonly procedureRef: BattleProcedureExecutionRef;
};

export function characterUnitProcedureBindings(
  execution: CharacterExecutionState,
): readonly CharacterUnitProcedureBinding[] {
  return execution.procedureBindings.flatMap((binding) => {
    const procedure = binding.procedure;
    return procedure.kind === "unitFeature" ||
      procedure.kind === "unitSupportProfile"
      ? [{ procedureRef: binding.procedureRef, procedure }]
      : [];
  });
}

export type UnitSupportProcedureExecutionContext = {
  readonly resourcePoolRefsByUnitId: ReadonlyMap<
    UnitRecord["id"],
    BattleResourcePoolExecutionRef
  >;
  readonly unitFeatureProcedureRefsByUnitId: ReadonlyMap<
    UnitRecord["id"],
    BattleProcedureExecutionRef
  >;
  readonly supportProcedureRefsByUnitId: ReadonlyMap<
    UnitRecord["id"],
    BattleProcedureExecutionRef
  >;
};

export type UnitFeatureProcedureExecutionContext = Pick<
  UnitSupportProcedureExecutionContext,
  "resourcePoolRefsByUnitId"
>;

export function unitFeatureProcedureExecutionContext(
  ownership: readonly {
    readonly unit: Pick<UnitRecord, "id">;
    readonly resourcePoolRef: BattleResourcePoolExecutionRef;
  }[],
): UnitFeatureProcedureExecutionContext {
  return {
    resourcePoolRefsByUnitId: new Map(
      ownership.map((resource) => [resource.unit.id, resource.resourcePoolRef]),
    ),
  };
}

export type UnitSupportProcedureExecution = Exclude<
  ReturnType<typeof unitSupportProcedureExecution>,
  undefined
>;

export type UnitFeatureProcedureExecution = Exclude<
  ReturnType<typeof unitFeatureProcedureExecution>,
  undefined
>;

export type CharacterUnitProcedureExecution =
  | {
      readonly kind: "unitFeature";
      readonly source: CharacterUnitProcedureSource;
      readonly execution: UnitFeatureProcedureExecution;
    }
  | {
      readonly kind: "unitSupportProfile";
      readonly source: CharacterUnitProcedureSource;
      readonly execution: UnitSupportProcedureExecution;
    };

export type CharacterUnitProcedureSource =
  | { readonly kind: "intrinsic" }
  | {
      readonly kind: "resourcePool";
      readonly resourcePoolRef: BattleResourcePoolExecutionRef;
    };

type CharacterProcedureWithoutRef =
  CharacterProcedureBinding extends infer TBinding
    ? TBinding extends CharacterProcedureBinding
      ? Omit<TBinding, "procedureRef">
      : never
    : never;

export function characterProcedureBinding(
  execution: CharacterExecutionState,
  procedureRef: BattleProcedureExecutionRef,
): CharacterProcedureBinding | undefined {
  return execution.procedureBindings.find(
    (candidate) => candidate.procedureRef === procedureRef,
  );
}

export type CharacterProcedureBindingSnapshot =
  | {
      readonly procedureRef: BattleProcedureExecutionRef;
      readonly procedure: {
        readonly kind: "unitFeature";
        readonly source: CharacterUnitProcedureSource;
        readonly execution: UnitFeatureProcedureExecution;
      };
    }
  | {
      readonly procedureRef: BattleProcedureExecutionRef;
      readonly procedure: {
        readonly kind: "unitSupportProfile";
        readonly source: CharacterUnitProcedureSource;
        readonly execution: UnitSupportProcedureExecution;
      };
    }
  | {
      readonly procedureRef: BattleProcedureExecutionRef;
      readonly procedure: {
        readonly kind: "spellInvocation";
        readonly executionFacts: SpellExecutionFacts;
      };
    }
  | {
      readonly procedureRef: BattleProcedureExecutionRef;
      readonly procedure: {
        readonly kind: "unavailableSpellInvocation";
      };
    };

type CharacterExecutionStateData = {
  readonly scopeRef: BattleCharacterExecutionScopeRef;
  readonly nextProcedureOrdinal: BattleProcedureExecutionCursor;
  readonly procedureBindings: readonly CharacterProcedureBinding[];
};
export type CharacterExecutionState = CharacterExecutionStateData &
  Brand.Brand<"CharacterExecutionState">;
const CharacterExecutionState = Brand.nominal<CharacterExecutionState>();

export type CharacterExecutionAdmission = {
  readonly execution: CharacterExecutionState;
  readonly unitProcedureOwnership: readonly CharacterUnitProcedureOwnership[];
};

type UnitSupportProcedureCandidate = {
  readonly unitId: UnitRecord["id"];
  readonly profile: BattleUnitSupportProfile;
};

type UnitFeatureProcedureCandidate = {
  readonly unitId: UnitRecord["id"];
  readonly execution: UnitFeatureProcedureExecution;
};

function unitSupportProcedureIsOwnedByUnitFeature(
  unitFeatureProcedures: readonly UnitFeatureProcedureCandidate[],
  candidate: UnitSupportProcedureCandidate,
  context: UnitSupportProcedureExecutionContext,
): boolean {
  const supportExecution = unitSupportProcedureExecution(
    candidate.profile,
    context,
  );
  return (
    supportExecution !== undefined &&
    unitFeatureProcedures.some(
      (feature) =>
        feature.unitId === candidate.unitId &&
        sameUnitFeatureAndSupportProcedureExecution(
          feature.execution,
          supportExecution,
        ),
    )
  );
}

export function characterExecutionFromUnits(input: {
  readonly battleId: BattleId;
  readonly combatantId: CombatantId;
  readonly scopeOrdinal: BattleExecutionScopeOrdinal;
  readonly unitFeatureProfiles: readonly SupportedUnitFeatureProfile[];
  readonly resourceUnits: readonly UnitRecord[];
  readonly units: readonly UnitRecord[];
  readonly unitRefs: readonly BattleUnitRef[];
  readonly classLevels: readonly CharacterBattleClassLevel[];
}): Either.Either<
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
  const unitProcedures = input.unitFeatureProfiles.flatMap((profile) => {
    const execution = unitFeatureProcedureExecution(
      profile,
      unitFeatureExecutionContext,
    );
    if (
      execution === undefined &&
      profile.kind !== "cunningStrike" &&
      profile.kind !== "cunningStrikeOptionGrant"
    ) {
      supportProfileIssues.push({
        tag: "battleUnitSupportProfileIssue",
        message: `Unit feature profile ${profile.kind} references an unavailable mechanical execution resource.`,
      });
    }
    return execution === undefined
      ? []
      : [
          {
            unitId: profile.unit.id,
            execution,
            source: characterUnitProcedureSourceForAdmission(
              scopeRef,
              input.resourceUnits,
              profile.unit.id,
            ),
          },
        ];
  });
  if (supportProfileIssues.length > 0) {
    const [firstIssue, ...remainingIssues] = supportProfileIssues;
    return Either.left([firstIssue, ...remainingIssues]);
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
    readonly unitId: UnitRecord["id"];
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
    return Either.left([firstIssue, ...remainingIssues]);
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
    readonly unitId: UnitRecord["id"];
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
    return Either.left([firstIssue, ...remainingIssues]);
  }
  const allocatedGrantProcedures = allocateCharacterProcedureOccurrences(
    scopeRef,
    allocatedPrimarySupportProcedures.nextProcedureOrdinal,
    grantProcedures,
    ({ binding }) => binding,
  );
  return Either.right({
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
  invocations: readonly SupportedSpellInvocation[],
): CharacterExecutionState {
  let refreshed = false;
  const remainingInvocations = [...invocations];
  const invocationByProcedureRef = new Map<
    BattleProcedureExecutionRef,
    SupportedSpellInvocation
  >();
  const reservedSelectedInvocationIndexes = new Set<number>();
  const selectedProcedureRef = (
    invocation: SupportedSpellInvocation,
  ): BattleProcedureExecutionRef | undefined => {
    if (!("sourceProcedureRef" in invocation)) return undefined;
    return Schema.is(BattleProcedureExecutionRefSchema)(
      invocation.sourceProcedureRef,
    )
      ? invocation.sourceProcedureRef
      : undefined;
  };
  remainingInvocations.forEach((invocation, invocationIndex) => {
    const procedureRef = selectedProcedureRef(invocation);
    if (
      procedureRef === undefined ||
      invocationByProcedureRef.has(procedureRef)
    ) {
      return;
    }
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
    reservedSelectedInvocationIndexes.add(invocationIndex);
  });
  for (let index = remainingInvocations.length - 1; index >= 0; index -= 1) {
    if (reservedSelectedInvocationIndexes.has(index)) {
      remainingInvocations.splice(index, 1);
    }
  }
  const reserveMatchingInvocation = (binding: CharacterProcedureBinding) => {
    if (
      binding.procedure.kind !== "spellInvocation" &&
      binding.procedure.kind !== "unavailableSpellInvocation"
    ) {
      return;
    }
    if (invocationByProcedureRef.has(binding.procedureRef)) return;
    const storedExecution = binding.procedure.execution;
    const currentInvocationIndex = remainingInvocations.findIndex(
      (invocation) =>
        spellInvocationMatchesExecution(invocation, storedExecution),
    );
    if (currentInvocationIndex < 0) return;
    const [currentInvocation] = remainingInvocations.splice(
      currentInvocationIndex,
      1,
    );
    if (currentInvocation !== undefined) {
      invocationByProcedureRef.set(binding.procedureRef, currentInvocation);
    }
  };
  // Live occurrences retain their refs first. Only genuinely new occurrences
  // are then available to restore an unavailable binding.
  execution.procedureBindings.forEach((binding) => {
    if (binding.procedure.kind === "spellInvocation") {
      reserveMatchingInvocation(binding);
    }
  });
  execution.procedureBindings.forEach((binding) => {
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
      if (currentExecution === undefined) {
        return binding.procedure.kind === "unavailableSpellInvocation"
          ? binding
          : {
              ...binding,
              procedure: {
                kind: "unavailableSpellInvocation",
                execution: binding.procedure.execution,
              },
            };
      }
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
    newInvocations.flatMap((invocation): CharacterProcedureWithoutRef[] => {
      const spellExecution = spellProcedureExecution(invocation);
      return spellExecution === undefined
        ? []
        : [
            {
              procedure: {
                kind: "spellInvocation",
                execution: spellExecution,
              },
            },
          ];
    }),
  );
  const spellBindings = allocated.procedureBindings;
  if (spellBindings.length === 0 && !refreshed) return execution;
  return CharacterExecutionState({
    scopeRef: execution.scopeRef,
    nextProcedureOrdinal: allocated.nextProcedureOrdinal,
    procedureBindings: [...refreshedBindings, ...spellBindings],
  });
}

export function characterExecutionWithSpiritualWeaponRepeatAttack(
  execution: CharacterExecutionState,
  repeatExecution: SpiritualWeaponRepeatAttackSpellProcedureExecution,
): CharacterExecutionState {
  const alreadyBound = execution.procedureBindings.some(
    (binding) =>
      binding.procedure.kind === "spellInvocation" &&
      binding.procedure.execution.procedure === "spiritualWeaponRepeatAttack" &&
      binding.procedure.execution.activeEffectRef ===
        repeatExecution.activeEffectRef &&
      binding.procedure.execution.activeEffectSourceProcedureRef ===
        repeatExecution.activeEffectSourceProcedureRef,
  );
  if (alreadyBound) return execution;
  const allocated = allocateCharacterProcedureBindings(
    execution.scopeRef,
    execution.nextProcedureOrdinal,
    [
      {
        procedure: {
          kind: "spellInvocation",
          execution: repeatExecution,
        },
      },
    ],
  );
  return CharacterExecutionState({
    scopeRef: execution.scopeRef,
    nextProcedureOrdinal: allocated.nextProcedureOrdinal,
    procedureBindings: [
      ...execution.procedureBindings,
      ...allocated.procedureBindings,
    ],
  });
}

export function characterExecutionWithHeldLightHurl(
  execution: CharacterExecutionState,
  hurlExecution: HeldLightHurlSpellProcedureExecution,
): CharacterExecutionState {
  const alreadyBound = execution.procedureBindings.some(
    (binding) =>
      binding.procedure.kind === "spellInvocation" &&
      binding.procedure.execution.procedure === "heldLightHurl" &&
      binding.procedure.execution.sourceEffectRef ===
        hurlExecution.sourceEffectRef &&
      binding.procedure.execution.sourceHeldLightProcedureRef ===
        hurlExecution.sourceHeldLightProcedureRef,
  );
  if (alreadyBound) return execution;
  const allocated = allocateCharacterProcedureBindings(
    execution.scopeRef,
    execution.nextProcedureOrdinal,
    [
      {
        procedure: {
          kind: "spellInvocation",
          execution: hurlExecution,
        },
      },
    ],
  );
  return CharacterExecutionState({
    scopeRef: execution.scopeRef,
    nextProcedureOrdinal: allocated.nextProcedureOrdinal,
    procedureBindings: [
      ...execution.procedureBindings,
      ...allocated.procedureBindings,
    ],
  });
}

export function characterExecutionWithDancingLightsReposition(
  execution: CharacterExecutionState,
  repositionExecution: DancingLightsRepositionSpellProcedureExecution,
): CharacterExecutionState {
  return characterExecutionWithDynamicSpellProcedures(execution, [
    repositionExecution,
  ]);
}

export function characterExecutionWithSpellCreatedHeldObjectProcedures(
  execution: CharacterExecutionState,
  procedures: readonly [
    SpellCreatedHeldObjectAttackSpellProcedureExecution,
    SpellCreatedHeldObjectReEvokeSpellProcedureExecution,
  ],
): CharacterExecutionState {
  return characterExecutionWithDynamicSpellProcedures(execution, procedures);
}

function characterExecutionWithDynamicSpellProcedures(
  execution: CharacterExecutionState,
  procedures: readonly (
    | DancingLightsRepositionSpellProcedureExecution
    | SpellCreatedHeldObjectAttackSpellProcedureExecution
    | SpellCreatedHeldObjectReEvokeSpellProcedureExecution
  )[],
): CharacterExecutionState {
  const unbound = procedures.filter(
    (procedure) =>
      !execution.procedureBindings.some(
        (binding) =>
          binding.procedure.kind === "spellInvocation" &&
          sameSpellProcedureExecution(binding.procedure.execution, procedure),
      ),
  );
  if (unbound.length === 0) return execution;
  const allocated = allocateCharacterProcedureBindings(
    execution.scopeRef,
    execution.nextProcedureOrdinal,
    unbound.map(
      (procedure): CharacterProcedureWithoutRef => ({
        procedure: { kind: "spellInvocation", execution: procedure },
      }),
    ),
  );
  return CharacterExecutionState({
    scopeRef: execution.scopeRef,
    nextProcedureOrdinal: allocated.nextProcedureOrdinal,
    procedureBindings: [
      ...execution.procedureBindings,
      ...allocated.procedureBindings,
    ],
  });
}

export function characterExecutionWithMarkedDamageRiderTransfer(
  execution: CharacterExecutionState,
  transferExecution: MarkedDamageRiderTransferSpellProcedureExecution,
): CharacterExecutionState {
  const alreadyBound = execution.procedureBindings.some(
    (binding) =>
      binding.procedure.kind === "spellInvocation" &&
      binding.procedure.execution.procedure === "markedDamageRider" &&
      binding.procedure.execution.action === "transfer" &&
      binding.procedure.execution.activeEffectRef ===
        transferExecution.activeEffectRef &&
      binding.procedure.execution.activeEffectSourceProcedureRef ===
        transferExecution.activeEffectSourceProcedureRef,
  );
  if (alreadyBound) return execution;
  const allocated = allocateCharacterProcedureBindings(
    execution.scopeRef,
    execution.nextProcedureOrdinal,
    [
      {
        procedure: {
          kind: "spellInvocation",
          execution: transferExecution,
        },
      },
    ],
  );
  return CharacterExecutionState({
    scopeRef: execution.scopeRef,
    nextProcedureOrdinal: allocated.nextProcedureOrdinal,
    procedureBindings: [
      ...execution.procedureBindings,
      ...allocated.procedureBindings,
    ],
  });
}

export function characterExecutionWithObjectContactDamageRepeat(
  execution: CharacterExecutionState,
  repeatExecution: ObjectContactDamageRepeatSpellProcedureExecution,
): CharacterExecutionState {
  const alreadyBound = execution.procedureBindings.some(
    (binding) =>
      binding.procedure.kind === "spellInvocation" &&
      binding.procedure.execution.procedure === "objectContactDamageRepeat" &&
      binding.procedure.execution.activeEffectRef ===
        repeatExecution.activeEffectRef &&
      binding.procedure.execution.activeEffectSourceProcedureRef ===
        repeatExecution.activeEffectSourceProcedureRef,
  );
  if (alreadyBound) return execution;
  const allocated = allocateCharacterProcedureBindings(
    execution.scopeRef,
    execution.nextProcedureOrdinal,
    [
      {
        procedure: {
          kind: "spellInvocation",
          execution: repeatExecution,
        },
      },
    ],
  );
  return CharacterExecutionState({
    scopeRef: execution.scopeRef,
    nextProcedureOrdinal: allocated.nextProcedureOrdinal,
    procedureBindings: [
      ...execution.procedureBindings,
      ...allocated.procedureBindings,
    ],
  });
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

export function characterProcedureBindingSnapshots(
  execution: CharacterExecutionState,
  executionFactsFor: (
    invocation: SpellProcedureExecution,
  ) => SpellExecutionFacts,
): readonly CharacterProcedureBindingSnapshot[] {
  return execution.procedureBindings.map(
    (binding): CharacterProcedureBindingSnapshot =>
      Match.value(binding.procedure).pipe(
        Match.when({ kind: "unitFeature" }, (procedure) => ({
          procedureRef: binding.procedureRef,
          procedure: {
            kind: procedure.kind,
            source: procedure.source,
            execution: procedure.execution,
          },
        })),
        Match.when({ kind: "unitSupportProfile" }, (procedure) => ({
          procedureRef: binding.procedureRef,
          procedure: {
            kind: procedure.kind,
            source: procedure.source,
            execution: procedure.execution,
          },
        })),
        Match.when({ kind: "spellInvocation" }, (procedure) => ({
          procedureRef: binding.procedureRef,
          procedure: {
            kind: procedure.kind,
            executionFacts: executionFactsFor(procedure.execution),
          },
        })),
        Match.when({ kind: "unavailableSpellInvocation" }, (procedure) => ({
          procedureRef: binding.procedureRef,
          procedure: { kind: procedure.kind },
        })),
        Match.exhaustive,
      ),
  );
}

export function characterUnitProcedureRef(
  execution: CharacterExecutionState,
  procedure: CharacterUnitProcedureExecution,
  query: CharacterUnitProcedureQuery,
): BattleProcedureExecutionRef | undefined {
  return characterUnitProcedureRefs(execution, procedure, query)[0];
}

export function characterUnitProcedureRefs(
  execution: CharacterExecutionState,
  procedure: CharacterUnitProcedureExecution,
  query: CharacterUnitProcedureQuery,
): readonly BattleProcedureExecutionRef[] {
  return execution.procedureBindings.flatMap((binding) =>
    sameCharacterUnitProcedureExecution(binding.procedure, procedure) &&
    characterUnitProcedureMatchesQuery(binding.procedure, query)
      ? [binding.procedureRef]
      : [],
  );
}

export function characterUnitProcedureRefsForSource(
  execution: CharacterExecutionState,
  source: CharacterUnitProcedureSource,
  query: CharacterUnitProcedureQuery,
): readonly BattleProcedureExecutionRef[] {
  return execution.procedureBindings.flatMap((binding) =>
    (binding.procedure.kind === "unitFeature" ||
      binding.procedure.kind === "unitSupportProfile") &&
    sameCharacterUnitProcedureSource(binding.procedure.source, source) &&
    characterUnitProcedureMatchesQuery(binding.procedure, query)
      ? [binding.procedureRef]
      : [],
  );
}

export function unitSupportProfileKind(
  profile: UnitSupportProcedureExecution,
): UnitSupportProfileKind {
  return typeof profile === "string" ? profile : profile.kind;
}

function characterUnitProcedureSourceForAdmission(
  scopeRef: BattleCharacterExecutionScopeRef,
  resourceUnits: readonly UnitRecord[],
  unitId: UnitRecord["id"],
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

export function characterUnitProcedureSourceForUnit(
  resources: readonly {
    readonly unit: Pick<UnitRecord, "id">;
    readonly resourcePoolRef: BattleResourcePoolExecutionRef;
  }[],
  unitId: UnitRecord["id"],
): CharacterUnitProcedureSource {
  const resource = resources.find((candidate) => candidate.unit.id === unitId);
  return resource === undefined
    ? { kind: "intrinsic" }
    : { kind: "resourcePool", resourcePoolRef: resource.resourcePoolRef };
}

export function characterUnitProcedure(
  execution: CharacterExecutionState,
  procedureRef: BattleProcedureExecutionRef,
  query: CharacterUnitProcedureQuery,
): CharacterUnitProcedureExecution | undefined {
  const binding = execution.procedureBindings.find(
    (candidate) => candidate.procedureRef === procedureRef,
  );
  return binding !== undefined &&
    characterUnitProcedureMatchesQuery(binding.procedure, query)
    ? binding.procedure
    : undefined;
}

function characterUnitProcedureMatchesQuery(
  procedure: CharacterProcedureBinding["procedure"],
  query: CharacterUnitProcedureQuery,
): procedure is CharacterUnitProcedureExecution {
  return Match.value(query).pipe(
    Match.discriminatorsExhaustive("kind")({
      unitFeatureOrSupportProfile: () =>
        procedure.kind === "unitFeature" ||
        procedure.kind === "unitSupportProfile",
      unitFeatureOrSupportProfileKinds: ({ featureKinds, supportKinds }) =>
        (procedure.kind === "unitFeature" &&
          featureKinds.has(procedure.execution.kind)) ||
        (procedure.kind === "unitSupportProfile" &&
          supportKinds.has(unitSupportProfileKind(procedure.execution))),
      unitFeature: ({ featureKinds }) =>
        procedure.kind === "unitFeature" &&
        featureKinds.has(procedure.execution.kind),
      unitSupportProfile: ({ supportKinds }) =>
        procedure.kind === "unitSupportProfile" &&
        supportKinds.has(unitSupportProfileKind(procedure.execution)),
    }),
  );
}

function sameCharacterUnitProcedureExecution(
  left: CharacterProcedureBinding["procedure"],
  right: CharacterUnitProcedureExecution,
): boolean {
  return Match.value(right).pipe(
    Match.discriminatorsExhaustive("kind")({
      unitFeature: (expected) =>
        left.kind === "unitFeature" &&
        sameCharacterUnitProcedureSource(left.source, expected.source) &&
        sameUnitFeatureProcedureExecution(left.execution, expected.execution),
      unitSupportProfile: (expected) =>
        left.kind === "unitSupportProfile" &&
        sameCharacterUnitProcedureSource(left.source, expected.source) &&
        sameUnitSupportProcedureExecution(left.execution, expected.execution),
    }),
  );
}

function sameCharacterUnitProcedureSource(
  left: CharacterUnitProcedureSource,
  right: CharacterUnitProcedureSource,
): boolean {
  return Match.value(left).pipe(
    Match.discriminatorsExhaustive("kind")({
      intrinsic: () => right.kind === "intrinsic",
      resourcePool: ({ resourcePoolRef }) =>
        right.kind === "resourcePool" &&
        right.resourcePoolRef === resourcePoolRef,
    }),
  );
}

type OngoingFeatureExecution = Extract<
  UnitFeatureProcedureExecution,
  { readonly kind: "ongoingFeature" }
>;
type OngoingFeatureLifecycle = OngoingFeatureExecution["lifecycle"];
type OngoingFeatureRollModifier =
  OngoingFeatureExecution["rollModifiers"][number];
type OngoingFeatureSpellModifier =
  OngoingFeatureExecution["spellModifiers"][number];
type OngoingFeatureDamageModifier =
  OngoingFeatureExecution["damageModifiers"][number];

function sameOngoingFeatureLifecycle(
  left: OngoingFeatureLifecycle,
  right: OngoingFeatureLifecycle,
): boolean {
  return Match.value(left).pipe(
    Match.discriminatorsExhaustive("kind")({
      turnBoundary: (value) =>
        right.kind === "turnBoundary" &&
        value.initialExpiration === right.initialExpiration &&
        samePrimitiveMultiset(
          value.earlyEndConditions,
          right.earlyEndConditions,
        ) &&
        samePrimitiveMultiset(
          value.earlyEndArmorCategories,
          right.earlyEndArmorCategories,
        ) &&
        samePrimitiveMultiset(value.extensionTriggers, right.extensionTriggers),
      roundExtended: (value) =>
        right.kind === "roundExtended" &&
        value.initialExpiration === right.initialExpiration &&
        value.maximumDurationRounds === right.maximumDurationRounds &&
        samePrimitiveMultiset(
          value.earlyEndConditions,
          right.earlyEndConditions,
        ) &&
        samePrimitiveMultiset(
          value.earlyEndArmorCategories,
          right.earlyEndArmorCategories,
        ) &&
        samePrimitiveMultiset(value.extensionTriggers, right.extensionTriggers),
      fixedDuration: (value) =>
        right.kind === "fixedDuration" &&
        value.maximumDurationRounds === right.maximumDurationRounds &&
        samePrimitiveMultiset(
          value.earlyEndConditions,
          right.earlyEndConditions,
        ) &&
        samePrimitiveMultiset(
          value.earlyEndArmorCategories,
          right.earlyEndArmorCategories,
        ) &&
        samePrimitiveMultiset(value.extensionTriggers, right.extensionTriggers),
    }),
  );
}

function sameOptionalPrimitiveMultiset<Value extends MechanicalPrimitive>(
  left: readonly Value[] | undefined,
  right: readonly Value[] | undefined,
): boolean {
  return left === undefined || right === undefined
    ? left === right
    : samePrimitiveMultiset(left, right);
}

function sameOngoingFeatureRollModifier(
  left: OngoingFeatureRollModifier,
  right: OngoingFeatureRollModifier,
): boolean {
  return (
    left.mode === right.mode &&
    left.affects === right.affects &&
    left.on === right.on &&
    sameOptionalPrimitiveMultiset(left.abilityFilter, right.abilityFilter)
  );
}

function sameOngoingFeatureSpellModifier(
  left: OngoingFeatureSpellModifier,
  right: OngoingFeatureSpellModifier,
): boolean {
  return (
    left.sourceClassName === right.sourceClassName &&
    left.saveDcBonus === right.saveDcBonus &&
    left.attackRollMode === right.attackRollMode
  );
}

function sameOngoingFeatureDamageModifier(
  left: OngoingFeatureDamageModifier,
  right: OngoingFeatureDamageModifier,
): boolean {
  return (
    left.amount === right.amount &&
    left.weaponUsageFilter === right.weaponUsageFilter &&
    sameOptionalPrimitiveMultiset(left.abilityFilter, right.abilityFilter)
  );
}

function sameOngoingFeatureExecution(
  left: OngoingFeatureExecution,
  right: OngoingFeatureExecution,
): boolean {
  return (
    left.activationTrigger === right.activationTrigger &&
    left.spendsUse === right.spendsUse &&
    left.concentrationEffect === right.concentrationEffect &&
    sameOngoingFeatureLifecycle(left.lifecycle, right.lifecycle) &&
    samePrimitiveMultiset(left.actionRestrictions, right.actionRestrictions) &&
    sameMultisetBy(
      left.rollModifiers,
      right.rollModifiers,
      sameOngoingFeatureRollModifier,
    ) &&
    sameMultisetBy(
      left.spellModifiers,
      right.spellModifiers,
      sameOngoingFeatureSpellModifier,
    ) &&
    sameMultisetBy(
      left.damageModifiers,
      right.damageModifiers,
      sameOngoingFeatureDamageModifier,
    ) &&
    samePrimitiveMultiset(left.resistances, right.resistances)
  );
}

type OptionalAttackDamageRiderExecution = Extract<
  UnitFeatureProcedureExecution,
  { readonly kind: "attackDamageRider"; readonly optional: true }
>;

function sameLevelThresholdDiceTable(
  left: OptionalAttackDamageRiderExecution["dice"]["diceByLevel"],
  right: OptionalAttackDamageRiderExecution["dice"]["diceByLevel"],
): boolean {
  const hasDuplicateLevel = (
    table: OptionalAttackDamageRiderExecution["dice"]["diceByLevel"],
  ): boolean =>
    table.some(
      (entry, index) =>
        table.findIndex((candidate) => candidate.atLevel === entry.atLevel) !==
        index,
    );
  return (
    left.length === right.length &&
    !hasDuplicateLevel(left) &&
    !hasDuplicateLevel(right) &&
    left.every((entry) =>
      right.some(
        (candidate) =>
          candidate.atLevel === entry.atLevel &&
          candidate.count === entry.count,
      ),
    )
  );
}

type ReactionReductionExecution = Extract<
  UnitFeatureProcedureExecution,
  { readonly kind: "reactionRollOrDamageReduction" }
>;
type ReactionReductionModifier =
  ReactionReductionExecution["modifiers"][number];

function sameMechanicalResourceSpend(
  left: {
    readonly resourcePoolRef: BattleResourcePoolExecutionRef;
    readonly amount?: 1;
  },
  right: {
    readonly resourcePoolRef: BattleResourcePoolExecutionRef;
    readonly amount?: 1;
  },
): boolean {
  return (
    left.resourcePoolRef === right.resourcePoolRef &&
    left.amount === right.amount
  );
}

function sameReactionReductionModifier(
  left: ReactionReductionModifier,
  right: ReactionReductionModifier,
): boolean {
  return Match.value(left).pipe(
    Match.discriminatorsExhaustive("kind")({
      attackRollReduction: (value) =>
        right.kind === "attackRollReduction" &&
        value.rangeFeet === right.rangeFeet &&
        value.requiresVisibleCreature === right.requiresVisibleCreature &&
        value.reduction.dieSize === right.reduction.dieSize &&
        sameMechanicalResourceSpend(
          value.reduction.spends,
          right.reduction.spends,
        ),
      abilityCheckReduction: (value) =>
        right.kind === "abilityCheckReduction" &&
        value.rangeFeet === right.rangeFeet &&
        value.requiresVisibleCreature === right.requiresVisibleCreature &&
        value.reduction.dieSize === right.reduction.dieSize &&
        sameMechanicalResourceSpend(
          value.reduction.spends,
          right.reduction.spends,
        ),
      attackDamageRollReduction: (value) =>
        right.kind === "attackDamageRollReduction" &&
        value.rangeFeet === right.rangeFeet &&
        value.requiresVisibleCreature === right.requiresVisibleCreature &&
        value.reduction.dieSize === right.reduction.dieSize &&
        sameMechanicalResourceSpend(
          value.reduction.spends,
          right.reduction.spends,
        ),
      attackDamageReduction: (value) => {
        if (right.kind !== "attackDamageReduction") return false;
        if (
          value.requiresVisibleAttacker !== right.requiresVisibleAttacker ||
          !sameOptionalPrimitiveMultiset(
            value.damageIncludes,
            right.damageIncludes,
          ) ||
          value.reduction.kind !== right.reduction.kind
        ) {
          return false;
        }
        if (
          value.reduction.kind === "dicePlusAbilityModifierPlusClassLevel" &&
          (right.reduction.kind !== value.reduction.kind ||
            value.reduction.dieSize !== right.reduction.dieSize ||
            value.reduction.ability !== right.reduction.ability)
        ) {
          return false;
        }
        const leftRedirect =
          "zeroDamageRedirect" in value ? value.zeroDamageRedirect : undefined;
        const rightRedirect =
          "zeroDamageRedirect" in right ? right.zeroDamageRedirect : undefined;
        return leftRedirect === undefined || rightRedirect === undefined
          ? leftRedirect === rightRedirect
          : leftRedirect.damage.dice.dieSize ===
              rightRedirect.damage.dice.dieSize &&
              sameMechanicalResourceSpend(
                leftRedirect.spends,
                rightRedirect.spends,
              );
      },
      fallDamageReduction: (value) =>
        right.kind === "fallDamageReduction" &&
        value.reduction.multiplier === right.reduction.multiplier,
    }),
  );
}

type PassiveSpeedFacts = Extract<
  UnitSupportProcedureExecution,
  { readonly kind: "passiveSpeedBonus" }
>;

function samePassiveSpeedFacts(
  left: Pick<PassiveSpeedFacts, "deltaFeet" | "condition">,
  right: Pick<PassiveSpeedFacts, "deltaFeet" | "condition">,
): boolean {
  return (
    left.deltaFeet === right.deltaFeet &&
    left.condition.kind === right.condition.kind &&
    (left.condition.kind !== "notWearingArmor" ||
      (right.condition.kind === "notWearingArmor" &&
        samePrimitiveSet(
          left.condition.categories,
          right.condition.categories,
        )))
  );
}

type UnitFeatureSpeedKindGrants = Extract<
  UnitFeatureProcedureExecution,
  { readonly kind: "passiveSpeedKindGrants" }
>["speedKindGrants"];
type UnitSupportSpeedKindGrants = Extract<
  UnitSupportProcedureExecution,
  { readonly kind: "passiveSpeedKindGrants" }
>;
type UnitSpeedKindGrants =
  | UnitFeatureSpeedKindGrants
  | Pick<UnitSupportSpeedKindGrants, "speed" | "grants">;

function sameSpeedKindGrant(
  left: UnitSpeedKindGrants["grants"][number],
  right: UnitSpeedKindGrants["grants"][number],
): boolean {
  return (
    left.speedKind === right.speedKind && left.feet.kind === right.feet.kind
  );
}

function samePassiveSpeedKindGrants(
  left: UnitSpeedKindGrants,
  right: UnitSpeedKindGrants,
): boolean {
  const sameSpeed =
    left.speed === undefined || right.speed === undefined
      ? left.speed === right.speed
      : samePassiveSpeedFacts(left.speed, right.speed);
  return (
    sameSpeed &&
    sameSetByKey(
      left.grants,
      right.grants,
      (grant) => grant.speedKind,
      sameSpeedKindGrant,
    )
  );
}

type UnitDruidWildShapeExecution =
  | Extract<
      UnitFeatureProcedureExecution,
      { readonly kind: "druidWildShapeKnownForm" }
    >
  | Extract<
      UnitSupportProcedureExecution,
      { readonly kind: "druidWildShapeKnownForm" }
    >;

function sameDruidWildShapeKnownForm(
  left: UnitDruidWildShapeExecution,
  right: UnitDruidWildShapeExecution,
): boolean {
  return (
    left.classLevel === right.classLevel &&
    left.knownFormRoster.creatureType === right.knownFormRoster.creatureType &&
    left.knownFormRoster.count === right.knownFormRoster.count &&
    left.knownFormRoster.maxChallengeRating ===
      right.knownFormRoster.maxChallengeRating &&
    left.knownFormRoster.flySpeed === right.knownFormRoster.flySpeed
  );
}

type UnitMagicActionHealingPoolExecution =
  | Extract<
      UnitFeatureProcedureExecution,
      { readonly kind: "magicActionHealingPool" }
    >
  | Extract<
      UnitSupportProcedureExecution,
      { readonly kind: "magicActionHealingPool" }
    >;

function sameMagicActionHealingPool(
  left: UnitMagicActionHealingPoolExecution,
  right: UnitMagicActionHealingPoolExecution,
): boolean {
  return (
    left.className === right.className &&
    left.healingPool.rangeFeet === right.healingPool.rangeFeet &&
    left.healingPool.pool.multiplier === right.healingPool.pool.multiplier &&
    samePrimitiveSet(
      left.healingPool.targetSelection.targetKinds,
      right.healingPool.targetSelection.targetKinds,
    ) &&
    samePrimitiveSet(
      left.healingPool.targetSelection.stateFilter,
      right.healingPool.targetSelection.stateFilter,
    ) &&
    sameMechanicalResourceSpend(
      left.healingPool.spends,
      right.healingPool.spends,
    )
  );
}

type UnitMagicActionAreaSaveDamageHealingExecution =
  | Extract<
      UnitFeatureProcedureExecution,
      { readonly kind: "magicActionAreaSaveDamageHealing" }
    >
  | Extract<
      UnitSupportProcedureExecution,
      { readonly kind: "magicActionAreaSaveDamageHealing" }
    >;

function sameMagicActionAreaSaveDamageHealing(
  left: UnitMagicActionAreaSaveDamageHealingExecution,
  right: UnitMagicActionAreaSaveDamageHealingExecution,
): boolean {
  return (
    left.damageHealing.area.origin.rangeFeet ===
      right.damageHealing.area.origin.rangeFeet &&
    left.damageHealing.area.shape.radiusFeet ===
      right.damageHealing.area.shape.radiusFeet &&
    left.damageHealing.damage.amount.expr.dice ===
      right.damageHealing.damage.amount.expr.dice &&
    left.damageHealing.healing.amount.expr.dice ===
      right.damageHealing.healing.amount.expr.dice &&
    sameMechanicalResourceSpend(
      left.damageHealing.spends,
      right.damageHealing.spends,
    )
  );
}

type UnitMagicActionSaveGatedConditionExecution =
  | Extract<
      UnitFeatureProcedureExecution,
      { readonly kind: "magicActionSaveGatedCondition" }
    >
  | Extract<
      UnitSupportProcedureExecution,
      { readonly kind: "magicActionSaveGatedCondition" }
    >;

function sameMagicActionSaveGatedCondition(
  left: UnitMagicActionSaveGatedConditionExecution,
  right: UnitMagicActionSaveGatedConditionExecution,
): boolean {
  return (
    left.condition.targetSelection.rangeFeet ===
      right.condition.targetSelection.rangeFeet &&
    left.condition.onFail.durationTicks ===
      right.condition.onFail.durationTicks &&
    sameMechanicalResourceSpend(left.condition.spends, right.condition.spends)
  );
}

type UnitOpenHandTechniqueExecution =
  | Extract<
      UnitFeatureProcedureExecution,
      { readonly kind: "openHandTechnique" }
    >
  | Extract<
      UnitSupportProcedureExecution,
      { readonly kind: "openHandTechnique" }
    >;

function sameOpenHandTechnique(
  left: UnitOpenHandTechniqueExecution,
  right: UnitOpenHandTechniqueExecution,
): boolean {
  return (
    left.technique.trigger.resourcePoolRef ===
      right.technique.trigger.resourcePoolRef &&
    left.technique.effects.pushAwayOnFailedSave.distanceFeet ===
      right.technique.effects.pushAwayOnFailedSave.distanceFeet
  );
}

type UnitPaladinSacredWeaponExecution =
  | Extract<
      UnitFeatureProcedureExecution,
      { readonly kind: "paladinSacredWeapon" }
    >
  | Extract<
      UnitSupportProcedureExecution,
      { readonly kind: "paladinSacredWeapon" }
    >;

function samePaladinSacredWeapon(
  left: UnitPaladinSacredWeaponExecution,
  right: UnitPaladinSacredWeaponExecution,
): boolean {
  return (
    left.sacredWeapon.light.brightRadiusFeet ===
      right.sacredWeapon.light.brightRadiusFeet &&
    left.sacredWeapon.light.dimAdditionalFeet ===
      right.sacredWeapon.light.dimAdditionalFeet &&
    samePrimitiveSet(
      left.sacredWeapon.duration.endsOn,
      right.sacredWeapon.duration.endsOn,
    ) &&
    samePrimitiveSet(
      left.sacredWeapon.hitDamageTypeChoice,
      right.sacredWeapon.hitDamageTypeChoice,
    ) &&
    sameMechanicalResourceSpend(
      left.sacredWeapon.spends,
      right.sacredWeapon.spends,
    )
  );
}

type UnitCunningStrikeExecution = Extract<
  UnitSupportProcedureExecution,
  { readonly kind: "cunningStrike" }
>;
type UnitCunningStrikeOption =
  UnitCunningStrikeExecution["cunningStrike"]["options"][number];

function sameCunningStrikeOptionEffect(
  left: UnitCunningStrikeOption["effect"],
  right: UnitCunningStrikeOption["effect"],
): boolean {
  return Match.value(left).pipe(
    Match.discriminatorsExhaustive("kind")({
      equipmentGatedConditionSave: (value) =>
        right.kind === "equipmentGatedConditionSave" &&
        value.onFail.durationTicks === right.onFail.durationTicks,
      sizeGatedConditionSave: () => right.kind === "sizeGatedConditionSave",
      postDamageMovement: () => right.kind === "postDamageMovement",
      hideInvisibleEndSuppression: (value) =>
        right.kind === "hideInvisibleEndSuppression" &&
        samePrimitiveSet(
          value.ifTurnEndsBehindCover,
          right.ifTurnEndsBehindCover,
        ),
    }),
  );
}

function sameCunningStrikeOption(
  left: UnitCunningStrikeOption,
  right: UnitCunningStrikeOption,
): boolean {
  return (
    left.selectionId === right.selectionId &&
    sameCunningStrikeOptionEffect(left.effect, right.effect)
  );
}

function sameCunningStrikeOptions(
  left: readonly UnitCunningStrikeOption[],
  right: readonly UnitCunningStrikeOption[],
): boolean {
  return sameSetByKey(
    left,
    right,
    (option) => option.selectionId,
    sameCunningStrikeOption,
  );
}

function sameUnitSupportProcedureExecution(
  left: UnitSupportProcedureExecution,
  right: UnitSupportProcedureExecution,
): boolean {
  if (typeof left === "string" || typeof right === "string") {
    return left === right;
  }
  return Match.value(left).pipe(
    Match.discriminatorsExhaustive("kind")({
      alternateActionCost: (value) =>
        right.kind === "alternateActionCost" &&
        samePrimitiveSet(value.from.actions, right.from.actions),
      bonusActionDelegatedStandardActions: () =>
        right.kind === "bonusActionDelegatedStandardActions",
      passiveRangedAttackRollBonus: () =>
        right.kind === "passiveRangedAttackRollBonus",
      initiativeProficiencyAndSwap: () =>
        right.kind === "initiativeProficiencyAndSwap",
      attackRollMissToHitReplacement: () =>
        right.kind === "attackRollMissToHitReplacement",
      attackActionAreaSaveDamageReplacement: (value) =>
        right.kind === "attackActionAreaSaveDamageReplacement" &&
        value.breath.area.shapeChoice[0].lengthFeet ===
          right.breath.area.shapeChoice[0].lengthFeet &&
        value.breath.area.shapeChoice[1].lengthFeet ===
          right.breath.area.shapeChoice[1].lengthFeet &&
        value.breath.area.shapeChoice[1].widthFeet ===
          right.breath.area.shapeChoice[1].widthFeet &&
        value.breath.damage.damageType.value ===
          right.breath.damage.damageType.value,
      d20TestNaturalOneReroll: () => right.kind === "d20TestNaturalOneReroll",
      passiveSavingThrowRollMode: (value) =>
        right.kind === "passiveSavingThrowRollMode" &&
        value.savingThrow.scope.kind === right.savingThrow.scope.kind &&
        (value.savingThrow.scope.kind === "condition"
          ? right.savingThrow.scope.kind === "condition" &&
            value.savingThrow.scope.condition ===
              right.savingThrow.scope.condition
          : right.savingThrow.scope.kind === "savingThrowAbility" &&
            value.savingThrow.scope.ability ===
              right.savingThrow.scope.ability),
      passiveAbilityCheckRollMode: () =>
        right.kind === "passiveAbilityCheckRollMode",
      passiveDamageResistance: (value) =>
        right.kind === "passiveDamageResistance" &&
        value.resistance.damageType.kind === right.resistance.damageType.kind &&
        value.resistance.damageType.value === right.resistance.damageType.value,
      passiveSpeedBonus: (value) =>
        right.kind === "passiveSpeedBonus" &&
        samePassiveSpeedFacts(value, right),
      passiveSpeedKindGrants: (value) =>
        right.kind === "passiveSpeedKindGrants" &&
        samePassiveSpeedKindGrants(value, right),
      acrobaticMovement: () => right.kind === "acrobaticMovement",
      creatureSpaceMovementPermission: () =>
        right.kind === "creatureSpaceMovementPermission",
      hideActionObscurementPermission: () =>
        right.kind === "hideActionObscurementPermission",
      attackActionAttackCountScaling: (value) =>
        right.kind === "attackActionAttackCountScaling" &&
        value.additionalAttacks === right.additionalAttacks,
      bonusActionDashTemporaryHitPoints: () =>
        right.kind === "bonusActionDashTemporaryHitPoints",
      spellSlotHealingModifier: () => right.kind === "spellSlotHealingModifier",
      enemyZeroHitPointTemporaryHitPoints: (value) =>
        right.kind === "enemyZeroHitPointTemporaryHitPoints" &&
        value.className === right.className &&
        value.temporaryHitPoints.trigger.byOtherWithinFeet ===
          right.temporaryHitPoints.trigger.byOtherWithinFeet,
      druidWildShapeKnownForm: (value) =>
        right.kind === "druidWildShapeKnownForm" &&
        sameDruidWildShapeKnownForm(value, right),
      remarkableAthlete: () => right.kind === "remarkableAthlete",
      huntersPrey: (value) =>
        right.kind === "huntersPrey" &&
        value.huntersPrey.kind === right.huntersPrey.kind &&
        (value.huntersPrey.kind === "woundedTargetWeaponDamage"
          ? right.huntersPrey.kind === "woundedTargetWeaponDamage"
          : right.huntersPrey.kind ===
              "nearbyDifferentTargetSameWeaponAttack" &&
            value.huntersPrey.extraAttack.target.withinFeetOfOriginalTarget ===
              right.huntersPrey.extraAttack.target.withinFeetOfOriginalTarget),
      rogueSteadyAim: () => right.kind === "rogueSteadyAim",
      potentCantrip: () => right.kind === "potentCantrip",
      grappler: () => right.kind === "grappler",
      brutalStrike: (value) =>
        right.kind === "brutalStrike" &&
        value.brutalStrike.options[0].pushFeet ===
          right.brutalStrike.options[0].pushFeet &&
        value.brutalStrike.options[1].deltaFeet ===
          right.brutalStrike.options[1].deltaFeet,
      retaliationReactionAttack: () =>
        right.kind === "retaliationReactionAttack",
      tacticalMasterReplacement: (value) =>
        right.kind === "tacticalMasterReplacement" &&
        samePrimitiveSet(
          value.replacementProperties,
          right.replacementProperties,
        ),
      lightExtraAttackDamageAbilityModifier: () =>
        right.kind === "lightExtraAttackDamageAbilityModifier",
      monkFocusBattleOptions: () => right.kind === "monkFocusBattleOptions",
      failedAbilityCheckResourceBoost: (value) =>
        right.kind === "failedAbilityCheckResourceBoost" &&
        sameMechanicalResourceSpend(
          value.abilityCheck.spends,
          right.abilityCheck.spends,
        ),
      failedSavingThrowReroll: (value) =>
        right.kind === "failedSavingThrowReroll" &&
        sameMechanicalResourceSpend(
          value.savingThrow.spends,
          right.savingThrow.spends,
        ),
      magicActionHealingPool: (value) =>
        right.kind === "magicActionHealingPool" &&
        sameMagicActionHealingPool(value, right),
      magicActionAreaSaveDamageHealing: (value) =>
        right.kind === "magicActionAreaSaveDamageHealing" &&
        sameMagicActionAreaSaveDamageHealing(value, right),
      magicActionSaveGatedCondition: (value) =>
        right.kind === "magicActionSaveGatedCondition" &&
        sameMagicActionSaveGatedCondition(value, right),
      openHandTechnique: (value) =>
        right.kind === "openHandTechnique" &&
        sameOpenHandTechnique(value, right),
      stunningStrike: (value) =>
        right.kind === "stunningStrike" &&
        sameMechanicalResourceSpend(
          value.stunningStrike.spends,
          right.stunningStrike.spends,
        ),
      cunningStrike: (value) =>
        right.kind === "cunningStrike" &&
        value.cunningStrike.trigger.damageRiderProcedureRef ===
          right.cunningStrike.trigger.damageRiderProcedureRef &&
        sameCunningStrikeOptions(
          value.cunningStrike.options,
          right.cunningStrike.options,
        ),
      cunningStrikeOptionGrant: (value) =>
        right.kind === "cunningStrikeOptionGrant" &&
        value.optionGrant.sourceProcedureRef ===
          right.optionGrant.sourceProcedureRef &&
        sameCunningStrikeOption(
          value.optionGrant.option,
          right.optionGrant.option,
        ),
      paladinSacredWeapon: (value) =>
        right.kind === "paladinSacredWeapon" &&
        samePaladinSacredWeapon(value, right),
    }),
  );
}

type UnitExtraActionRestriction = Extract<
  UnitFeatureProcedureExecution,
  { readonly kind: "extraActionGrant" }
>["restriction"];

function sameUnitExtraActionRestriction(
  left: UnitExtraActionRestriction,
  right: UnitExtraActionRestriction,
): boolean {
  return Match.value(left).pipe(
    Match.discriminatorsExhaustive("kind")({
      none: () => right.kind === "none",
      exclude: (value) =>
        right.kind === "exclude" &&
        samePrimitiveMultiset(value.actions, right.actions),
      allow_only: (value) =>
        right.kind === "allow_only" &&
        sameMultisetBy(
          value.actions,
          right.actions,
          (leftAction, rightAction) =>
            leftAction.action === rightAction.action &&
            (leftAction.action !== "attack" ||
              (rightAction.action === "attack" &&
                leftAction.attackLimit.kind === rightAction.attackLimit.kind &&
                leftAction.attackLimit.count ===
                  rightAction.attackLimit.count)),
        ),
    }),
  );
}

function sameUnitFeatureProcedureExecution(
  left: UnitFeatureProcedureExecution,
  right: UnitFeatureProcedureExecution,
): boolean {
  return Match.value(left).pipe(
    Match.discriminatorsExhaustive("kind")({
      extraActionGrant: (value) =>
        right.kind === "extraActionGrant" &&
        sameUnitExtraActionRestriction(value.restriction, right.restriction),
      selfBonusActionHealing: (value) =>
        right.kind === "selfBonusActionHealing" &&
        value.dice === right.dice &&
        value.dieSize === right.dieSize &&
        value.flatBase === right.flatBase &&
        value.flatPerLevel === right.flatPerLevel &&
        value.startingAtLevel === right.startingAtLevel &&
        value.className === right.className &&
        value.classLevel === right.classLevel,
      ongoingFeature: (value) =>
        right.kind === "ongoingFeature" &&
        sameOngoingFeatureExecution(value, right),
      attackDamageRider: (value) => {
        if (
          right.kind !== "attackDamageRider" ||
          value.optional !== right.optional ||
          value.classLevel !== right.classLevel
        ) {
          return false;
        }
        return value.optional
          ? right.optional &&
              value.dice.dieSize === right.dice.dieSize &&
              sameLevelThresholdDiceTable(
                value.dice.diceByLevel,
                right.dice.diceByLevel,
              )
          : !right.optional && value.dice.dieSize === right.dice.dieSize;
      },
      saveDamageReplacement: () => right.kind === "saveDamageReplacement",
      reactionRollOrDamageReduction: (value) =>
        right.kind === "reactionRollOrDamageReduction" &&
        value.classLevel === right.classLevel &&
        sameMultisetBy(
          value.modifiers,
          right.modifiers,
          sameReactionReductionModifier,
        ),
      passiveArmorClassBonus: () => right.kind === "passiveArmorClassBonus",
      passiveRangedAttackRollBonus: () =>
        right.kind === "passiveRangedAttackRollBonus",
      initiativeProficiencyAndSwap: () =>
        right.kind === "initiativeProficiencyAndSwap",
      attackRollMissToHitReplacement: () =>
        right.kind === "attackRollMissToHitReplacement",
      attackActionAreaSaveDamageReplacement: (value) =>
        right.kind === "attackActionAreaSaveDamageReplacement" &&
        value.breath.area.shapeChoice[0].lengthFeet ===
          right.breath.area.shapeChoice[0].lengthFeet &&
        value.breath.area.shapeChoice[1].lengthFeet ===
          right.breath.area.shapeChoice[1].lengthFeet &&
        value.breath.area.shapeChoice[1].widthFeet ===
          right.breath.area.shapeChoice[1].widthFeet &&
        value.breath.damage.damageType.value ===
          right.breath.damage.damageType.value,
      d20TestNaturalOneReroll: () => right.kind === "d20TestNaturalOneReroll",
      passiveSavingThrowRollMode: (value) =>
        right.kind === "passiveSavingThrowRollMode" &&
        value.savingThrow.scope.kind === right.savingThrow.scope.kind &&
        (value.savingThrow.scope.kind === "condition"
          ? right.savingThrow.scope.kind === "condition" &&
            value.savingThrow.scope.condition ===
              right.savingThrow.scope.condition
          : right.savingThrow.scope.kind === "savingThrowAbility" &&
            value.savingThrow.scope.ability ===
              right.savingThrow.scope.ability),
      passiveAbilityCheckRollMode: () =>
        right.kind === "passiveAbilityCheckRollMode",
      passiveSpeedBonus: (value) =>
        right.kind === "passiveSpeedBonus" &&
        samePassiveSpeedFacts(value.speed, right.speed),
      passiveSpeedKindGrants: (value) =>
        right.kind === "passiveSpeedKindGrants" &&
        samePassiveSpeedKindGrants(
          value.speedKindGrants,
          right.speedKindGrants,
        ),
      acrobaticMovement: () => right.kind === "acrobaticMovement",
      creatureSpaceMovementPermission: () =>
        right.kind === "creatureSpaceMovementPermission",
      hideActionObscurementPermission: () =>
        right.kind === "hideActionObscurementPermission",
      weaponDamageDiceRollChoice: () =>
        right.kind === "weaponDamageDiceRollChoice",
      attackDamageDieFloor: () => right.kind === "attackDamageDieFloor",
      lightExtraAttackDamageAbilityModifier: () =>
        right.kind === "lightExtraAttackDamageAbilityModifier",
      martialArtsAttackProjection: (value) =>
        right.kind === "martialArtsAttackProjection" &&
        value.classLevel === right.classLevel &&
        value.martialArts.damageReplacement.dieSize ===
          right.martialArts.damageReplacement.dieSize,
      bardicInspirationGrant: (value) =>
        right.kind === "bardicInspirationGrant" &&
        value.rangeFeet === right.rangeFeet &&
        value.dieSize === right.dieSize &&
        value.durationTicks === right.durationTicks &&
        sameMechanicalResourceSpend(value.spends, right.spends),
      druidWildShapeKnownForm: (value) =>
        right.kind === "druidWildShapeKnownForm" &&
        sameDruidWildShapeKnownForm(value, right),
      attackActionAttackCountScaling: (value) =>
        right.kind === "attackActionAttackCountScaling" &&
        value.additionalAttacks === right.additionalAttacks,
      zeroHitPointReplacement: () => right.kind === "zeroHitPointReplacement",
      bonusActionDashTemporaryHitPoints: () =>
        right.kind === "bonusActionDashTemporaryHitPoints",
      failedAbilityCheckResourceBoost: (value) =>
        right.kind === "failedAbilityCheckResourceBoost" &&
        sameMechanicalResourceSpend(
          value.abilityCheck.spends,
          right.abilityCheck.spends,
        ),
      failedSavingThrowReroll: (value) =>
        right.kind === "failedSavingThrowReroll" &&
        sameMechanicalResourceSpend(
          value.savingThrow.spends,
          right.savingThrow.spends,
        ),
      spellSlotHealingModifier: () => right.kind === "spellSlotHealingModifier",
      magicActionHealingPool: (value) =>
        right.kind === "magicActionHealingPool" &&
        sameMagicActionHealingPool(value, right),
      magicActionAreaSaveDamageHealing: (value) =>
        right.kind === "magicActionAreaSaveDamageHealing" &&
        sameMagicActionAreaSaveDamageHealing(value, right),
      magicActionSaveGatedCondition: (value) =>
        right.kind === "magicActionSaveGatedCondition" &&
        sameMagicActionSaveGatedCondition(value, right),
      enemyZeroHitPointTemporaryHitPoints: (value) =>
        right.kind === "enemyZeroHitPointTemporaryHitPoints" &&
        value.className === right.className &&
        value.temporaryHitPoints.trigger.byOtherWithinFeet ===
          right.temporaryHitPoints.trigger.byOtherWithinFeet,
      bonusActionDelegatedStandardActions: () =>
        right.kind === "bonusActionDelegatedStandardActions",
      remarkableAthlete: () => right.kind === "remarkableAthlete",
      openHandTechnique: (value) =>
        right.kind === "openHandTechnique" &&
        sameOpenHandTechnique(value, right),
      stunningStrike: (value) =>
        right.kind === "stunningStrike" &&
        sameMechanicalResourceSpend(
          value.stunningStrike.spends,
          right.stunningStrike.spends,
        ),
      paladinSacredWeapon: (value) =>
        right.kind === "paladinSacredWeapon" &&
        samePaladinSacredWeapon(value, right),
      rogueSteadyAim: () => right.kind === "rogueSteadyAim",
      potentCantrip: () => right.kind === "potentCantrip",
      grappler: () => right.kind === "grappler",
      retaliationReactionAttack: () =>
        right.kind === "retaliationReactionAttack",
    }),
  );
}

function sameUnitFeatureAndSupportProcedureExecution(
  feature: UnitFeatureProcedureExecution,
  support: UnitSupportProcedureExecution,
): boolean {
  return Match.value(feature).pipe(
    Match.discriminatorsExhaustive("kind")({
      extraActionGrant: () => false,
      selfBonusActionHealing: () => false,
      ongoingFeature: () => false,
      attackDamageRider: () => support === "attackDamageRider",
      saveDamageReplacement: () => support === "saveDamageReplacement",
      reactionRollOrDamageReduction: () =>
        support === "reactionRollOrDamageReduction",
      passiveArmorClassBonus: () => support === "passiveArmorClassBonus",
      passiveRangedAttackRollBonus: (value) =>
        sameUnitSupportProcedureExecution(
          { kind: value.kind, attackRoll: value.attackRoll },
          support,
        ),
      initiativeProficiencyAndSwap: (value) =>
        sameUnitSupportProcedureExecution(
          { kind: value.kind, initiative: value.initiative },
          support,
        ),
      attackRollMissToHitReplacement: (value) =>
        sameUnitSupportProcedureExecution(
          { kind: value.kind, replacement: value.replacement },
          support,
        ),
      attackActionAreaSaveDamageReplacement: (value) =>
        sameUnitSupportProcedureExecution(
          { kind: value.kind, breath: value.breath },
          support,
        ),
      d20TestNaturalOneReroll: (value) =>
        sameUnitSupportProcedureExecution(
          { kind: value.kind, reroll: value.reroll },
          support,
        ),
      passiveSavingThrowRollMode: (value) =>
        sameUnitSupportProcedureExecution(
          { kind: value.kind, savingThrow: value.savingThrow },
          support,
        ),
      passiveAbilityCheckRollMode: (value) =>
        sameUnitSupportProcedureExecution(
          { kind: value.kind, abilityCheck: value.abilityCheck },
          support,
        ),
      passiveSpeedBonus: (value) =>
        sameUnitSupportProcedureExecution(
          {
            kind: value.kind,
            deltaFeet: value.speed.deltaFeet,
            condition: value.speed.condition,
          },
          support,
        ),
      passiveSpeedKindGrants: (value) =>
        sameUnitSupportProcedureExecution(
          value.speedKindGrants.speed === undefined
            ? {
                kind: value.kind,
                grants: value.speedKindGrants.grants,
              }
            : {
                kind: value.kind,
                speed: value.speedKindGrants.speed,
                grants: value.speedKindGrants.grants,
              },
          support,
        ),
      acrobaticMovement: (value) =>
        sameUnitSupportProcedureExecution(
          { kind: value.kind, acrobaticMovement: value.acrobaticMovement },
          support,
        ),
      creatureSpaceMovementPermission: (value) =>
        sameUnitSupportProcedureExecution(
          { kind: value.kind, permission: value.permission },
          support,
        ),
      hideActionObscurementPermission: (value) =>
        sameUnitSupportProcedureExecution(
          { kind: value.kind, permission: value.permission },
          support,
        ),
      weaponDamageDiceRollChoice: () =>
        support === "weaponDamageDiceRollChoice",
      attackDamageDieFloor: () => support === "attackDamageDieFloor",
      lightExtraAttackDamageAbilityModifier: (value) =>
        sameUnitSupportProcedureExecution(
          {
            kind: value.kind,
            damageAbilityModifier: value.damageAbilityModifier,
          },
          support,
        ),
      martialArtsAttackProjection: () =>
        support === "martialArtsAttackProjection",
      bardicInspirationGrant: () => support === "bardicInspirationGrant",
      druidWildShapeKnownForm: (value) =>
        sameUnitSupportProcedureExecution(
          {
            kind: value.kind,
            classLevel: value.classLevel,
            knownFormRoster: value.knownFormRoster,
          },
          support,
        ),
      attackActionAttackCountScaling: (value) =>
        sameUnitSupportProcedureExecution(
          { kind: value.kind, additionalAttacks: value.additionalAttacks },
          support,
        ),
      zeroHitPointReplacement: () => support === "zeroHitPointReplacement",
      bonusActionDashTemporaryHitPoints: (value) =>
        sameUnitSupportProcedureExecution(
          {
            kind: value.kind,
            dashTemporaryHitPoints: value.dashTemporaryHitPoints,
          },
          support,
        ),
      failedAbilityCheckResourceBoost: (value) =>
        sameUnitSupportProcedureExecution(
          { kind: value.kind, abilityCheck: value.abilityCheck },
          support,
        ),
      failedSavingThrowReroll: (value) =>
        sameUnitSupportProcedureExecution(
          { kind: value.kind, savingThrow: value.savingThrow },
          support,
        ),
      spellSlotHealingModifier: (value) =>
        sameUnitSupportProcedureExecution(
          { kind: value.kind, healingModifier: value.healingModifier },
          support,
        ),
      magicActionHealingPool: (value) =>
        sameUnitSupportProcedureExecution(
          {
            kind: value.kind,
            className: value.className,
            healingPool: value.healingPool,
          },
          support,
        ),
      magicActionAreaSaveDamageHealing: (value) =>
        sameUnitSupportProcedureExecution(
          { kind: value.kind, damageHealing: value.damageHealing },
          support,
        ),
      magicActionSaveGatedCondition: (value) =>
        sameUnitSupportProcedureExecution(
          { kind: value.kind, condition: value.condition },
          support,
        ),
      enemyZeroHitPointTemporaryHitPoints: (value) =>
        sameUnitSupportProcedureExecution(
          {
            kind: value.kind,
            className: value.className,
            temporaryHitPoints: value.temporaryHitPoints,
          },
          support,
        ),
      bonusActionDelegatedStandardActions: (value) =>
        sameUnitSupportProcedureExecution(
          {
            kind: value.kind,
            activationCost: value.actionEconomy.activationCost,
            sleightOfHand: value.actionEconomy.sleightOfHand,
            objectUse: value.actionEconomy.objectUse,
          },
          support,
        ),
      remarkableAthlete: (value) =>
        sameUnitSupportProcedureExecution(
          { kind: value.kind, remarkableAthlete: value.remarkableAthlete },
          support,
        ),
      openHandTechnique: (value) =>
        sameUnitSupportProcedureExecution(
          { kind: value.kind, technique: value.technique },
          support,
        ),
      stunningStrike: (value) =>
        sameUnitSupportProcedureExecution(
          { kind: value.kind, stunningStrike: value.stunningStrike },
          support,
        ),
      paladinSacredWeapon: (value) =>
        sameUnitSupportProcedureExecution(
          { kind: value.kind, sacredWeapon: value.sacredWeapon },
          support,
        ),
      rogueSteadyAim: (value) =>
        sameUnitSupportProcedureExecution(
          { kind: value.kind, steadyAim: value.steadyAim },
          support,
        ),
      potentCantrip: (value) =>
        sameUnitSupportProcedureExecution(
          { kind: value.kind, potentCantrip: value.potentCantrip },
          support,
        ),
      grappler: (value) =>
        sameUnitSupportProcedureExecution(
          { kind: value.kind, grappler: value.grappler },
          support,
        ),
      retaliationReactionAttack: (value) =>
        sameUnitSupportProcedureExecution(
          { kind: value.kind, retaliation: value.retaliation },
          support,
        ),
    }),
  );
}

export function unitFeatureProfileMatchesExecution(
  profile: SupportedUnitFeatureProfile,
  execution: UnitFeatureProcedureExecution,
  context: UnitFeatureProcedureExecutionContext,
): boolean {
  const projected = unitFeatureProcedureExecution(profile, context);
  return (
    projected !== undefined &&
    sameUnitFeatureProcedureExecution(projected, execution)
  );
}

export function unitFeatureProcedureExecution(
  profile: SupportedUnitFeatureProfile,
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
        ...(value.concentrationEffect === undefined
          ? {}
          : { concentrationEffect: value.concentrationEffect }),
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
                    ...(variant.damageIncludes === undefined
                      ? {}
                      : { damageIncludes: variant.damageIncludes }),
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
                      ...(variant.damageIncludes === undefined
                        ? {}
                        : { damageIncludes: variant.damageIncludes }),
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
        const resourcePoolRef = context.resourcePoolRefsByUnitId.get(
          value.savingThrow.spends.resourceUnitId,
        );
        return resourcePoolRef === undefined
          ? undefined
          : {
              kind: value.kind,
              savingThrow: {
                trigger: value.savingThrow.trigger,
                reroll: value.savingThrow.reroll,
                spends: {
                  resourcePoolRef,
                  amount: value.savingThrow.spends.amount,
                },
                resetCadence: value.savingThrow.resetCadence,
              },
            };
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
        ...(value.speed === undefined ? {} : { speed: value.speed }),
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
        const resourcePoolRef = context.resourcePoolRefsByUnitId.get(
          value.savingThrow.spends.resourceUnitId,
        );
        return resourcePoolRef === undefined
          ? undefined
          : {
              kind: value.kind,
              savingThrow: {
                trigger: value.savingThrow.trigger,
                reroll: value.savingThrow.reroll,
                spends: {
                  resourcePoolRef,
                  amount: value.savingThrow.spends.amount,
                },
                resetCadence: value.savingThrow.resetCadence,
              },
            };
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

export function characterSpellProcedureRefsForProcedure(
  execution: CharacterExecutionState,
  procedures: ReadonlySet<SupportedSpellInvocation["procedure"]>,
): readonly BattleProcedureExecutionRef[] {
  return execution.procedureBindings.flatMap((binding) => {
    const procedure = binding.procedure;
    return (procedure.kind === "spellInvocation" ||
      procedure.kind === "unavailableSpellInvocation") &&
      procedures.has(procedure.execution.procedure)
      ? [binding.procedureRef]
      : [];
  });
}

function spellRuleExecutionFacts(
  mechanics: SpellRecord["mechanics"],
): SpellRuleExecutionFacts {
  return {
    level: mechanics.level,
    range: mechanics.range,
    duration: mechanics.duration,
    components: {
      verbal: mechanics.components.v,
      somatic: mechanics.components.s,
      hasMaterial: mechanics.components.m !== false,
      hasPricedOrConsumedMaterial:
        mechanics.components.m !== false &&
        (typeof mechanics.components.m === "object" ||
          ("materialCostGp" in mechanics.components &&
            mechanics.components.materialCostGp !== undefined) ||
          ("materialConsumed" in mechanics.components &&
            mechanics.components.materialConsumed === true)),
    },
    twinnedTargetCount: spellTwinnedTargetCountFacts(mechanics),
  };
}

function spellTwinnedTargetCountFacts(
  mechanics: SpellRecord["mechanics"],
): SpellRuleExecutionFacts["twinnedTargetCount"] {
  const selections = spellTargetSelections(mechanics).filter((selection) => {
    if (!("count" in selection)) return false;
    const count = selection.count;
    const baseLevel =
      typeof count === "object" && count !== null && "baseLevel" in count
        ? (count.baseLevel ?? mechanics.level)
        : undefined;
    return (
      selection.mode === "choose_up_to" &&
      !("repeatsAllowed" in selection && selection.repeatsAllowed === true) &&
      selection.targetKinds?.length === 1 &&
      selection.targetKinds[0] === "creature" &&
      typeof count === "object" &&
      count !== null &&
      count.kind === "linear" &&
      count.perSlotAboveBase === 1 &&
      baseLevel === mechanics.level
    );
  });
  const selection = selections.length === 1 ? selections[0] : undefined;
  if (
    selection?.mode !== "choose_up_to" ||
    typeof selection.count !== "object" ||
    selection.count === null ||
    selection.count.kind !== "linear"
  ) {
    return null;
  }
  return {
    base: selection.count.base,
    baseLevel: selection.count.baseLevel ?? mechanics.level,
  };
}

function spellTargetSelections(
  mechanics: SpellRecord["mechanics"],
): readonly TargetSelection[] {
  if (mechanics.family === "ongoing_effect") {
    const selection = targetSelectionFromAttachment(mechanics.attachment);
    return selection === null ? [] : [selection];
  }
  if (mechanics.family !== "activation") return [];
  return mechanics.phases.flatMap((phase) => {
    if (!("attachment" in phase)) return [];
    const selection = targetSelectionFromAttachment(phase.attachment);
    return selection === null ? [] : [selection];
  });
}

function targetSelectionFromAttachment(
  attachment: Attachment,
): TargetSelection | null {
  return attachment.kind === "hole" && attachment.value.kind === "target"
    ? attachment.value.selection
    : null;
}

export function characterStoredSpellProcedureRef(
  execution: CharacterExecutionState,
  invocation: SupportedSpellInvocation | SpellProcedureExecution,
): BattleProcedureExecutionRef | undefined {
  return execution.procedureBindings.find(
    (binding) =>
      (binding.procedure.kind === "spellInvocation" ||
        binding.procedure.kind === "unavailableSpellInvocation") &&
      spellInvocationMatchesExecution(invocation, binding.procedure.execution),
  )?.procedureRef;
}

export function spellInvocationMatchesExecution(
  invocation: SupportedSpellInvocation | SpellProcedureExecution,
  execution: SpellProcedureExecution,
): boolean {
  const projected =
    "spell" in invocation ? spellProcedureExecution(invocation) : invocation;
  return (
    projected !== undefined && sameSpellProcedureExecution(projected, execution)
  );
}

export function spellProcedureExecution<
  Invocation extends SupportedSpellInvocation,
>(
  invocation: Invocation,
): Extract<
  Invocation["resource"],
  ClassFeatureFreeCastInvocationResource
> extends never
  ? SpellProcedureExecution<Invocation>
  : SpellProcedureExecution<Invocation> | undefined;
export function spellProcedureExecution(
  invocation: SupportedSpellInvocation,
): SpellProcedureExecution | undefined {
  const spellRuleFacts = spellRuleExecutionFacts(invocation.spell.mechanics);
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
      afterHitDamage: (value) => {
        const resource = classFeatureSpellInvocationResourceExecution(
          value.resource,
        );
        return resource === undefined
          ? undefined
          : {
              spellRuleFacts,
              access: value.access,
              actionCost: value.actionCost,
              conditionalBonusDamage: value.conditionalBonusDamage,
              damage: value.damage,
              procedure: value.procedure,
              resource,
            };
      },
      afterHitDamageAndIllumination: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        damage: value.damage,
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
      antimagicFieldOngoingSpellSuppression: (value) => ({
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
      blurAttackRollDefense: (value) => ({
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
      cloudkillAreaHazard: (value) => ({
        spellRuleFacts,
        ability: value.ability,
        access: value.access,
        damage: value.damage,
        dc: value.dc,
        durationTicks: value.durationTicks,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      command: (value) => ({
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
      counterspell: (value) => ({
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
      dancingLightsCombinedCast: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        dimRadiusFeet: value.dimRadiusFeet,
        expiresAt: value.expiresAt,
        form: value.form,
        maxMoveFeet: value.maxMoveFeet,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        spacingFeet: value.spacingFeet,
      }),
      dancingLightsReposition: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        activeEffectRef: value.activeEffectRef,
        sourceDancingLightsProcedureRef: value.sourceDancingLightsProcedureRef,
        maxMoveFeet: value.maxMoveFeet,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        spacingFeet: value.spacingFeet,
      }),
      dancingLightsSeparateCast: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        dimRadiusFeet: value.dimRadiusFeet,
        expiresAt: value.expiresAt,
        form: value.form,
        maxMoveFeet: value.maxMoveFeet,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        spacingFeet: value.spacingFeet,
      }),
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
      dragonsBreathInitial: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        damageTypeChoices: value.damageTypeChoices,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      expeditiousRetreatDash: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        procedure: value.procedure,
        resource: value.resource,
      }),
      featherFallMitigation: (value) => ({
        spellRuleFacts,
        access: value.access,
        activeEffect: value.activeEffect,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      flamingSphere: (value) => ({
        spellRuleFacts,
        ability: value.ability,
        access: value.access,
        damage: value.damage,
        dc: value.dc,
        durationTicks: value.durationTicks,
        procedure: value.procedure,
        ramMaxMoveFeet: value.ramMaxMoveFeet,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      fogCloudObscurement: (value) => ({
        spellRuleFacts,
        access: value.access,
        durationTicks: value.durationTicks,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      greaseGroundHazard: (value) => ({
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
      gustOfWindLine: (value) => ({
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
      hastePositive: (value) => ({
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
      hideousLaughter: (value) => ({
        spellRuleFacts,
        ability: value.ability,
        access: value.access,
        actionCost: value.actionCost,
        dc: value.dc,
        procedure: value.procedure,
        resource: value.resource,
        targeting: value.targeting,
      }),
      hypnoticPattern: (value) => ({
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
      insectPlagueAreaHazard: (value) => ({
        spellRuleFacts,
        ability: value.ability,
        access: value.access,
        damage: value.damage,
        dc: value.dc,
        durationTicks: value.durationTicks,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      jumpMovementReplacement: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      levitatedCreature: (value) => ({
        spellRuleFacts,
        ability: value.ability,
        access: value.access,
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        dc: value.dc,
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
      magicWeaponEnhancement: (value) => ({
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
            const resource = classFeatureSpellInvocationResourceExecution(
              cast.resource,
            );
            return resource === undefined
              ? undefined
              : {
                  spellRuleFacts,
                  abilityCheckBehavior: cast.abilityCheckBehavior,
                  access: cast.access,
                  action: cast.action,
                  actionCost: cast.actionCost,
                  damage: cast.damage,
                  expiresAt: cast.expiresAt,
                  procedure: cast.procedure,
                  rangeFeet: cast.rangeFeet,
                  resource,
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
      mirrorImageHitInterception: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        procedure: value.procedure,
        resource: value.resource,
      }),
      moonbeam: (value) => ({
        spellRuleFacts,
        ability: value.ability,
        access: value.access,
        damage: value.damage,
        dc: value.dc,
        durationTicks: value.durationTicks,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        repositionMaxMoveFeet: value.repositionMaxMoveFeet,
        resource: value.resource,
        targeting: value.targeting,
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
          Match.when({ access: { tag: "classCantrip" } }, (value) => ({
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
              skillChoices: value.skillChoices,
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
              skillChoices: value.skillChoices,
              targeting: value.targeting,
            },
      sanctuaryTargetingInterdiction: (value) => ({
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
          Match.when({ access: { tag: "classCantrip" } }, (value) => ({
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
      shieldReaction: (value) => ({
        spellRuleFacts,
        access: value.access,
        armorClassBonus: value.armorClassBonus,
        negatesRepeatedDamageAllocation: value.negatesRepeatedDamageAllocation,
        procedure: value.procedure,
        resource: value.resource,
      }),
      sleepTargetAdmission: (value) => ({
        spellRuleFacts,
        ability: value.ability,
        access: value.access,
        dc: value.dc,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      sleetStormAreaHazard: (value) => ({
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
      slowActivePenalties: (value) => ({
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
      spellAttackDamage: (value) =>
        Match.value(value).pipe(
          Match.when({ access: { tag: "classCantrip" } }, (value) => ({
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
          Match.when({ access: { tag: "classCantrip" } }, (value) => ({
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
      spellCreatedHeldObjectReEvoke: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        sourceEffectRef: value.sourceEffectRef,
        sourceHeldObjectProcedureRef: value.sourceHeldObjectProcedureRef,
        procedure: value.procedure,
        resource: value.resource,
      }),
      spellHostedWeaponAttack: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        attackBonus: value.attackBonus,
        bonusDamage: value.bonusDamage,
        componentWeaponItemId: value.componentWeapon.itemId,
        damageTypeChoices: value.damageTypeChoices,
        procedure: value.procedure,
        resource: value.resource,
        spellcastingAbilityModifier: value.spellcastingAbilityModifier,
      }),
      spikeGrowthMovementHazard: (value) => ({
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
      spiritualWeaponAttackProxy: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        attackBonus: value.attackBonus,
        attackKind: value.attackKind,
        damage: value.damage,
        durationTicks: value.durationTicks,
        forceReachFeet: value.forceReachFeet,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        repeatMoveMaxFeet: value.repeatMoveMaxFeet,
        resource: value.resource,
        targeting: value.targeting,
      }),
      spiritualWeaponRepeatAttack: (value) => ({
        activeEffectRef: value.activeEffect.effectRef,
        activeEffectSourceProcedureRef: value.activeEffect.sourceProcedureRef,
        procedure: value.procedure,
      }),
      thaumaturgyBoomingVoice: (value) => ({
        spellRuleFacts,
        access: value.access,
        actionCost: value.actionCost,
        activeEffect: value.activeEffect,
        procedure: value.procedure,
        rangeFeet: value.rangeFeet,
        resource: value.resource,
      }),
      wardingBond: (value) => ({
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
      webRestraintHazard: (value) => ({
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

function classFeatureSpellInvocationResourceExecution(
  resource: AfterHitDamageSpellProcedureExecution["resource"],
): AfterHitDamageSpellProcedureExecution["resource"] | undefined {
  return Match.value(resource).pipe(
    Match.discriminatorsExhaustive("tag")({
      spellSlot: (value) => value,
      classFeatureFreeCast: (value) => value,
    }),
  );
}

function sameSpellProcedureExecution(
  left: SpellProcedureExecution,
  right: SpellProcedureExecution,
): boolean {
  return Match.value(left).pipe(
    Match.discriminatorsExhaustive("procedure")({
      abilityD20TestRollModeSaveGate: (value) =>
        right.procedure === value.procedure &&
        sameAbilityD20TestRollModeSaveGateExecution(value, right),
      afterHitDamage: (value) =>
        right.procedure === value.procedure &&
        sameAfterHitDamageExecution(value, right),
      afterHitDamageAndIllumination: (value) =>
        right.procedure === value.procedure &&
        sameAfterHitDamageAndIlluminationExecution(value, right),
      afterHitSaveGatedCondition: (value) =>
        right.procedure === value.procedure &&
        sameAfterHitSaveGatedConditionExecution(value, right),
      afterHitTimedDamageAndSave: (value) =>
        right.procedure === value.procedure &&
        sameAfterHitTimedDamageAndSaveExecution(value, right),
      antimagicFieldOngoingSpellSuppression: (value) =>
        right.procedure === value.procedure &&
        sameAntimagicFieldOngoingSpellSuppressionExecution(value, right),
      attackBurstSaveDamage: (value) =>
        right.procedure === value.procedure &&
        sameAttackBurstSaveDamageExecution(value, right),
      blurAttackRollDefense: (value) =>
        right.procedure === value.procedure &&
        sameBlurAttackRollDefenseExecution(value, right),
      chainedSpellAttackDamage: (value) =>
        right.procedure === value.procedure &&
        sameChainedSpellAttackDamageExecution(value, right),
      chosenDamageResistance: (value) =>
        right.procedure === value.procedure &&
        sameChosenDamageResistanceExecution(value, right),
      cloudkillAreaHazard: (value) =>
        right.procedure === value.procedure &&
        sameCloudkillAreaHazardExecution(value, right),
      command: (value) =>
        right.procedure === value.procedure &&
        sameCommandExecution(value, right),
      conditionImmunityAndTurnStartTemporaryHitPoints: (value) =>
        right.procedure === value.procedure &&
        sameConditionImmunityAndTurnStartTemporaryHitPointsExecution(
          value,
          right,
        ),
      conditionRemovalProtection: (value) =>
        right.procedure === value.procedure &&
        sameConditionRemovalProtectionExecution(value, right),
      counterspell: (value) =>
        right.procedure === value.procedure &&
        sameCounterspellExecution(value, right),
      creatureSizeDecrease: (value) =>
        right.procedure === value.procedure &&
        sameCreatureSizeDecreaseExecution(value, right),
      creatureSizeIncrease: (value) =>
        right.procedure === value.procedure &&
        sameCreatureSizeIncreaseExecution(value, right),
      creatureTypeProtection: (value) =>
        right.procedure === value.procedure &&
        sameCreatureTypeProtectionExecution(value, right),
      damageReduction: (value) =>
        right.procedure === value.procedure &&
        sameDamageReductionExecution(value, right),
      dancingLightsCombinedCast: (value) =>
        right.procedure === value.procedure &&
        sameDancingLightsCombinedCastExecution(value, right),
      dancingLightsReposition: (value) =>
        right.procedure === value.procedure &&
        sameDancingLightsRepositionExecution(value, right),
      dancingLightsSeparateCast: (value) =>
        right.procedure === value.procedure &&
        sameDancingLightsSeparateCastExecution(value, right),
      directCondition: (value) =>
        right.procedure === value.procedure &&
        sameDirectConditionExecution(value, right),
      directConditionRemoval: (value) =>
        right.procedure === value.procedure &&
        sameDirectConditionRemovalExecution(value, right),
      directHitPointRestoration: (value) =>
        right.procedure === value.procedure &&
        sameDirectHitPointRestorationExecution(value, right),
      dragonsBreathInitial: (value) =>
        right.procedure === value.procedure &&
        sameDragonsBreathInitialExecution(value, right),
      expeditiousRetreatDash: (value) =>
        right.procedure === value.procedure &&
        sameExpeditiousRetreatDashExecution(value, right),
      featherFallMitigation: (value) =>
        right.procedure === value.procedure &&
        sameFeatherFallMitigationExecution(value, right),
      flamingSphere: (value) =>
        right.procedure === value.procedure &&
        sameFlamingSphereExecution(value, right),
      fogCloudObscurement: (value) =>
        right.procedure === value.procedure &&
        sameFogCloudObscurementExecution(value, right),
      greaseGroundHazard: (value) =>
        right.procedure === value.procedure &&
        sameGreaseGroundHazardExecution(value, right),
      gustOfWindLine: (value) =>
        right.procedure === value.procedure &&
        sameGustOfWindLineExecution(value, right),
      hastePositive: (value) =>
        right.procedure === value.procedure &&
        sameHastePositiveExecution(value, right),
      heldLight: (value) =>
        right.procedure === value.procedure &&
        sameHeldLightExecution(value, right),
      heldLightHurl: (value) =>
        right.procedure === value.procedure &&
        sameHeldLightHurlExecution(value, right),
      hideousLaughter: (value) =>
        right.procedure === value.procedure &&
        sameHideousLaughterExecution(value, right),
      hypnoticPattern: (value) =>
        right.procedure === value.procedure &&
        sameHypnoticPatternExecution(value, right),
      insectPlagueAreaHazard: (value) =>
        right.procedure === value.procedure &&
        sameInsectPlagueAreaHazardExecution(value, right),
      jumpMovementReplacement: (value) =>
        right.procedure === value.procedure &&
        sameJumpMovementReplacementExecution(value, right),
      levitatedCreature: (value) =>
        right.procedure === value.procedure &&
        sameLevitatedCreatureExecution(value, right),
      magicalDarknessPointOrigin: (value) =>
        right.procedure === value.procedure &&
        sameMagicalDarknessPointOriginExecution(value, right),
      magicWeaponEnhancement: (value) =>
        right.procedure === value.procedure &&
        sameMagicWeaponEnhancementExecution(value, right),
      makeStable: (value) =>
        right.procedure === value.procedure &&
        sameMakeStableExecution(value, right),
      markedDamageRider: (value) =>
        right.procedure === value.procedure &&
        sameMarkedDamageRiderExecution(value, right),
      mirrorImageHitInterception: (value) =>
        right.procedure === value.procedure &&
        sameMirrorImageHitInterceptionExecution(value, right),
      moonbeam: (value) =>
        right.procedure === value.procedure &&
        sameMoonbeamExecution(value, right),
      objectContactDamage: (value) =>
        right.procedure === value.procedure &&
        sameObjectContactDamageExecution(value, right),
      objectContactDamageRepeat: (value) =>
        right.procedure === value.procedure &&
        sameObjectContactDamageRepeatExecution(value, right),
      objectLight: (value) =>
        right.procedure === value.procedure &&
        sameObjectLightExecution(value, right),
      ongoingSpellEnd: (value) =>
        right.procedure === value.procedure &&
        sameOngoingSpellEndExecution(value, right),
      persistentArmorEffect: (value) =>
        right.procedure === value.procedure &&
        samePersistentArmorEffectExecution(value, right),
      repeatedDamageAllocation: (value) =>
        right.procedure === value.procedure &&
        sameRepeatedDamageAllocationExecution(value, right),
      rollModifier: (value) =>
        right.procedure === value.procedure &&
        sameRollModifierExecution(value, right),
      sanctuaryTargetingInterdiction: (value) =>
        right.procedure === value.procedure &&
        sameSanctuaryTargetingInterdictionExecution(value, right),
      saveGatedAttackRollAdvantage: (value) =>
        right.procedure === value.procedure &&
        sameSaveGatedAttackRollAdvantageExecution(value, right),
      saveGatedCondition: (value) =>
        right.procedure === value.procedure &&
        sameSaveGatedConditionExecution(value, right),
      saveGatedConditionImmunity: (value) =>
        right.procedure === value.procedure &&
        sameSaveGatedConditionImmunityExecution(value, right),
      saveGatedDamage: (value) =>
        right.procedure === value.procedure &&
        sameSaveGatedDamageExecution(value, right),
      scalarBuff: (value) =>
        right.procedure === value.procedure &&
        sameScalarBuffExecution(value, right),
      seeInvisibleObserverSight: (value) =>
        right.procedure === value.procedure &&
        sameSeeInvisibleObserverSightExecution(value, right),
      selfTeleport: (value) =>
        right.procedure === value.procedure &&
        sameSelfTeleportExecution(value, right),
      selfTransformationMode: (value) =>
        right.procedure === value.procedure &&
        sameSelfTransformationModeExecution(value, right),
      shieldReaction: (value) =>
        right.procedure === value.procedure &&
        sameShieldReactionExecution(value, right),
      sleepTargetAdmission: (value) =>
        right.procedure === value.procedure &&
        sameSleepTargetAdmissionExecution(value, right),
      sleetStormAreaHazard: (value) =>
        right.procedure === value.procedure &&
        sameSleetStormAreaHazardExecution(value, right),
      slowActivePenalties: (value) =>
        right.procedure === value.procedure &&
        sameSlowActivePenaltiesExecution(value, right),
      spellAttackDamage: (value) =>
        right.procedure === value.procedure &&
        sameSpellAttackDamageExecution(value, right),
      spellAttackSequence: (value) =>
        right.procedure === value.procedure &&
        sameSpellAttackSequenceExecution(value, right),
      spellCreatedHeldObject: (value) =>
        right.procedure === value.procedure &&
        sameSpellCreatedHeldObjectExecution(value, right),
      spellCreatedHeldObjectAttack: (value) =>
        right.procedure === value.procedure &&
        sameSpellCreatedHeldObjectAttackExecution(value, right),
      spellCreatedHeldObjectReEvoke: (value) =>
        right.procedure === value.procedure &&
        sameSpellCreatedHeldObjectReEvokeExecution(value, right),
      spellHostedWeaponAttack: (value) =>
        right.procedure === value.procedure &&
        sameSpellHostedWeaponAttackExecution(value, right),
      spikeGrowthMovementHazard: (value) =>
        right.procedure === value.procedure &&
        sameSpikeGrowthMovementHazardExecution(value, right),
      spiritualWeaponAttackProxy: (value) =>
        right.procedure === value.procedure &&
        sameSpiritualWeaponAttackProxyExecution(value, right),
      spiritualWeaponRepeatAttack: (value) =>
        right.procedure === value.procedure &&
        sameSpiritualWeaponRepeatAttackExecution(value, right),
      thaumaturgyBoomingVoice: (value) =>
        right.procedure === value.procedure &&
        sameThaumaturgyBoomingVoiceExecution(value, right),
      wardingBond: (value) =>
        right.procedure === value.procedure &&
        sameWardingBondExecution(value, right),
      weaponAttackOverride: (value) =>
        right.procedure === value.procedure &&
        sameWeaponAttackOverrideExecution(value, right),
      weaponDamageRider: (value) =>
        right.procedure === value.procedure &&
        sameWeaponDamageRiderExecution(value, right),
      webRestraintHazard: (value) =>
        right.procedure === value.procedure &&
        sameWebRestraintHazardExecution(value, right),
    }),
  );
}

export function characterSpellProcedure(
  execution: CharacterExecutionState,
  procedureRef: BattleProcedureExecutionRef,
  liveActor?: {
    readonly combatantId: CombatantId;
    readonly activeEffects: readonly BattleActiveEffect[];
  },
): BattleSpellProcedureExecution | undefined {
  const binding = execution.procedureBindings.find(
    (candidate) => candidate.procedureRef === procedureRef,
  );
  if (binding?.procedure.kind !== "spellInvocation") return undefined;
  const executable = executableSpellProcedureFromLiveEffects(
    execution,
    binding.procedure.execution,
    liveActor,
  );
  if (executable === undefined) return undefined;
  return {
    ...executable,
    sourceProcedureRef: procedureRef,
  };
}

function executableSpellProcedureFromLiveEffects(
  execution: CharacterExecutionState,
  stored: SpellProcedureExecution,
  liveActor:
    | {
        readonly combatantId: CombatantId;
        readonly activeEffects: readonly BattleActiveEffect[];
      }
    | undefined,
): SpellExecutableExecutionOf<SpellProcedureExecution> | undefined {
  if (
    stored.procedure === "markedDamageRider" &&
    stored.action === "transfer"
  ) {
    if (liveActor === undefined) return undefined;
    const source = characterSpellProcedureExecution(
      execution,
      stored.activeEffectSourceProcedureRef,
    );
    const activeEffect = liveActor.activeEffects.find(
      (
        effect,
      ): effect is Extract<
        BattleActiveEffect,
        { readonly kind: "spellMarkedDamageRider" }
      > =>
        effect.kind === "spellMarkedDamageRider" &&
        effect.effectRef === stored.activeEffectRef &&
        effect.sourceProcedureRef === stored.activeEffectSourceProcedureRef &&
        effect.sourceCombatantId === liveActor.combatantId,
    );
    return activeEffect !== undefined &&
      source?.procedure === "markedDamageRider" &&
      source.action === "cast"
      ? {
          spellRuleFacts: source.spellRuleFacts,
          access: {
            tag: "spellEffect",
            sourceCombatantId: liveActor.combatantId,
          },
          resource: { tag: "none" },
          procedure: stored.procedure,
          action: stored.action,
          actionCost: "bonusAction",
          activeEffect,
          rangeFeet: source.rangeFeet,
          targeting: { kind: "singleCombatant" },
        }
      : undefined;
  }
  if (stored.procedure === "objectContactDamageRepeat") {
    if (liveActor === undefined) return undefined;
    const source = characterSpellProcedureExecution(
      execution,
      stored.activeEffectSourceProcedureRef,
    );
    const activeEffect = liveActor.activeEffects.find(
      (
        effect,
      ): effect is Extract<
        BattleActiveEffect,
        { readonly kind: "spellObjectContactDamage" }
      > =>
        effect.kind === "spellObjectContactDamage" &&
        effect.effectRef === stored.activeEffectRef &&
        effect.sourceProcedureRef === stored.activeEffectSourceProcedureRef &&
        effect.sourceCombatantId === liveActor.combatantId,
    );
    return activeEffect !== undefined &&
      source?.procedure === "objectContactDamage"
      ? {
          spellRuleFacts: source.spellRuleFacts,
          access: {
            tag: "spellEffect",
            sourceCombatantId: liveActor.combatantId,
          },
          resource: { tag: "none" },
          procedure: stored.procedure,
          actionCost: "bonusAction",
          activeEffect,
        }
      : undefined;
  }
  if (stored.procedure === "spiritualWeaponRepeatAttack") {
    if (liveActor === undefined) return undefined;
    const source = characterSpellProcedureExecution(
      execution,
      stored.activeEffectSourceProcedureRef,
    );
    const activeEffect = liveActor.activeEffects.find(
      (
        effect,
      ): effect is Extract<
        BattleActiveEffect,
        { readonly kind: "spiritualWeapon" }
      > =>
        effect.kind === "spiritualWeapon" &&
        effect.effectRef === stored.activeEffectRef &&
        effect.sourceProcedureRef === stored.activeEffectSourceProcedureRef &&
        effect.sourceCombatantId === liveActor.combatantId,
    );
    return activeEffect !== undefined &&
      source?.procedure === "spiritualWeaponAttackProxy"
      ? {
          spellRuleFacts: source.spellRuleFacts,
          access: {
            tag: "spellEffect",
            sourceCombatantId: liveActor.combatantId,
          },
          resource: { tag: "none" },
          procedure: stored.procedure,
          actionCost: "bonusAction",
          activeEffect,
          targeting: { kind: "singleCombatant" },
          damage: activeEffect.damage,
          attackKind: activeEffect.attackKind,
          attackBonus: activeEffect.attackBonus,
          forceReachFeet: activeEffect.forceReachFeet,
          repeatMoveMaxFeet: activeEffect.repeatMoveMaxFeet,
        }
      : undefined;
  }
  return stored;
}

export function characterSpellSelectionInvocation(
  execution: CharacterExecutionState,
  procedureRef: BattleProcedureExecutionRef,
  invocations: readonly SupportedSpellInvocation[],
): BattleSelectedSpellInvocation | undefined {
  const storedExecution = characterSpellProcedureExecution(
    execution,
    procedureRef,
  );
  if (storedExecution === undefined) return undefined;
  const invocation = invocations.find((candidate) =>
    spellInvocationMatchesExecution(candidate, storedExecution),
  );
  return invocation === undefined
    ? undefined
    : bindSelectedSpellInvocation(invocation, procedureRef);
}

export function characterSpellProcedureExecution(
  execution: CharacterExecutionState,
  procedureRef: BattleProcedureExecutionRef,
): SpellProcedureExecution | undefined {
  const binding = characterProcedureBinding(execution, procedureRef);
  return binding?.procedure.kind === "spellInvocation"
    ? binding.procedure.execution
    : undefined;
}

export function bindStoredSpellProcedureExecutionFacts<
  I extends SpellProcedureExecution,
>(
  execution: I,
  procedureRef: BattleProcedureExecutionRef,
): I & { readonly sourceProcedureRef: BattleProcedureExecutionRef } {
  return { ...execution, sourceProcedureRef: procedureRef };
}

export function bindSelectedSpellInvocation<I extends SupportedSpellInvocation>(
  invocation: I,
  procedureRef: BattleProcedureExecutionRef,
): BattleSelectedSpellInvocation<I> {
  return { ...invocation, sourceProcedureRef: procedureRef };
}
