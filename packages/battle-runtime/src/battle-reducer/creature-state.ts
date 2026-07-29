// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.d20-test-natural-one-reroll
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.druid-wild-shape-known-form unit-feature.enemy-zero-hit-point-temporary-hit-points unit-feature.magic-action-area-save-damage-healing unit-feature.magic-action-healing-pool unit-feature.paladin-sacred-weapon unit-feature.potent-cantrip unit-feature.remarkable-athlete unit-feature.spell-slot-healing-modifier spell.invocation-warding-bond-linked-effect character-sheet.metamagic-battle-resource-bridge
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-slow-active-penalties
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.WILD_SHAPE_FORM_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SLOW_ACTIVE_PENALTIES_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.PROTOCOL.ZERO_HIT_POINT_MID_RESOLUTION
// The 5 small leaf helpers (combatantCanSee, currentActorId, etc.) live in
// creature-state-leaves.ts to break the cluster_state ↔ movement_speed cycle.

import { Either, Match } from "effect";
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
  battleActiveEffectExecutionOrdinal,
  battleExecutionScopeOrdinal,
  type BattleId,
  type BattleExecutionScopeOrdinal,
  type BattleObjectId,
  type CombatantId,
  type InitiativeScore,
} from "../identity.ts";
import type {
  BattleCreatureInit,
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
  characterBattleInvocationSpellAccessInitIssue,
  characterBattleMetamagicInitIssue,
  characterBattleMetamagicState,
  admitCharacterBattleResources,
  characterBattleSpellbookRitualSpellAccessInitIssue,
  characterBattleResourceInitIssue,
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
import { isCharacterBattleCreatureState } from "./creature-state-execution.ts";
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
import { druidWildShapeAvailableFormsIssueForProfile } from "./druid-wild-shape.ts";
import { admitCharacterAttackExecution } from "../attack-execution.ts";
import { admitBattleStatBlockCombatantSource } from "../stat-block-combatant-admission.ts";
import {
  statBlockLanguagePresentation,
  statBlockProcedurePresentations,
} from "../stat-block-presentation.ts";

function isStatBlockBattleCreatureState(
  actor: BattleCreatureState,
): actor is StatBlockBattleCreatureState {
  return actor.origin.kind === "statBlock";
}

function characterInitWeaponAttackExecutionRefs(
  slot: "main-hand" | "off-hand",
  attack: CharacterBattleCreatureInitWeaponAttack,
  loadoutWeapon:
    | { readonly itemId: BattleObjectId; readonly unitId: UnitId }
    | undefined,
  weaponMasteries: readonly CharacterBattleWeaponMasterySelection[],
): Either.Either<
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
  return Either.right({
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
): Either.Either<CharacterWeaponAttackActionOption, BattleStateInitLeafIssue> {
  const refs = characterInitWeaponAttackExecutionRefs(
    slot,
    attack,
    loadoutWeapon,
    weaponMasteries,
  );
  if (Either.isLeft(refs)) {
    return Either.left(refs.left);
  }
  return Either.right({
    ...attack,
    weaponObjectId: refs.right.weaponObjectId,
    hasWeaponMastery: refs.right.hasWeaponMastery,
  });
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
  const maxHp =
    creatureInit.kind === "character"
      ? creatureInit.maxHp
      : Hp(creatureInit.source.statBlock.hp.value);
  if (creatureInit.currentHp > maxHp) {
    return {
      tag: "invalid",
      issues: [
        {
          tag: "battleStateInitIssue",
          message: "Battle initialization current HP exceeds max HP.",
        },
      ],
    };
  }
  const zeroHpLifecycle = initialZeroHpLifecycleForCreatureOrigin(creatureInit);
  const initialConditions =
    creatureInit.kind === "character"
      ? (creatureInit.conditions?.reduce(
          (conditions, condition) => applyCondition(conditions, condition),
          EMPTY_CONDITION_STATE,
        ) ?? EMPTY_CONDITION_STATE)
      : EMPTY_CONDITION_STATE;
  const base = {
    combatantId: input.combatantId,
    initiative: input.initiative,
    maxHp,
    tempHp: creatureInit.tempHp,
    ...initialKnockOutLifecycleFields(creatureInit, initialConditions),
    activeEffects: [],
    nextActiveEffectOrdinal: battleActiveEffectExecutionOrdinal(0),
    activeOngoingFeatureOccurrences: new Map(),
    attackRollMissToHitReplacementsUsedSinceTurnStart: [],
    concentration: null,
    dodging: false,
    hidden: null,
    zeroHpLifecycle,
    reactionAvailable: true,
    movementSpentFeet: movementFeet(0),
  };

  if (creatureInit.kind === "character") {
    const characterScopeOrdinal = startingScopeOrdinal;
    const attackScopeOrdinal = battleExecutionScopeOrdinal(
      Number(characterScopeOrdinal) + 1,
    );
    const initAttackEither =
      creatureInit.attack === null
        ? Either.right(null)
        : characterInitWeaponAttackWithExecutionRefs(
            "main-hand",
            creatureInit.attack,
            creatureInit.selectedLoadout.weapon,
            creatureInit.weaponMasteries,
          );
    const initOffHandAttackEither =
      creatureInit.offHandAttack === undefined
        ? Either.right(undefined)
        : characterInitWeaponAttackWithExecutionRefs(
            "off-hand",
            creatureInit.offHandAttack,
            creatureInit.selectedLoadout.offHandWeapon,
            creatureInit.weaponMasteries,
          );
    if (
      Either.isLeft(initAttackEither) ||
      Either.isLeft(initOffHandAttackEither)
    ) {
      const issues = [
        ...(Either.isLeft(initAttackEither) ? [initAttackEither.left] : []),
        ...(Either.isLeft(initOffHandAttackEither)
          ? [initOffHandAttackEither.left]
          : []),
      ];
      const [firstIssue, ...remainingIssues] = issues;
      return {
        tag: "invalid",
        issues: [firstIssue, ...remainingIssues],
      };
    }
    const initAttack = initAttackEither.right;
    const initOffHandAttack = initOffHandAttackEither.right;
    const attackExecution = admitCharacterAttackExecution({
      battleId,
      combatantId: input.combatantId,
      startingScopeOrdinal: attackScopeOrdinal,
      attack: initAttack,
      unarmedStrike: creatureInit.unarmedStrike,
      ...(initOffHandAttack === undefined
        ? {}
        : { offHandAttack: initOffHandAttack }),
    });
    const executionCohort = statBlockExecutionAdmissionCohort(
      battleId,
      input.combatantId,
      creatureInit.druidWildShapeAvailableForms ?? [],
      attackExecution.nextScopeOrdinal,
    );
    const parsedClassLevels = parseCharacterBattleClassLevels(
      creatureInit.classLevels,
    );
    if (Either.isLeft(parsedClassLevels)) {
      const [firstMessage, ...remainingMessages] =
        parsedClassLevels.left.messages;
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
    const classLevels = parsedClassLevels.right;
    const initIssues = [
      characterResourceInitIssue(creatureInit, classLevels),
      characterDruidWildShapeAvailableFormsInitIssue(creatureInit, classLevels),
      characterSpellcastingInitIssue(creatureInit, classLevels),
    ].flatMap((issue) =>
      issue !== null && Either.isLeft(issue) ? [issue.left] : [],
    );
    if (initIssues.length > 0) {
      const [firstIssue, ...remainingIssues] = initIssues;
      return {
        tag: "invalid",
        issues: [
          {
            tag: "battleUnitSupportProfileIssue",
            message: battleStateInitIssueMessage(firstIssue!),
          },
          ...remainingIssues.map((issue) => ({
            tag: "battleUnitSupportProfileIssue" as const,
            message: battleStateInitIssueMessage(issue),
          })),
        ],
      };
    }
    assertCharacterBattleLoadoutMatchesHands(creatureInit);
    assertCharacterBattleResourcesHaveUniqueUnits(creatureInit.resources ?? []);
    assertCharacterBattleFeaturesHaveUniqueUnits(
      creatureInit.unitFeatures ?? [],
    );
    assertCharacterBattleWeaponMasteriesHaveUniqueWeapons(
      creatureInit.weaponMasteries,
    );
    const characterUnits = [
      ...(creatureInit.resources ?? []).map((resource) => resource.unit),
      ...(creatureInit.unitFeatures ?? []).map((feature) => feature.unit),
    ];
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
    if (Either.isLeft(execution)) {
      return { tag: "invalid", issues: execution.left };
    }
    const resourceAdmission = admitCharacterBattleResources(
      creatureInit.resources ?? [],
      classLevels,
      execution.right.execution.scopeRef,
    );
    const resources = resourceAdmission.states;
    const resourceOwnership: readonly CharacterBattleResourceOwnership[] =
      resourceAdmission.ownership;
    const metamagic = characterBattleMetamagicState(
      creatureInit.metamagic,
      resources,
      resourceOwnership,
    );
    const spellcastingPresentationSource =
      creatureInit.spellcasting === undefined
        ? undefined
        : characterSpellcastingState(
            requireCharacterSpellcastingStateInit(creatureInit.spellcasting),
            classLevels,
            [
              ...(creatureInit.resources ?? []),
              ...(creatureInit.unitFeatures ?? []),
            ],
            resources,
            resourceOwnership,
          );
    const admittedCreature = applyInitialZeroHpLifecycle({
      ...base,
      armorClass: creatureInit.armorClass,
      size: creatureInit.size,
      origin: {
        kind: "character",
        characterId: creatureInit.characterId,
        displayName: input.displayName,
        execution: execution.right.execution,
        classLevels,
        knownLanguages: creatureInit.knownLanguages,
        d20Statistics: creatureInit.d20Statistics,
        ...(creatureInit.druidWildShapeAvailableForms === undefined
          ? {}
          : {
              druidWildShapeAvailableForms: executionCohort.admissions,
            }),
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
        ...(attackExecution.execution.offHandAttack === undefined
          ? {}
          : { offHandAttack: attackExecution.execution.offHandAttack }),
        resources,
        ...(metamagic === undefined ? {} : { metamagic }),
        ...(spellcastingPresentationSource === undefined
          ? {}
          : {
              spellcasting: characterSpellcastingExecutionState(
                spellcastingPresentationSource,
              ),
            }),
      },
    });
    if (!isCharacterBattleCreatureState(admittedCreature)) {
      throw new Error(
        "Character initialization constructed a non-character battle creature.",
      );
    }
    return {
      tag: "admitted",
      creature: admittedCreature,
      nextScopeOrdinal: executionCohort.nextScopeOrdinal,
      runtimeContext: {
        resourceOwnership,
        ...(spellcastingPresentationSource === undefined
          ? {}
          : { spellcastingPresentationSource }),
        spellPresentationSources: [],
        unitProcedureOwnership: execution.right.unitProcedureOwnership,
        unitPresentationSources: creatureInit.characterUnitRefs,
      },
    };
  }

  const admission = admitBattleStatBlockCombatantSource({
    battleId,
    combatantId: input.combatantId,
    source: creatureInit.source,
    startingScopeOrdinal,
  });
  if (Either.isLeft(admission)) {
    return {
      tag: "invalid",
      issues: [admission.left],
    };
  }
  const admittedCreature = applyInitialZeroHpLifecycle({
    ...base,
    armorClass: statBlockArmorClassState(
      admission.right.initialization.armorClass,
    ),
    size: admission.right.initialization.size,
    origin: {
      kind: "statBlock",
      ...admission.right.origin,
    },
  });
  if (!isStatBlockBattleCreatureState(admittedCreature)) {
    throw new Error(
      "Stat Block initialization constructed a non-Stat-Block battle creature.",
    );
  }
  return {
    tag: "admitted",
    creature: admittedCreature,
    nextScopeOrdinal: admission.right.cursorTransition.to,
    statBlockPresentation: {
      displayName: input.displayName,
      languages: statBlockLanguagePresentation(creatureInit.source),
      procedures: statBlockProcedurePresentations({
        statBlock: creatureInit.source,
        execution: admission.right.origin.execution,
      }),
    },
  };
}

export function hidePrerequisitesReferenceCombatantsIssue(
  hidePrerequisites: ReadonlyMap<CombatantId, BattleHidePrerequisite>,
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
): Either.Either<never, BattleStateInitIssue> | null {
  for (const [combatantId, prerequisite] of hidePrerequisites) {
    for (const referencedId of hidePrerequisiteReferencedCombatantIds(
      combatantId,
      prerequisite,
    )) {
      if (!combatants.has(referencedId)) {
        return battleStateInitIssue(
          "Hide prerequisite references unknown combatant.",
        );
      }
    }
    if (
      prerequisite.kind === "obscuredOnlyByCreatureOutOfEnemyLineOfSight" &&
      prerequisite.obscuringCreatureId === combatantId
    ) {
      return battleStateInitIssue(
        "Creature-obscurement Hide prerequisite cannot name the hiding combatant as the obscuring creature.",
      );
    }
  }
  return null;
}

export function hidePrerequisiteReferencedCombatantIds(
  combatantId: CombatantId,
  prerequisite: BattleHidePrerequisite,
): readonly CombatantId[] {
  return prerequisite.kind === "obscuredOnlyByCreatureOutOfEnemyLineOfSight"
    ? [combatantId, prerequisite.obscuringCreatureId]
    : [combatantId];
}

export function assertCharacterBattleResourcesHaveUniqueUnits(
  resources: readonly CharacterBattleResourceInit[],
): void {
  const seen = new Set<UnitRecord["id"]>();
  for (const resource of resources) {
    if (seen.has(resource.unit.id)) {
      throw new Error(
        `Duplicate character battle resource unit: ${resource.unit.id}`,
      );
    }
    seen.add(resource.unit.id);
  }
}

export function assertCharacterBattleFeaturesHaveUniqueUnits(
  features: readonly CharacterBattleFeatureInit[],
): void {
  const seen = new Set<string>();
  for (const feature of features) {
    if (seen.has(feature.unit.id)) {
      throw new Error(
        `Duplicate character battle feature unit: ${feature.unit.id}`,
      );
    }
    seen.add(feature.unit.id);
  }
}

export function assertCharacterBattleWeaponMasteriesHaveUniqueWeapons(
  weaponMasteries: readonly CharacterBattleWeaponMasterySelection[],
): void {
  const seen = new Set<UnitRecord["id"]>();
  for (const weaponMastery of weaponMasteries) {
    if (seen.has(weaponMastery.weaponUnitId)) {
      throw new Error(
        `Duplicate character battle weapon mastery selection: ${weaponMastery.weaponUnitId}`,
      );
    }
    seen.add(weaponMastery.weaponUnitId);
  }
}

export function assertCharacterBattleLoadoutMatchesHands(
  creatureInit: CharacterBattleCreatureInit,
): void {
  const shield = creatureInit.selectedLoadout.shield;
  const weapon = creatureInit.selectedLoadout.weapon;
  const offHandWeapon = creatureInit.selectedLoadout.offHandWeapon;
  if (shield !== undefined && offHandWeapon !== undefined) {
    throw new Error(
      "Character battle loadout cannot wield shield and off-hand weapon.",
    );
  }
  if (
    weapon?.grip === "two_handed" &&
    (shield !== undefined || offHandWeapon !== undefined)
  ) {
    throw new Error("Two-handed weapon grip requires both hands free.");
  }
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
    throw new Error(
      "Character battle loadout must match armor-class hand state.",
    );
  }
  if (weapon?.grip === "two_handed") {
    return;
  }
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

export function initialZeroHpLifecycleForCreatureOrigin(
  creatureInit: BattleCreatureInit["creatureInit"],
): ZeroHpLifecycle {
  return Match.value(creatureInit).pipe(
    Match.when({ kind: "statBlock" }, () => ({
      policy: "diesAtZeroHp" as const,
    })),
    Match.when({ kind: "character" }, (characterInit) => {
      const zeroHpLifecycle = characterInit.zeroHpLifecycle ?? {
        policy: "usesDeathSavingThrows" as const,
        deathSaves: resetDeathSaveRuntimeState(),
      };
      if (Number(characterInit.currentHp) > 0) {
        if (characterInit.zeroHpLifecycle !== undefined) {
          throw new Error(
            "Positive-HP character battle initialization cannot carry zero-HP lifecycle state.",
          );
        }
        return zeroHpLifecycle;
      }
      if (!validDeathSaveRuntimeState(zeroHpLifecycle.deathSaves)) {
        throw new Error(
          "Character battle initialization zero-HP lifecycle is invalid.",
        );
      }
      return zeroHpLifecycle;
    }),
    Match.exhaustive,
  );
}

export function positiveHpUnconsciousInitIssue(
  input: BattleCreatureInit,
): Either.Either<never, BattleStateInitIssue> | null {
  const creatureInit = input.creatureInit;
  if (
    creatureInit.kind !== "character" ||
    creatureInit.positiveHpUnconscious === undefined
  ) {
    return null;
  }
  if (Number(creatureInit.currentHp) !== 1) {
    return battleStateInitIssue(
      "Knocked Out Unconscious initialization requires exactly 1 current HP.",
    );
  }
  if (!(creatureInit.conditions ?? []).includes("unconscious")) {
    return battleStateInitIssue(
      "Knocked Out Unconscious initialization requires the Unconscious condition.",
    );
  }
  return null;
}

export function characterResourceInitIssue(
  creatureInit: CharacterBattleCreatureInit,
  classLevels: CharacterBattleClassLevels,
): Either.Either<never, BattleStateInitLeafIssue> | null {
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

export function characterDruidWildShapeAvailableFormsInitIssue(
  creatureInit: CharacterBattleCreatureInit,
  classLevels: CharacterBattleClassLevels,
): Either.Either<never, BattleStateInitLeafIssue> | null {
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

export function characterSpellcastingInitIssue(
  creatureInit: CharacterBattleCreatureInit,
  classLevels: CharacterBattleClassLevels,
): Either.Either<never, BattleStateInitLeafIssue> | null {
  if (creatureInit.spellcasting === undefined) {
    return null;
  }
  const invocationSpellAccessIssue =
    characterBattleInvocationSpellAccessInitIssue(
      creatureInit.spellcasting.invocationSpellAccesses,
    );
  if (invocationSpellAccessIssue !== null) {
    return battleStateInitIssue(invocationSpellAccessIssue);
  }
  const spellbookRitualAccessIssue =
    characterBattleSpellbookRitualSpellAccessInitIssue(
      creatureInit.spellcasting.spellbookRitualSpellAccesses,
    );
  if (spellbookRitualAccessIssue !== null) {
    return battleStateInitIssue(spellbookRitualAccessIssue);
  }
  if (
    creatureInit.spellcasting.spellbookRitualSpellAccesses.length > 0 &&
    creatureInit.spellcasting.sourceClassName !== "wizard"
  ) {
    return battleStateInitIssue(
      "Spellbook Ritual Spell Access requires Wizard spellcasting.",
    );
  }
  for (const access of creatureInit.spellcasting.spellbookRitualSpellAccesses) {
    if (
      !creatureInit.characterUnitRefs.some(
        (unitRef) => unitRef.unit.id === access.featureUnitId,
      )
    ) {
      return battleStateInitIssue(
        "Spellbook Ritual Spell Access must trace to an owner feature.",
      );
    }
  }
  return classLevels.some(
    (classLevel) =>
      classLevel.className === creatureInit.spellcasting?.sourceClassName,
  )
    ? null
    : battleStateInitIssue(
        "Battle spellcasting source class must match a character class level.",
      );
}

function requireCharacterSpellcastingStateInit(
  spellcasting: NonNullable<CharacterBattleCreatureInit["spellcasting"]>,
): CharacterBattleSpellcastingStateInit {
  const invocationSpellAccesses = parseCharacterBattleInvocationSpellAccesses(
    spellcasting.invocationSpellAccesses,
  );
  if (invocationSpellAccesses.tag === "issue") {
    throw new Error(invocationSpellAccesses.message);
  }
  return {
    ...spellcasting,
    bookOfShadowsSpellAccesses: spellcasting.bookOfShadowsSpellAccesses ?? [],
    invocationSpellAccesses: invocationSpellAccesses.invocationSpellAccesses,
  };
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
): Either.Either<BattlePositiveHpUnconscious | null, BattleStateInitIssue> {
  if (combatant.positiveHpUnconscious === null) return Either.right(null);
  if (
    Number(combatant.hp) !== 1 ||
    !hasCondition(combatant.conditions, "unconscious")
  ) {
    return battleStateInitIssue(
      "BattleCreatureState invariant violated: Knocked Out Unconscious requires exactly 1 HP and the Unconscious condition.",
    );
  }
  return Either.right(combatant.positiveHpUnconscious);
}
