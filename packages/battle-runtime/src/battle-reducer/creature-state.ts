// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.d20-test-natural-one-reroll
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.druid-wild-shape-known-form unit-feature.enemy-zero-hit-point-temporary-hit-points unit-feature.magic-action-area-save-damage-healing unit-feature.magic-action-healing-pool unit-feature.paladin-sacred-weapon unit-feature.potent-cantrip unit-feature.remarkable-athlete unit-feature.spell-slot-healing-modifier spell.invocation-warding-bond-linked-effect character-sheet.metamagic-battle-resource-bridge
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-slow-active-penalties
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.WILD_SHAPE_FORM_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SLOW_ACTIVE_PENALTIES_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.PROTOCOL.ZERO_HIT_POINT_MID_RESOLUTION
// The 5 small leaf helpers (combatantCanSee, currentActorId, etc.) live in
// creature-state-leaves.ts to break the cluster_state ↔ movement_speed cycle.

import { optionalProperty } from "../optional-property.ts";
import {
  ammunitionStockIssues,
  missingRequiredAmmunitionKinds,
} from "../battle-ammunition.ts";
import { statBlockAttackActionOptions } from "../stat-block-execution.ts";
import { Match, Result } from "effect";
import {
  Hp,
  movementFeet,
  type ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
import type { HandUse } from "@dnd/shared/types";
import {
  applyCondition,
  EMPTY_CONDITION_STATE,
  hasCondition,
} from "@dnd/shared-algebras/conditions-algebra";
import type { ConditionState } from "@dnd/shared-algebras/conditions-algebra";
import {
  defaultUnarmoredArmorClassBase,
  statBlockArmorClassState,
} from "@dnd/shared-algebras/armor-class-algebra";
import {
  resetDeathSaveRuntimeState,
  validDeathSaveRuntimeState,
} from "@dnd/shared-algebras/death-saves-algebra";
import { initiativeEntries } from "@dnd/shared-algebras/initiative-algebra";
import type { UnitId } from "@dnd/shared/game-facts";
import type { UnitRecord } from "@dnd/surface/surface/types";
import type { ZeroHpLifecycle } from "../zero-hp-lifecycle.ts";
import {
  battleEffectExecutionOrdinal,
  battleExecutionScopeOrdinal,
  type BattleId,
  type BattleExecutionScopeOrdinal,
  type BattleObjectId,
  type BattleStatBlockExecutionScopeRef,
  type CombatantId,
  type InitiativeScore,
} from "../identity.ts";
import type {
  BattleCreatureInit,
  CharacterBattleCombatantInit,
  BattlePositiveHpUnconscious,
  CharacterBattleCreatureInit,
  CharacterBattleCreatureInitWeaponAttack,
} from "../battle-init.ts";
import type { CharacterWeaponAttackActionOption } from "../battle-action-options.ts";
import {
  weaponMasteryIsSelectedForWeapon,
  type CharacterBattleWeaponMasterySelection,
} from "../character-creature-execution-facts.ts";
import {
  characterBattleMetamagicInitIssue,
  characterBattleMetamagicState,
  admitCharacterBattleResources,
  characterBattleSpellbookRitualSpellAccessInitIssue,
  characterBattleResourceInitIssue,
  characterSpellcastingStateInitIssue,
  characterSpellcastingExecutionState,
  characterSpellcastingState,
  parseCharacterBattleInvocationSpellAccesses,
  parseCharacterBattleClassLevels,
  type CharacterBattleFeatureInit,
  type CharacterBattleResourceInit,
  type CharacterBattleResourceOwnership,
  type CharacterBattleSpellcastingStateInit,
} from "../character-battle-resources.ts";
import type {
  BattleStatBlockPresentationSource,
  CharacterBattleRuntimeContext,
} from "../battle-runtime-context.ts";
import type { CharacterBattleClassLevels } from "../character-class-level.ts";
import type { BattleDruidWildShapeKnownFormRuntime } from "../druid-wild-shape-known-form-runtime.ts";
import { characterExecutionFromUnits } from "../character-execution-admission.ts";
import {
  parseSupportedUnitFeatureProfile,
  type BattleUnitSupportProfileIssue,
} from "../unit-feature-support.ts";
import {
  type BattleCreatureKnockOutLifecycle,
  type BattleCreatureState,
  type BattleHidePrerequisite,
  type BattleState,
  type BattleStateInitIssue,
  type BattleStateInitLeafIssue,
  type CharacterBattleCreatureState,
  type StatBlockBattleCreatureState,
} from "../battle-state-execution.ts";
import {
  KnockedOutOneHp,
  KnockedOutConditionState,
} from "./knocked-out-state.ts";
import {
  battleStateInitIssue,
  battleStateInitIssueMessage,
  weaponLoadoutMismatchIssue,
} from "./domain-helpers.ts";
export {
  activeConditions,
  activeEffectArmorClass,
  activeOngoingFeatureOccurrencesForCombatant,
  battleCreatureStateWithDamageProjection,
  battleCreatureStateWithKnockOutPreservedConditions,
  battleCreatureStateWithoutKnockOut,
  battleSubjectActorId,
  characterResourceSnapshot,
  closeLegendaryActionWindow,
  combatantCanTakeActions,
  combatantCanTakeReactions,
  combatantOriginSnapshot,
  combatantSnapshot,
  combatantZeroHpLifecycleSnapshot,
  consumeLegendaryActionWindow,
  isCharacterBattleCreatureState,
  isLegendaryAttackSubject,
  knockedOutConditionState,
  knockedOutOneHp,
  nonKnockOutLifecycleFields,
  normalizeEarlyEndedOngoingFeatures,
  ongoingFeatureProfileForSourceKey,
  statBlockLegendaryActionWindowIsOpen,
} from "./creature-state-execution.ts";
import { applyInitialZeroHpLifecycle } from "./damage-apply.ts";
import { statBlockExecutionAdmissionCohort } from "../stat-block-execution.ts";
import type { StatBlockExecutionAdmission } from "../stat-block-execution-state.ts";
import { druidWildShapeAvailableFormsIssueForProfile } from "./druid-wild-shape.ts";
import { admitCharacterAttackExecution } from "../attack-execution.ts";
import {
  admitBattleStatBlockCombatantSource,
  statBlockInitialConditionImmunityIssue,
} from "../stat-block-combatant-admission.ts";

function isCharacterBattleCreatureInit(
  input: BattleCreatureInit,
): input is CharacterBattleCombatantInit {
  return input.creatureInit.kind === "character";
}

function isNonEmptyReadonlyArray<T>(
  values: readonly T[],
): values is ReadonlyNonEmptyArray<T> {
  return values.length > 0;
}

function characterInitWeaponAttackExecutionRefs(
  slot: "main-hand" | "off-hand",
  attack: CharacterBattleCreatureInitWeaponAttack,
  loadoutWeapon:
    | { readonly itemId: BattleObjectId; readonly unitId: UnitId }
    | undefined,
  weaponMasteries: readonly CharacterBattleWeaponMasterySelection[],
): Result.Result<
  {
    readonly weaponObjectId: BattleObjectId;
    readonly hasWeaponMastery: boolean;
  },
  BattleStateInitLeafIssue
> {
  if (
    loadoutWeapon === undefined ||
    loadoutWeapon.unitId !== attack.weapon.weaponUnitId
  ) {
    return weaponLoadoutMismatchIssue(slot);
  }
  return Result.succeed({
    weaponObjectId: loadoutWeapon.itemId,
    hasWeaponMastery: weaponMasteryIsSelectedForWeapon(
      attack.weapon.weaponUnitId,
      weaponMasteries,
    ),
  });
}

function characterInitWeaponAttackWithExecutionRefs(
  slot: "main-hand" | "off-hand",
  attack: CharacterBattleCreatureInitWeaponAttack,
  loadoutWeapon:
    | { readonly itemId: BattleObjectId; readonly unitId: UnitId }
    | undefined,
  weaponMasteries: readonly CharacterBattleWeaponMasterySelection[],
): Result.Result<CharacterWeaponAttackActionOption, BattleStateInitLeafIssue> {
  const refs = characterInitWeaponAttackExecutionRefs(
    slot,
    attack,
    loadoutWeapon,
    weaponMasteries,
  );
  if (Result.isFailure(refs)) {
    return Result.fail(refs.failure);
  }
  return Result.succeed({
    ...attack,
    weaponObjectId: refs.success.weaponObjectId,
    hasWeaponMastery: refs.success.hasWeaponMastery,
  });
}

type CharacterWildShapeExecutionAdmission =
  | {
      readonly nextScopeOrdinal: BattleExecutionScopeOrdinal;
      readonly wildShape?: never;
    }
  | {
      readonly nextScopeOrdinal: BattleExecutionScopeOrdinal;
      readonly wildShape: {
        readonly admittedForms: readonly StatBlockExecutionAdmission<BattleDruidWildShapeKnownFormRuntime>[];
        readonly presentations: ReadonlyMap<
          BattleStatBlockExecutionScopeRef,
          BattleStatBlockPresentationSource
        >;
      };
    };

function admitCharacterWildShapeExecution(
  battleId: BattleId,
  combatantId: CombatantId,
  wildShapeForms: CharacterBattleCreatureInit["druidWildShapeAvailableForms"],
  startingScopeOrdinal: BattleExecutionScopeOrdinal,
): CharacterWildShapeExecutionAdmission {
  const wildShapeRuntimeForms: readonly BattleDruidWildShapeKnownFormRuntime[] =
    (wildShapeForms ?? []).map(
      ({ presentation: _presentation, ...form }) => form,
    );
  const executionCohort = statBlockExecutionAdmissionCohort(
    battleId,
    combatantId,
    wildShapeRuntimeForms,
    startingScopeOrdinal,
  );
  if (wildShapeForms === undefined) {
    return {
      nextScopeOrdinal: executionCohort.nextScopeOrdinal,
    };
  }
  const wildShapePresentationsByStatBlockId = new Map(
    wildShapeForms.map((form) => [form.id, form.presentation] as const),
  );
  const wildShapePresentations = new Map<
    BattleStatBlockExecutionScopeRef,
    BattleStatBlockPresentationSource
  >();
  for (const admission of executionCohort.admissions) {
    const presentation = wildShapePresentationsByStatBlockId.get(
      admission.statBlock.id,
    );
    if (presentation !== undefined) {
      wildShapePresentations.set(admission.execution.scopeRef, presentation);
    }
  }
  return {
    nextScopeOrdinal: executionCohort.nextScopeOrdinal,
    wildShape: {
      admittedForms: executionCohort.admissions,
      presentations: wildShapePresentations,
    },
  };
}

function admittedWildShapeFormsProjection(
  admission: CharacterWildShapeExecutionAdmission,
): {
  readonly druidWildShapeAvailableForms?: readonly StatBlockExecutionAdmission<BattleDruidWildShapeKnownFormRuntime>[];
} {
  return admission.wildShape === undefined
    ? {}
    : {
        druidWildShapeAvailableForms: admission.wildShape.admittedForms,
      };
}

function wildShapePresentationsProjection(
  admission: CharacterWildShapeExecutionAdmission,
): {
  readonly druidWildShapeFormPresentations?: ReadonlyMap<
    BattleStatBlockExecutionScopeRef,
    BattleStatBlockPresentationSource
  >;
} {
  return admission.wildShape === undefined
    ? {}
    : {
        druidWildShapeFormPresentations: admission.wildShape.presentations,
      };
}

export function battleCreatureStateAdmissionFromInit(
  battleId: BattleId,
  input: BattleCreatureInit,
  startingScopeOrdinal: BattleExecutionScopeOrdinal,
):
  | {
      readonly tag: "admitted";
      readonly creature: CharacterBattleCreatureState;
      readonly nextScopeOrdinal: BattleExecutionScopeOrdinal;
      readonly runtimeContext: CharacterBattleRuntimeContext;
    }
  | {
      readonly tag: "admitted";
      readonly creature: StatBlockBattleCreatureState;
      readonly nextScopeOrdinal: BattleExecutionScopeOrdinal;
      readonly statBlockPresentation: BattleStatBlockPresentationSource;
    }
  | {
      readonly tag: "invalid";
      readonly issues: ReadonlyNonEmptyArray<
        BattleUnitSupportProfileIssue | BattleStateInitLeafIssue
      >;
    } {
  const creatureInit = input.creatureInit;
  const ammunitionIssues = ammunitionStockIssues(creatureInit.ammunitionStocks);
  if (ammunitionIssues.length > 0) {
    const duplicateAmmunitionKinds = creatureInit.ammunitionStocks.flatMap(
      (stock, index, stocks) =>
        stocks
          .slice(0, index)
          .some((previous) => previous.ammunition === stock.ammunition)
          ? [stock.ammunition]
          : [],
    );
    const [firstIssue, ...remainingIssues] = ammunitionIssues;
    const issueForIndex = (message: string, issueIndex: number) => {
      const ammunition = duplicateAmmunitionKinds[issueIndex];
      return {
        tag: "battleStateInitIssue" as const,
        message,
        ...(ammunition === undefined
          ? {}
          : {
              kind: "ammunitionStockInvalid" as const,
              combatantId: input.combatantId,
              ammunition,
            }),
      };
    };
    return {
      tag: "invalid",
      issues: [
        issueForIndex(firstIssue, 0),
        ...remainingIssues.map((message, index) =>
          issueForIndex(message, index + 1),
        ),
      ],
    };
  }
  const maxHp = Match.value(creatureInit).pipe(
    Match.when({ kind: "character" }, ({ maxHp }) => maxHp),
    Match.when({ kind: "statBlock" }, ({ source }) =>
      Hp(source.statBlock.hp.value),
    ),
    Match.exhaustive,
  );
  if (creatureInit.currentHp > maxHp) {
    return {
      tag: "invalid",
      issues: [
        {
          tag: "battleStateInitIssue",
          message: "Battle initialization current HP exceeds max HP.",
          kind: "currentHpExceedsMaximum",
          combatantId: input.combatantId,
          currentHp: creatureInit.currentHp,
          maximumHp: maxHp,
        },
      ],
    };
  }
  const zeroHpLifecycleResult = initialZeroHpLifecycleForCreatureOrigin(
    creatureInit,
    input.combatantId,
  );
  if (Result.isFailure(zeroHpLifecycleResult)) {
    return {
      tag: "invalid",
      issues: [zeroHpLifecycleResult.failure],
    };
  }
  const zeroHpLifecycle = zeroHpLifecycleResult.success;
  const initialConditionImmunityIssue =
    initialConditionImmunityIssueForCreatureInit(
      creatureInit,
      input.combatantId,
    );
  if (initialConditionImmunityIssue !== null) {
    return {
      tag: "invalid",
      issues: [initialConditionImmunityIssue],
    };
  }
  const initialConditions =
    creatureInit.conditions?.reduce(
      (conditions, condition) => applyCondition(conditions, condition),
      EMPTY_CONDITION_STATE,
    ) ?? EMPTY_CONDITION_STATE;
  const base = {
    combatantId: input.combatantId,
    initiative: input.initiative,
    maxHp,
    tempHp: creatureInit.tempHp,
    ...initialKnockOutLifecycleFields(creatureInit, initialConditions),
    activeEffects: [],
    nextEffectOrdinal: battleEffectExecutionOrdinal(0),
    activeOngoingFeatureOccurrences: new Map(),
    attackRollMissToHitReplacementsUsedSinceTurnStart: [],
    concentration: null,
    dodging: false,
    hidden: null,
    zeroHpLifecycle,
    reactionAvailable: true,
    movementSpentFeet: movementFeet(0),
    ammunitionStocks: creatureInit.ammunitionStocks,
  };

  if (isCharacterBattleCreatureInit(input)) {
    const { creatureInit } = input;
    const characterScopeOrdinal = startingScopeOrdinal;
    const attackScopeOrdinal = battleExecutionScopeOrdinal(
      Number(characterScopeOrdinal) + 1,
    );
    const initAttackResult =
      creatureInit.attack === null
        ? Result.succeed(null)
        : characterInitWeaponAttackWithExecutionRefs(
            "main-hand",
            creatureInit.attack,
            creatureInit.selectedLoadout.weapon,
            creatureInit.weaponMasteries,
          );
    const initOffHandAttackResult =
      creatureInit.offHandAttack === undefined
        ? Result.succeed(undefined)
        : characterInitWeaponAttackWithExecutionRefs(
            "off-hand",
            creatureInit.offHandAttack,
            creatureInit.selectedLoadout.offHandWeapon,
            creatureInit.weaponMasteries,
          );
    if (
      Result.isFailure(initAttackResult) ||
      Result.isFailure(initOffHandAttackResult)
    ) {
      const issues = [
        ...(Result.isFailure(initAttackResult)
          ? [initAttackResult.failure]
          : []),
        ...(Result.isFailure(initOffHandAttackResult)
          ? [initOffHandAttackResult.failure]
          : []),
      ];
      const [firstIssue, ...remainingIssues] = issues;
      return {
        tag: "invalid",
        issues: [firstIssue, ...remainingIssues],
      };
    }
    const initAttack = initAttackResult.success;
    const initOffHandAttack = initOffHandAttackResult.success;
    const attackExecution = admitCharacterAttackExecution({
      battleId,
      combatantId: input.combatantId,
      startingScopeOrdinal: attackScopeOrdinal,
      attack: initAttack,
      unarmedStrike: creatureInit.unarmedStrike,
      ...optionalProperty("offHandAttack", initOffHandAttack),
    });
    const wildShapeAdmission = admitCharacterWildShapeExecution(
      battleId,
      input.combatantId,
      creatureInit.druidWildShapeAvailableForms,
      attackExecution.nextScopeOrdinal,
    );
    const parsedClassLevels = parseCharacterBattleClassLevels(
      creatureInit.classLevels,
    );
    if (Result.isFailure(parsedClassLevels)) {
      const [firstMessage, ...remainingMessages] =
        parsedClassLevels.failure.messages;
      return {
        tag: "invalid",
        issues: [
          { tag: "battleUnitSupportProfileIssue", message: firstMessage },
          ...remainingMessages.map((message) => ({
            tag: "battleUnitSupportProfileIssue" as const,
            message,
          })),
        ],
      };
    }
    const classLevels = parsedClassLevels.success;
    const spellAccessUnits = [
      ...(creatureInit.resources ?? []),
      ...(creatureInit.unitFeatures ?? []),
    ];
    const characterUnits = spellAccessUnits.map(({ unit }) => unit);
    const spellcastingAdmission = characterSpellcastingInitAdmission(
      creatureInit,
      classLevels,
      spellAccessUnits,
    );
    const initIssues = [
      characterResourceInitIssue(creatureInit, classLevels),
      characterDruidWildShapeAvailableFormsInitIssue(creatureInit, classLevels),
    ].flatMap((issue) =>
      issue !== null && Result.isFailure(issue) ? [issue.failure] : [],
    );
    const initInvariantIssues = characterBattleInitInvariantIssues(
      input.combatantId,
      creatureInit,
    );
    const initIssuesWithSupportProfile = initIssues.map((issue) => ({
      tag: "battleUnitSupportProfileIssue" as const,
      message: battleStateInitIssueMessage(issue),
    }));
    if (spellcastingAdmission.tag === "invalid") {
      const spellcastingSupportProfileIssue = {
        tag: "battleUnitSupportProfileIssue" as const,
        message: battleStateInitIssueMessage(spellcastingAdmission.issue),
      };
      return {
        tag: "invalid",
        issues: [
          spellcastingSupportProfileIssue,
          ...initIssuesWithSupportProfile,
          ...initInvariantIssues,
        ],
      };
    }
    const allInitIssues = [
      ...initIssuesWithSupportProfile,
      ...initInvariantIssues,
    ];
    if (isNonEmptyReadonlyArray(allInitIssues)) {
      return { tag: "invalid", issues: allInitIssues };
    }
    const explicitFeatureUnitIds = new Set(
      (creatureInit.unitFeatures ?? []).map((feature) => feature.unit.id),
    );
    const execution = characterExecutionFromUnits({
      battleId,
      combatantId: input.combatantId,
      scopeOrdinal: characterScopeOrdinal,
      resourceUnits: (creatureInit.resources ?? []).map(
        (resource) => resource.unit,
      ),
      unitFeatureProfiles: [
        ...(creatureInit.resources ?? []).flatMap((resource) => {
          if (explicitFeatureUnitIds.has(resource.unit.id)) return [];
          const profile = parseSupportedUnitFeatureProfile(
            resource.unit,
            classLevels,
          );
          return profile === null ? [] : [profile];
        }),
        ...(creatureInit.unitFeatures ?? []),
      ],
      units: characterUnits,
      unitRefs: creatureInit.characterUnitRefs,
      classLevels,
    });
    if (Result.isFailure(execution)) {
      return { tag: "invalid", issues: execution.failure };
    }
    const resourceAdmission = admitCharacterBattleResources(
      creatureInit.resources ?? [],
      classLevels,
      execution.success.execution.scopeRef,
    );
    const resources = resourceAdmission.states;
    const resourceOwnership: readonly CharacterBattleResourceOwnership[] =
      resourceAdmission.ownership;
    const metamagic = characterBattleMetamagicState(
      creatureInit.metamagic,
      resources,
      resourceOwnership,
    );
    const spellcastingPresentationSource = Match.value(
      spellcastingAdmission,
    ).pipe(
      Match.when({ tag: "absent" }, () => undefined),
      Match.when({ tag: "admitted" }, ({ state }) =>
        characterSpellcastingState(
          state,
          classLevels,
          resources,
          resourceOwnership,
          execution.success.execution.scopeRef,
        ),
      ),
      Match.exhaustive,
    );
    const admittedCreature = applyInitialZeroHpLifecycle({
      ...base,
      armorClass: creatureInit.armorClass,
      size: creatureInit.size,
      origin: {
        kind: "character",
        characterId: creatureInit.characterId,
        displayName: input.displayName,
        execution: execution.success.execution,
        classLevels,
        knownLanguages: creatureInit.knownLanguages,
        d20Statistics: creatureInit.d20Statistics,
        ...admittedWildShapeFormsProjection(wildShapeAdmission),
        weaponProficiencies: creatureInit.weaponProficiencies ?? [],
        selectedLoadout: creatureInit.selectedLoadout,
        unarmoredArmorClassBases:
          creatureInit.unarmoredArmorClassBases ??
          (() => {
            const base =
              creatureInit.armorClass.base.kind === "ability_sum"
                ? creatureInit.armorClass.base
                : defaultUnarmoredArmorClassBase();
            return { shielded: base, unshielded: base };
          })(),
        invocationFeatures: creatureInit.invocationFeatures ?? [],
        speed: creatureInit.speed,
        attack: attackExecution.execution.attack,
        unarmedStrike: attackExecution.execution.unarmedStrike,
        ...optionalProperty(
          "offHandAttack",
          attackExecution.execution.offHandAttack,
        ),
        resources,
        ...optionalProperty("metamagic", metamagic),
        ...(spellcastingPresentationSource === undefined
          ? {}
          : {
              spellcasting: characterSpellcastingExecutionState(
                spellcastingPresentationSource,
              ),
            }),
      },
    });
    return {
      tag: "admitted",
      creature: admittedCreature,
      nextScopeOrdinal: wildShapeAdmission.nextScopeOrdinal,
      runtimeContext: {
        resourceOwnership,
        ...optionalProperty(
          "spellcastingPresentationSource",
          spellcastingPresentationSource,
        ),
        spellPresentationSources: [],
        unitProcedureOwnership: execution.success.unitProcedureOwnership,
        unitPresentationSources: creatureInit.characterUnitRefs,
        ...wildShapePresentationsProjection(wildShapeAdmission),
      },
    };
  }

  const statBlockCreatureInit = input.creatureInit;
  const admission = admitBattleStatBlockCombatantSource({
    battleId,
    combatantId: input.combatantId,
    source: statBlockCreatureInit.source,
    startingScopeOrdinal,
  });
  if (Result.isFailure(admission)) {
    return {
      tag: "invalid",
      issues: [admission.failure],
    };
  }
  const missingAmmunitionKinds = missingRequiredAmmunitionKinds(
    statBlockAttackActionOptions(admission.success.origin.execution).map(
      (option) => option.attack,
    ),
    statBlockCreatureInit.ammunitionStocks,
  );
  if (isNonEmptyReadonlyArray(missingAmmunitionKinds)) {
    const issueForAmmunition = (ammunition: string) => ({
      tag: "battleStateInitIssue" as const,
      message: `Stat Block battle initialization requires an explicit ${ammunition} ammunition stock.`,
      kind: "ammunitionStockInvalid" as const,
      combatantId: input.combatantId,
      ammunition,
    });
    const [firstAmmunition, ...remainingAmmunition] = missingAmmunitionKinds;
    return {
      tag: "invalid",
      issues: [
        issueForAmmunition(firstAmmunition),
        ...remainingAmmunition.map(issueForAmmunition),
      ],
    };
  }
  const admittedCreature = applyInitialZeroHpLifecycle({
    ...base,
    armorClass: statBlockArmorClassState(
      admission.success.initialization.armorClass,
    ),
    size: admission.success.initialization.size,
    origin: {
      kind: "statBlock",
      ...admission.success.origin,
    },
  });
  return {
    tag: "admitted",
    creature: admittedCreature,
    nextScopeOrdinal: admission.success.cursorTransition.to,
    statBlockPresentation: {
      displayName: input.displayName,
      languages: statBlockLanguagePresentation(creatureInit.source),
      procedures: statBlockProcedurePresentations({
        statBlock: creatureInit.source,
        execution: admission.success.origin.execution,
      }),
    },
  };
}

function initialConditionImmunityIssueForCreatureInit(
  creatureInit: BattleCreatureInit["creatureInit"],
  combatantId: CombatantId,
): BattleStateInitLeafIssue | null {
  return Match.value(creatureInit).pipe(
    Match.when({ kind: "character" }, () => null),
    Match.when({ kind: "statBlock" }, ({ source, conditions }) =>
      statBlockInitialConditionImmunityIssue(source, conditions, combatantId),
    ),
    Match.exhaustive,
  );
}

export type HidePrerequisiteReferenceCombatantsIssue = {
  readonly kind: "unknownCombatant" | "selfReference";
  readonly combatantId: CombatantId;
  readonly referencedCombatantId?: CombatantId;
  readonly issue: BattleStateInitLeafIssue;
};

export function hidePrerequisitesReferenceCombatantsIssues(
  hidePrerequisites: ReadonlyMap<CombatantId, BattleHidePrerequisite>,
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
): readonly HidePrerequisiteReferenceCombatantsIssue[] {
  const issues: HidePrerequisiteReferenceCombatantsIssue[] = [];
  for (const [combatantId, prerequisite] of hidePrerequisites) {
    for (const referencedId of hidePrerequisiteReferencedCombatantIds(
      combatantId,
      prerequisite,
    )) {
      if (!combatants.has(referencedId)) {
        issues.push({
          kind: "unknownCombatant",
          combatantId,
          referencedCombatantId: referencedId,
          issue: {
            tag: "battleStateInitIssue",
            message: "Hide prerequisite references unknown combatant.",
          },
        });
      }
    }
    if (
      prerequisite.kind === "obscuredOnlyByCreatureOutOfEnemyLineOfSight" &&
      prerequisite.obscuringCreatureId === combatantId
    ) {
      issues.push({
        kind: "selfReference",
        combatantId,
        referencedCombatantId: combatantId,
        issue: {
          tag: "battleStateInitIssue",
          message:
            "Creature-obscurement Hide prerequisite cannot name the hiding combatant as the obscuring creature.",
        },
      });
    }
  }
  return issues;
}

export function hidePrerequisitesReferenceCombatantsIssue(
  hidePrerequisites: ReadonlyMap<CombatantId, BattleHidePrerequisite>,
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
): Result.Result<never, BattleStateInitIssue> | null {
  const [firstIssue] = hidePrerequisitesReferenceCombatantsIssues(
    hidePrerequisites,
    combatants,
  );
  return firstIssue === undefined ? null : Result.fail(firstIssue.issue);
}

export function hidePrerequisiteReferencedCombatantIds(
  combatantId: CombatantId,
  prerequisite: BattleHidePrerequisite,
): readonly CombatantId[] {
  return prerequisite.kind === "obscuredOnlyByCreatureOutOfEnemyLineOfSight"
    ? [combatantId, prerequisite.obscuringCreatureId]
    : [combatantId];
}

function characterBattleInitInvariantIssues(
  combatantId: CombatantId,
  creatureInit: CharacterBattleCreatureInit,
): BattleStateInitLeafIssue[] {
  const attacks = [creatureInit.attack, creatureInit.offHandAttack].flatMap(
    (attack) => {
      if (attack === null || attack === undefined) return [];
      return attack.weapon.properties.flatMap((property) =>
        property.kind === "ammunition"
          ? [{ attackType: "ranged" as const, ammunition: property.ammunition }]
          : [],
      );
    },
  );
  return [
    ...missingRequiredAmmunitionKinds(
      attacks,
      creatureInit.ammunitionStocks,
    ).map((ammunition) => ({
      tag: "battleStateInitIssue" as const,
      message: `Character battle initialization requires an explicit ${ammunition} ammunition stock.`,
      kind: "ammunitionStockInvalid" as const,
      combatantId,
      ammunition,
    })),
    ...duplicateCharacterBattleResourceUnitIssues(
      combatantId,
      creatureInit.resources ?? [],
    ),
    ...duplicateCharacterBattleFeatureUnitIssues(
      combatantId,
      creatureInit.unitFeatures ?? [],
    ),
    ...duplicateCharacterBattleWeaponMasteryIssues(
      combatantId,
      creatureInit.weaponMasteries,
    ),
    ...characterBattleLoadoutIssues(creatureInit),
  ];
}

function duplicateCharacterBattleResourceUnitIssues(
  combatantId: CombatantId,
  resources: readonly CharacterBattleResourceInit[],
): BattleStateInitLeafIssue[] {
  const seen = new Set<UnitRecord["id"]>();
  const issues: BattleStateInitLeafIssue[] = [];
  for (const [issueIndex, resource] of resources.entries()) {
    if (seen.has(resource.unit.id)) {
      issues.push({
        tag: "battleStateInitIssue",
        message: `Duplicate character battle resource unit: ${resource.unit.id}`,
        kind: "characterResourceInvalid",
        combatantId,
        issueIndex,
      });
      continue;
    }
    seen.add(resource.unit.id);
  }
  return issues;
}

function duplicateCharacterBattleFeatureUnitIssues(
  combatantId: CombatantId,
  features: readonly CharacterBattleFeatureInit[],
): BattleStateInitLeafIssue[] {
  const seen = new Set<string>();
  const issues: BattleStateInitLeafIssue[] = [];
  for (const [issueIndex, feature] of features.entries()) {
    if (seen.has(feature.unit.id)) {
      issues.push({
        tag: "battleStateInitIssue",
        message: `Duplicate character battle feature unit: ${feature.unit.id}`,
        kind: "characterFeatureInvalid",
        combatantId,
        issueIndex,
      });
      continue;
    }
    seen.add(feature.unit.id);
  }
  return issues;
}

function duplicateCharacterBattleWeaponMasteryIssues(
  combatantId: CombatantId,
  weaponMasteries: readonly CharacterBattleWeaponMasterySelection[],
): BattleStateInitLeafIssue[] {
  const seen = new Set<UnitRecord["id"]>();
  const issues: BattleStateInitLeafIssue[] = [];
  for (const [issueIndex, weaponMastery] of weaponMasteries.entries()) {
    if (seen.has(weaponMastery.weaponUnitId)) {
      issues.push({
        tag: "battleStateInitIssue",
        message: `Duplicate character battle weapon mastery selection: ${weaponMastery.weaponUnitId}`,
        kind: "characterFeatureInvalid",
        combatantId,
        issueIndex,
      });
      continue;
    }
    seen.add(weaponMastery.weaponUnitId);
  }
  return issues;
}

function characterBattleLoadoutIssues(
  creatureInit: CharacterBattleCreatureInit,
): BattleStateInitLeafIssue[] {
  return [
    ...characterBattleLoadoutShieldOffhandIssues(creatureInit),
    ...characterBattleLoadoutTwoHandedGripIssues(creatureInit),
    ...characterBattleLoadoutHandStateIssues(creatureInit),
  ];
}

function characterBattleLoadoutShieldOffhandIssues(
  creatureInit: CharacterBattleCreatureInit,
): BattleStateInitLeafIssue[] {
  const shield = creatureInit.selectedLoadout.shield;
  const offHandWeapon = creatureInit.selectedLoadout.offHandWeapon;
  return shield !== undefined && offHandWeapon !== undefined
    ? [
        {
          tag: "battleStateInitIssue",
          message:
            "Character battle loadout cannot wield shield and off-hand weapon.",
        },
      ]
    : [];
}

function characterBattleLoadoutTwoHandedGripIssues(
  creatureInit: CharacterBattleCreatureInit,
): BattleStateInitLeafIssue[] {
  const shield = creatureInit.selectedLoadout.shield;
  const weapon = creatureInit.selectedLoadout.weapon;
  const offHandWeapon = creatureInit.selectedLoadout.offHandWeapon;
  if (
    weapon?.grip === "two_handed" &&
    (shield !== undefined || offHandWeapon !== undefined)
  ) {
    return [
      {
        tag: "battleStateInitIssue",
        message: "Two-handed weapon grip requires both hands free.",
      },
    ];
  }
  return [];
}

function characterBattleLoadoutHandStateIssues(
  creatureInit: CharacterBattleCreatureInit,
): BattleStateInitLeafIssue[] {
  const shield = creatureInit.selectedLoadout.shield;
  const weapon = creatureInit.selectedLoadout.weapon;
  const offHandWeapon = creatureInit.selectedLoadout.offHandWeapon;
  const expectedLeftHandUse: HandUse =
    shield === undefined
      ? offHandWeapon === undefined
        ? "free"
        : "offWeapon"
      : "shield";
  const expectedRightHandUse: HandUse =
    weapon === undefined ? "free" : "mainWeapon";
  if (
    creatureInit.armorClass.leftHandUse !== expectedLeftHandUse ||
    creatureInit.armorClass.rightHandUse !== expectedRightHandUse
  ) {
    return [
      {
        tag: "battleStateInitIssue",
        message: "Character battle loadout must match armor-class hand state.",
      },
    ];
  }
  return [];
}

export function combatantInitiativeInsertionIndex(
  state: BattleState,
  initiative: InitiativeScore,
  tieOrderIndex?: number,
): number {
  const entries = initiativeEntries(state.initiative);
  const firstLower = entries.findIndex(
    (entry) => entry.initiative < initiative,
  );
  const orderedIndex = firstLower === -1 ? entries.length : firstLower;
  const firstTie = entries.findIndex(
    (entry) => entry.initiative === initiative,
  );
  if (firstTie === -1) return orderedIndex;
  let tieLength = 0;
  while (
    firstTie + tieLength < entries.length &&
    entries[firstTie + tieLength]?.initiative === initiative
  ) {
    tieLength += 1;
  }
  const tieIndex =
    tieOrderIndex === undefined
      ? tieLength
      : Math.max(0, Math.min(tieOrderIndex, tieLength));
  return firstTie + tieIndex;
}

function initialZeroHpLifecycleForCreatureOrigin(
  creatureInit: BattleCreatureInit["creatureInit"],
  combatantId: CombatantId,
): Result.Result<ZeroHpLifecycle, BattleStateInitLeafIssue> {
  return Match.value(creatureInit).pipe(
    Match.when({ kind: "statBlock" }, () =>
      Result.succeed({ policy: "diesAtZeroHp" as const }),
    ),
    Match.when({ kind: "character" }, (characterInit) => {
      const zeroHpLifecycle = characterInit.zeroHpLifecycle ?? {
        policy: "usesDeathSavingThrows" as const,
        deathSaves: resetDeathSaveRuntimeState(),
      };
      if (Number(characterInit.currentHp) > 0) {
        if (characterInit.zeroHpLifecycle !== undefined) {
          return Result.fail({
            tag: "battleStateInitIssue" as const,
            message:
              "Positive-HP character battle initialization cannot carry zero-HP lifecycle state.",
            kind: "zeroHpLifecycleInvalid" as const,
            combatantId,
            requirement: "absentAtPositiveHp" as const,
          });
        }
        return Result.succeed(zeroHpLifecycle);
      }
      if (!validDeathSaveRuntimeState(zeroHpLifecycle.deathSaves)) {
        return Result.fail({
          tag: "battleStateInitIssue" as const,
          message:
            "Character battle initialization zero-HP lifecycle is invalid.",
          kind: "zeroHpLifecycleInvalid" as const,
          combatantId,
          requirement: "validDeathSaves" as const,
        });
      }
      return Result.succeed(zeroHpLifecycle);
    }),
    Match.exhaustive,
  );
}

export function positiveHpUnconsciousInitIssue(
  input: BattleCreatureInit,
): Result.Result<never, BattleStateInitIssue> | null {
  const creatureInit = input.creatureInit;
  if (
    creatureInit.kind !== "character" ||
    creatureInit.positiveHpUnconscious === undefined
  ) {
    return null;
  }
  if (Number(creatureInit.currentHp) !== 1) {
    return Result.fail({
      tag: "battleStateInitIssue" as const,
      message:
        "Knocked Out Unconscious initialization requires exactly 1 current HP.",
      kind: "positiveHpUnconsciousInvalid" as const,
      combatantId: input.combatantId,
      requirement: "oneCurrentHp" as const,
    });
  }
  if (!(creatureInit.conditions ?? []).includes("unconscious")) {
    return Result.fail({
      tag: "battleStateInitIssue" as const,
      message:
        "Knocked Out Unconscious initialization requires the Unconscious condition.",
      kind: "positiveHpUnconsciousInvalid" as const,
      combatantId: input.combatantId,
      requirement: "unconsciousCondition" as const,
    });
  }
  return null;
}

export function characterResourceInitIssue(
  creatureInit: CharacterBattleCreatureInit,
  classLevels: CharacterBattleClassLevels,
): Result.Result<never, BattleStateInitLeafIssue> | null {
  for (const resource of creatureInit.resources ?? []) {
    const issue = characterBattleResourceInitIssue(resource, classLevels);
    if (issue !== null) {
      return battleStateInitIssue(issue);
    }
  }
  const metamagicIssue = characterBattleMetamagicInitIssue({
    metamagic: creatureInit.metamagic,
    resources: creatureInit.resources ?? [],
  });
  if (metamagicIssue !== null) {
    return battleStateInitIssue(metamagicIssue);
  }
  return null;
}

/* v8 ignore start -- @preserve -- Malformed character initialization: admitted Druid Wild Shape state has at most one owning resource and threads only forms accepted by that resource profile. */
export function characterDruidWildShapeAvailableFormsInitIssue(
  creatureInit: CharacterBattleCreatureInit,
  classLevels: CharacterBattleClassLevels,
): Result.Result<never, BattleStateInitLeafIssue> | null {
  const wildShapeProfiles = (creatureInit.resources ?? []).flatMap(
    (resource) => {
      const profile = parseSupportedUnitFeatureProfile(
        resource.unit,
        classLevels,
      );
      return profile?.kind === "druidWildShapeKnownForm" ? [profile] : [];
    },
  );
  if (wildShapeProfiles.length > 1) {
    return battleStateInitIssue(
      "Druid Wild Shape battle initialization supports exactly one Druid Wild Shape resource.",
    );
  }
  const wildShapeProfile = wildShapeProfiles[0] ?? null;
  if (wildShapeProfile === null) {
    return creatureInit.druidWildShapeAvailableForms === undefined
      ? null
      : battleStateInitIssue(
          "Druid Wild Shape available forms require the Druid Wild Shape feature.",
        );
  }
  const issue = druidWildShapeAvailableFormsIssueForProfile(
    creatureInit.druidWildShapeAvailableForms,
    wildShapeProfile,
  );
  return issue === null ? null : battleStateInitIssue(issue);
}
/* v8 ignore stop -- @preserve */

type CharacterSpellcastingInitAdmission =
  | { readonly tag: "absent" }
  | { readonly tag: "invalid"; readonly issue: BattleStateInitLeafIssue }
  | {
      readonly tag: "admitted";
      readonly state: CharacterBattleSpellcastingStateInit;
    };

function characterSpellcastingInitAdmission(
  creatureInit: CharacterBattleCreatureInit,
  classLevels: CharacterBattleClassLevels,
  spellAccessUnits: readonly (
    | CharacterBattleResourceInit
    | CharacterBattleFeatureInit
  )[],
): CharacterSpellcastingInitAdmission {
  const spellcasting = creatureInit.spellcasting;
  if (spellcasting === undefined) {
    return { tag: "absent" };
  }
  const invocationSpellAccesses = parseCharacterBattleInvocationSpellAccesses(
    spellcasting.invocationSpellAccesses,
  );
  if (invocationSpellAccesses.tag === "issue") {
    return {
      tag: "invalid",
      issue: {
        tag: "battleStateInitIssue",
        message: invocationSpellAccesses.message,
      },
    };
  }
  const spellbookRitualAccessIssue =
    characterSpellbookRitualSpellAccessAdmissionIssue(
      creatureInit,
      spellcasting,
    );
  if (spellbookRitualAccessIssue !== null) {
    return {
      tag: "invalid",
      issue: {
        tag: "battleStateInitIssue",
        message: spellbookRitualAccessIssue,
      },
    };
  }
  const spellcastingStateIssue = characterSpellcastingStateInitIssue(
    spellcasting,
    spellAccessUnits,
    creatureInit.characterUnitRefs.flatMap(({ unit }) =>
      "name" in unit && "provenance" in unit ? [unit] : [],
    ),
  );
  if (spellcastingStateIssue !== null) {
    return {
      tag: "invalid",
      issue: {
        tag: "battleStateInitIssue",
        message: spellcastingStateIssue,
      },
    };
  }
  const sourceClassIssue = characterSpellcastingSourceClassIssue(
    spellcasting,
    classLevels,
  );
  if (sourceClassIssue !== null) {
    return {
      tag: "invalid",
      issue: {
        tag: "battleStateInitIssue",
        message: sourceClassIssue,
      },
    };
  }

  return {
    tag: "admitted",
    state: {
      ...spellcasting,
      bookOfShadowsSpellAccesses: spellcasting.bookOfShadowsSpellAccesses ?? [],
      invocationSpellAccesses: invocationSpellAccesses.invocationSpellAccesses,
    },
  };
}

function characterSpellbookRitualSpellAccessAdmissionIssue(
  creatureInit: CharacterBattleCreatureInit,
  spellcasting: NonNullable<CharacterBattleCreatureInit["spellcasting"]>,
): string | null {
  const spellbookRitualAccessIssue =
    characterBattleSpellbookRitualSpellAccessInitIssue(
      spellcasting.spellbookRitualSpellAccesses,
    );
  if (spellbookRitualAccessIssue !== null) {
    return spellbookRitualAccessIssue;
  }
  if (
    spellcasting.spellbookRitualSpellAccesses.length > 0 &&
    (spellcasting.spellcastingSource.tag !== "classSpellcasting" ||
      spellcasting.spellcastingSource.className !== "wizard")
  ) {
    return "Spellbook Ritual Spell Access requires Wizard spellcasting.";
  }
  for (const access of spellcasting.spellbookRitualSpellAccesses) {
    if (
      !creatureInit.characterUnitRefs.some(
        (unitRef) => unitRef.unit.id === access.featureUnitId,
      )
    ) {
      return "Spellbook Ritual Spell Access must trace to an owner feature.";
    }
  }
  return null;
}

function characterSpellcastingSourceClassIssue(
  spellcasting: NonNullable<CharacterBattleCreatureInit["spellcasting"]>,
  classLevels: CharacterBattleClassLevels,
): string | null {
  const source = spellcasting.spellcastingSource;
  return source.tag === "spellAccessOnly" ||
    classLevels.some((classLevel) => classLevel.className === source.className)
    ? null
    : "Battle spellcasting source class must match a character class level.";
}

export function initialKnockOutLifecycleFields(
  creatureInit: BattleCreatureInit["creatureInit"],
  conditions: ConditionState,
): BattleCreatureKnockOutLifecycle {
  if (
    creatureInit.kind === "character" &&
    creatureInit.positiveHpUnconscious !== undefined
  ) {
    return {
      hp: KnockedOutOneHp(creatureInit.currentHp),
      conditions: KnockedOutConditionState(conditions),
      positiveHpUnconscious: creatureInit.positiveHpUnconscious,
    };
  }

  return {
    hp: creatureInit.currentHp,
    conditions,
    positiveHpUnconscious: null,
  };
}

export function combatantKnockedOutUnconscious(
  combatant: BattleCreatureState,
): Result.Result<BattlePositiveHpUnconscious | null, BattleStateInitIssue> {
  if (combatant.positiveHpUnconscious === null) return Result.succeed(null);
  /* v8 ignore start -- @preserve -- Forged-state defense: the BattleCreatureState union couples Knocked Out metadata to branded 1 HP and KnockedOutConditionState, so parsed/constructed states cannot violate this relationship. */
  if (
    Number(combatant.hp) !== 1 ||
    !hasCondition(combatant.conditions, "unconscious")
  ) {
    return battleStateInitIssue(
      "BattleCreatureState invariant violated: Knocked Out Unconscious requires exactly 1 HP and the Unconscious condition.",
    );
  }
  /* v8 ignore stop -- @preserve */
  return Result.succeed(combatant.positiveHpUnconscious);
}
