// Creature state init/snapshot/lifecycle helpers extracted from
// battle-reducer.ts. Cluster G (creature_state). Mechanical extraction —
// no behavior change. Pass 8 also absorbed:
//   - `assertCurrentHpWithinMaxHp` (cycle #9)
//   - `isCharacterBattleCreatureState` (cycle #16)
//   - `ongoingFeatureSourceKey`, `ongoingFeatureSourceForUnit`,
//     `ongoingFeatureSourceKeyForUnit` (cycle #18)
//
// The 5 small leaf helpers (combatantCanSee, currentActorId, etc.) live in
// creature-state-leaves.ts to break the cluster_state ↔ movement_speed cycle.

import { Either, Match } from "effect";
import { Hp, movementFeet, type Condition } from "@dnd/shared/types";
import type { HandUse } from "@dnd/shared/types";
import {
  applyCondition,
  EMPTY_CONDITION_STATE,
  hasCondition,
  isIncapacitated,
} from "@dnd/shared-algebras/conditions-algebra";
import type { ConditionState } from "@dnd/shared-algebras/conditions-algebra";
import {
  armorClass,
  armorClassDelta,
  currentArmorClass,
  statBlockArmorClassState,
} from "@dnd/shared-algebras/armor-class-algebra";
import type { ArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import {
  resetDeathSaveRuntimeState,
  validDeathSaveRuntimeState,
} from "@dnd/shared-algebras/death-saves-algebra";
import { initiativeEntries } from "@dnd/shared-algebras/initiative-algebra";
import { CONDITIONS as ALL_CONDITIONS } from "@dnd/shared/types";
import type {
  StatBlockRecord,
  StatBlockValue,
  Size,
  UnitRecord,
} from "@dnd/surface/surface/types";
import type { ZeroHpLifecycle } from "../zero-hp-lifecycle.ts";
import type { CombatantId, InitiativeScore } from "../identity.ts";
import type {
  BattleCreatureInit,
  BattlePositiveHpUnconscious,
  BattleUnitRef,
  CharacterBattleCreatureInit,
} from "../battle-init.ts";
import {
  characterBattleInvocationSpellAccessInitIssue,
  characterBattleSpellbookRitualSpellAccessInitIssue,
  characterBattleResourceInitIssue,
  characterBattleResourceUsage,
  characterResourceState,
  characterSpellcastingState,
  parseCharacterBattleInvocationSpellAccesses,
  parseCharacterBattleClassLevels,
  type CharacterBattleFeatureInit,
  type CharacterBattleResourceInit,
  type CharacterBattleResourceState,
  type CharacterBattleSpellcastingStateInit,
} from "../character-battle-resources.ts";
import type { CharacterBattleClassLevel } from "../character-class-level.ts";
import {
  ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE,
  ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SUPPORT_PROFILE,
  FAILED_ABILITY_CHECK_RESOURCE_BOOST_SUPPORT_PROFILE,
  PASSIVE_SAVING_THROW_ROLL_MODE_SUPPORT_PROFILE,
  REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE,
  SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE,
  parseSupportedUnitFeatureProfile,
  type BattleUnitSupportProfile,
  type SupportedUnitFeatureProfile,
} from "../unit-feature-support.ts";
import type { BattleSubject } from "../battle-subjects.ts";
import {
  KnockedOutOneHp,
  KnockedOutConditionState,
  OngoingFeatureSourceKey as OngoingFeatureSourceKeyBrand,
  zeroHpLifecycleIsTerminal,
  type ActiveOngoingFeatureOccurrence,
  type BattleCharacterResourceSnapshot,
  type BattleCreatureKnockOutLifecycle,
  type BattleCreatureOriginSnapshot,
  type BattleCreatureSnapshot,
  type BattleCreatureState,
  type BattleCreatureZeroHpLifecycleSnapshot,
  type BattleHidePrerequisite,
  type BattleState,
  type BattleStateInitIssue,
  type CharacterBattleCreatureState,
  type HpDamageProjection,
  type KnockedOutConditionState as KnockedOutConditionStateT,
  type KnockedOutOneHp as KnockedOutOneHpT,
  type OngoingFeatureSource,
  type OngoingFeatureSourceKey,
} from "../battle-reducer.ts";
import { battleStateInitIssue } from "./domain-helpers.ts";
import {
  applyInitialZeroHpLifecycle,
  effectiveHitPointMaximum,
} from "./damage-apply.ts";
import { battleMovementBudgetForActor } from "./movement-speed.ts";
import {
  combatantInvisibleBenefitDenied,
  combatantWearingArmorCategory,
  currentActorId,
  grappledBy,
} from "./creature-state-leaves.ts";
import {
  statBlockResourceSnapshot,
  statBlockResourceState,
} from "./statblock.ts";

export function ongoingFeatureSourceKey(
  source: OngoingFeatureSource,
): OngoingFeatureSourceKey {
  return OngoingFeatureSourceKeyBrand(source.unitId);
}

export function ongoingFeatureSourceForUnit(
  unitId: UnitRecord["id"],
): OngoingFeatureSource {
  return { kind: "unit", unitId };
}

export function ongoingFeatureSourceKeyForUnit(
  unitId: UnitRecord["id"],
): OngoingFeatureSourceKey {
  return ongoingFeatureSourceKey(ongoingFeatureSourceForUnit(unitId));
}

export function assertCurrentHpWithinMaxHp(
  creatureInit: BattleCreatureInit["creatureInit"],
): void {
  if (creatureInit.currentHp > creatureInit.maxHp) {
    throw new Error("Battle initialization current HP exceeds max HP.");
  }
}

export function isCharacterBattleCreatureState(
  actor: BattleCreatureState | undefined,
): actor is CharacterBattleCreatureState {
  return actor?.origin.kind === "character";
}

export function battleCreatureStateFromInit(
  input: BattleCreatureInit,
): BattleCreatureState {
  const creatureInit = input.creatureInit;
  assertCurrentHpWithinMaxHp(creatureInit);
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
    displayName: input.displayName,
    initiative: input.initiative,
    side: input.side,
    maxHp: creatureInit.maxHp,
    tempHp: creatureInit.tempHp,
    ...initialKnockOutLifecycleFields(creatureInit, initialConditions),
    activeEffects: [],
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
    const classLevels = parseCharacterBattleClassLevels(
      creatureInit.classLevels,
    );
    assertCharacterBattleLoadoutMatchesHands(creatureInit);
    assertCharacterBattleResourcesHaveUniqueUnits(creatureInit.resources ?? []);
    assertCharacterBattleFeaturesHaveUniqueUnits(
      creatureInit.unitFeatures ?? [],
    );
    assertCharacterBattleWeaponMasteriesHaveUniqueWeapons(
      creatureInit.weaponMasteries ?? [],
    );
    return applyInitialZeroHpLifecycle({
      ...base,
      armorClass: creatureInit.armorClass,
      size: creatureInit.size,
      origin: {
        kind: "character",
        characterId: creatureInit.characterId,
        characterUnitRefs: creatureInit.characterUnitRefs,
        classLevels,
        weaponProficiencies: creatureInit.weaponProficiencies ?? [],
        selectedLoadout: creatureInit.selectedLoadout,
        weaponMasteries: creatureInit.weaponMasteries ?? [],
        invocationFeatures: creatureInit.invocationFeatures ?? [],
        speed: creatureInit.speed,
        attack: creatureInit.attack,
        unarmedStrike: creatureInit.unarmedStrike,
        ...(creatureInit.offHandAttack === undefined
          ? {}
          : { offHandAttack: creatureInit.offHandAttack }),
        resources: (creatureInit.resources ?? []).map((resource) =>
          characterResourceState(resource, classLevels),
        ),
        ongoingFeatureProfiles: characterOngoingFeatureProfiles(
          creatureInit.resources ?? [],
          creatureInit.unitFeatures ?? [],
          classLevels,
        ),
        attackDamageRiderProfiles: characterAttackDamageRiderProfiles(
          creatureInit.resources ?? [],
          creatureInit.unitFeatures ?? [],
          creatureInit.characterUnitRefs,
          classLevels,
        ),
        saveDamageReplacementProfiles: characterSaveDamageReplacementProfiles(
          creatureInit.resources ?? [],
          creatureInit.unitFeatures ?? [],
          creatureInit.characterUnitRefs,
          classLevels,
        ),
        passiveSavingThrowRollModeProfiles:
          characterPassiveSavingThrowRollModeProfiles(
            creatureInit.resources ?? [],
            creatureInit.unitFeatures ?? [],
            creatureInit.characterUnitRefs,
            classLevels,
          ),
        reactionRollOrDamageReductionProfiles:
          characterReactionRollOrDamageReductionProfiles(
            creatureInit.resources ?? [],
            creatureInit.unitFeatures ?? [],
            creatureInit.characterUnitRefs,
            classLevels,
          ),
        failedAbilityCheckResourceBoostProfiles:
          characterFailedAbilityCheckResourceBoostProfiles(
            creatureInit.resources ?? [],
            creatureInit.unitFeatures ?? [],
            creatureInit.characterUnitRefs,
            classLevels,
          ),
        ...(creatureInit.spellcasting === undefined
          ? {}
          : {
              spellcasting: characterSpellcastingState(
                requireCharacterSpellcastingStateInit(
                  creatureInit.spellcasting,
                ),
                classLevels,
                [
                  ...(creatureInit.resources ?? []),
                  ...(creatureInit.unitFeatures ?? []),
                ],
              ),
            }),
      },
    });
  }

  return applyInitialZeroHpLifecycle({
    ...base,
    armorClass: statBlockArmorClassState(
      literalStatBlockNumber(creatureInit.statBlock.statBlock.ac),
    ),
    size: literalCreatureSize(creatureInit.statBlock.statBlock.size),
    origin: {
      kind: "statBlock",
      statBlock: creatureInit.statBlock,
      resources: statBlockResourceState(creatureInit.statBlock.statBlock),
    },
  });
}

export function hidePrerequisitesReferenceCombatantsIssue(
  hidePrerequisites: ReadonlyMap<CombatantId, BattleHidePrerequisite>,
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
): Either.Either<never, BattleStateInitIssue> | null {
  for (const combatantId of hidePrerequisites.keys()) {
    if (!combatants.has(combatantId)) {
      return battleStateInitIssue(
        "Hide prerequisite references unknown combatant.",
      );
    }
  }
  return null;
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
  weaponMasteries: readonly NonNullable<
    CharacterBattleCreatureInit["weaponMasteries"]
  >[number][],
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

export function literalCreatureSize(
  creatureSize: StatBlockRecord["statBlock"]["size"],
): Size {
  if (typeof creatureSize !== "string") {
    throw new Error("Battle runtime requires a concrete creature Size.");
  }
  return creatureSize;
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

export function activeOngoingFeatureOccurrencesForCombatant(
  combatant: BattleCreatureState,
): ReadonlyMap<OngoingFeatureSourceKey, ActiveOngoingFeatureOccurrence> {
  return new Map(
    [...combatant.activeOngoingFeatureOccurrences].filter(([key]) => {
      const profile = ongoingFeatureProfileForSourceKey(combatant, key);
      return (
        profile !== null &&
        !profile.lifecycle.earlyEndConditions.some((condition) =>
          hasCondition(combatant.conditions, condition),
        ) &&
        !profile.lifecycle.earlyEndArmorCategories.some((category) =>
          combatantWearingArmorCategory(combatant, category),
        )
      );
    }),
  );
}

export function ongoingFeatureProfileForSourceKey(
  combatant: BattleCreatureState,
  key: OngoingFeatureSourceKey,
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "ongoingFeature" }
> | null {
  if (!isCharacterBattleCreatureState(combatant)) {
    return null;
  }
  return combatant.origin.ongoingFeatureProfiles.get(key) ?? null;
}

export function normalizeEarlyEndedOngoingFeatures(
  state: BattleState,
): BattleState {
  const combatants = new Map<CombatantId, BattleCreatureState>();
  let changed = false;
  for (const [id, combatant] of state.combatants) {
    const activeOngoingFeatureOccurrences =
      activeOngoingFeatureOccurrencesForCombatant(combatant);
    const activeEffects =
      activeEffectsWithoutDetachedWeaponAttackOverrides(combatant);
    if (
      activeOngoingFeatureOccurrences.size !==
        combatant.activeOngoingFeatureOccurrences.size ||
      activeEffects.length !== combatant.activeEffects.length
    ) {
      changed = true;
      combatants.set(id, {
        ...combatant,
        activeEffects,
        activeOngoingFeatureOccurrences,
      });
    } else {
      combatants.set(id, combatant);
    }
  }
  return changed ? { ...state, combatants } : state;
}

function activeEffectsWithoutDetachedWeaponAttackOverrides(
  combatant: BattleCreatureState,
): BattleCreatureState["activeEffects"] {
  if (combatant.origin.kind !== "character") {
    return combatant.activeEffects;
  }
  const heldWeaponItemIds = new Set([
    combatant.origin.selectedLoadout.weapon?.itemId,
    combatant.origin.selectedLoadout.offHandWeapon?.itemId,
  ]);
  return combatant.activeEffects.filter(
    (effect) =>
      effect.kind !== "spellWeaponAttackOverride" ||
      heldWeaponItemIds.has(effect.weaponItemId),
  );
}

export function combatantSnapshot(
  state: BattleState,
  combatant: BattleCreatureState,
): BattleCreatureSnapshot {
  const sourceGrapple = grappledBy(state, combatant.combatantId) ?? null;
  return {
    combatantId: combatant.combatantId,
    displayName: combatant.displayName,
    initiative: combatant.initiative,
    side: combatant.side,
    origin: combatantOriginSnapshot(combatant),
    hp: combatant.hp,
    maxHp: effectiveHitPointMaximum(combatant),
    tempHp: combatant.tempHp,
    armorClass: currentArmorClass(activeEffectArmorClass(combatant)),
    size: combatant.size,
    zeroHpLifecycle: combatantZeroHpLifecycleSnapshot(combatant),
    conditions: activeConditions(
      combatant.conditions,
      sourceGrapple !== null,
      combatant.hidden !== null && !combatantInvisibleBenefitDenied(combatant),
    ),
    concentrating: combatant.concentration !== null,
    dodging: combatant.dodging,
    reactionAvailable: combatant.reactionAvailable,
    movement: battleMovementBudgetForActor(state, combatant.combatantId),
  };
}

export function combatantOriginSnapshot(
  combatant: BattleCreatureState,
): BattleCreatureOriginSnapshot {
  return Match.value(combatant.origin).pipe(
    Match.when({ kind: "character" }, (origin) => ({
      kind: "character" as const,
      characterId: origin.characterId,
      resources: origin.resources.map(characterResourceSnapshot),
      spellcasting:
        origin.spellcasting === undefined
          ? null
          : { spellSlots: origin.spellcasting.spellSlots },
    })),
    Match.when({ kind: "statBlock" }, (origin) => ({
      kind: "statBlock" as const,
      statBlockId: origin.statBlock.id,
      resources: statBlockResourceSnapshot(
        origin.statBlock.statBlock,
        origin.resources,
      ),
    })),
    Match.exhaustive,
  );
}

export function characterResourceSnapshot(
  resource: CharacterBattleResourceState,
): BattleCharacterResourceSnapshot {
  const common = {
    unitId: resource.unit.id,
    usedThisTurn: resource.usedThisTurn,
  };
  const usage = characterBattleResourceUsage(resource);
  const usesRemaining =
    "usesRemaining" in resource ? resource.usesRemaining : undefined;
  if (usage === "unlimited" || usesRemaining === undefined) {
    return {
      ...common,
      usage: "unlimited",
    };
  }
  return {
    ...common,
    usage: "limited",
    usesRemaining,
  };
}

export function activeEffectArmorClass(
  combatant: BattleCreatureState,
): ArmorClassState {
  const baseArmorClassEffect = combatant.activeEffects.find(
    (effect) => effect.kind === "spellBaseArmorClass",
  );
  const withBase =
    baseArmorClassEffect === undefined ||
    combatant.armorClass.base.kind === "armor"
      ? combatant.armorClass
      : {
          ...combatant.armorClass,
          base: {
            kind: "ability_sum" as const,
            base: armorClass(baseArmorClassEffect.base),
            abilityModifiers: [baseArmorClassEffect.ability] as const,
            source: "spell_base_plus_ability" as const,
            sourceUnitId: baseArmorClassEffect.sourceSpellId,
          },
        };
  const spellArmorClassBonuses = combatant.activeEffects.flatMap((effect) =>
    effect.kind === "spellArmorClassBonus"
      ? [
          {
            kind: "flat" as const,
            bonus: armorClassDelta(effect.bonus),
            sourceUnitId: effect.sourceSpellId,
          },
        ]
      : [],
  );
  const withBonuses =
    spellArmorClassBonuses.length === 0
      ? withBase
      : {
          ...withBase,
          bonuses: [...withBase.bonuses, ...spellArmorClassBonuses],
        };
  const spellArmorClassFloors = combatant.activeEffects.flatMap((effect) =>
    effect.kind === "spellArmorClassFloor"
      ? [
          {
            floor: effect.floor,
            sourceUnitId: effect.sourceSpellId,
          },
        ]
      : [],
  );
  return spellArmorClassFloors.length === 0
    ? withBonuses
    : {
        ...withBonuses,
        floors: [...withBonuses.floors, ...spellArmorClassFloors],
      };
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

export function combatantZeroHpLifecycleSnapshot(
  combatant: BattleCreatureState,
): BattleCreatureZeroHpLifecycleSnapshot {
  return Match.value(combatant.zeroHpLifecycle).pipe(
    Match.when({ policy: "diesAtZeroHp" }, (lifecycle) => ({
      policy: lifecycle.policy,
      dead: combatant.hp === 0,
    })),
    Match.when({ policy: "usesDeathSavingThrows" }, (lifecycle) => ({
      policy: lifecycle.policy,
      deathSaves: lifecycle.deathSaves.deathSaves,
      stable: lifecycle.deathSaves.stable,
      dead: lifecycle.deathSaves.dead,
    })),
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
  input: BattleCreatureInit,
): Either.Either<never, BattleStateInitIssue> | null {
  const creatureInit = input.creatureInit;
  if (creatureInit.kind !== "character") {
    return null;
  }
  for (const resource of creatureInit.resources ?? []) {
    const issue = characterBattleResourceInitIssue(resource);
    if (issue !== null) {
      return battleStateInitIssue(issue);
    }
  }
  return null;
}

export function characterSpellcastingInitIssue(
  input: BattleCreatureInit,
): Either.Either<never, BattleStateInitIssue> | null {
  const creatureInit = input.creatureInit;
  if (
    creatureInit.kind !== "character" ||
    creatureInit.spellcasting === undefined
  ) {
    return null;
  }
  const classLevels = parseCharacterBattleClassLevels(creatureInit.classLevels);
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
        (unitRef) => unitRef.unitId === access.featureUnitId,
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

export function knockedOutOneHp(): KnockedOutOneHpT {
  return KnockedOutOneHp(Hp(1));
}

export function knockedOutConditionState(
  conditions: ConditionState,
): KnockedOutConditionStateT {
  return KnockedOutConditionState(applyCondition(conditions, "unconscious"));
}

export function battleCreatureStateWithKnockOutPreservedConditions(
  combatant: BattleCreatureState,
  conditions: ConditionState,
): BattleCreatureState {
  if (combatant.positiveHpUnconscious !== null) {
    return {
      ...combatant,
      conditions: knockedOutConditionState(conditions),
    };
  }

  return { ...combatant, conditions };
}

export function nonKnockOutLifecycleFields(
  hp: Hp,
  conditions: ConditionState,
): BattleCreatureKnockOutLifecycle {
  return { hp, conditions, positiveHpUnconscious: null };
}

export function battleCreatureStateWithoutKnockOut(
  combatant: BattleCreatureState,
  hp: Hp,
  conditions: ConditionState,
): BattleCreatureState {
  return { ...combatant, ...nonKnockOutLifecycleFields(hp, conditions) };
}

export function battleCreatureStateWithDamageProjection(
  combatant: BattleCreatureState,
  projection: HpDamageProjection,
): BattleCreatureState {
  const tempHp = Hp(projection.currentTempHp - projection.tempHpAbsorbed);
  if (
    combatant.positiveHpUnconscious !== null &&
    Number(projection.nextHp) === 1
  ) {
    return { ...combatant, hp: knockedOutOneHp(), tempHp };
  }

  return {
    ...battleCreatureStateWithoutKnockOut(
      combatant,
      projection.nextHp,
      combatant.conditions,
    ),
    tempHp,
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

export function combatantCanTakeActions(
  combatant: BattleCreatureState | undefined,
): combatant is BattleCreatureState {
  return (
    combatant != null &&
    !isIncapacitated(combatant.conditions) &&
    !zeroHpLifecycleIsTerminal(combatant)
  );
}

export function combatantCanTakeReactions(
  combatant: BattleCreatureState | undefined,
): boolean {
  return combatantCanTakeActions(combatant) && combatant.reactionAvailable;
}

export function activeConditions(
  state: ConditionState,
  includeGrappled = false,
  includeHiddenInvisible = false,
): readonly Condition[] {
  return ALL_CONDITIONS.filter(
    (condition) =>
      hasCondition(state, condition) ||
      (condition === "grappled" && includeGrappled) ||
      (condition === "invisible" && includeHiddenInvisible),
  );
}

export function battleSubjectActorId(subject: BattleSubject): CombatantId {
  return subject.actorId;
}

export function isLegendaryAttackSubject(subject: BattleSubject): boolean {
  return (
    subject.tag === "action" &&
    subject.action === "attack" &&
    subject.statBlockSection === "legendaryActions"
  );
}

export function statBlockLegendaryActionWindowIsOpen(
  state: BattleState,
  actorId: CombatantId,
): boolean {
  return (
    state.legendaryActionWindow !== null &&
    !state.legendaryActionWindow.consumed &&
    actorId !== state.legendaryActionWindow.afterTurnActorId &&
    actorId !== currentActorId(state)
  );
}

export function closeLegendaryActionWindow(state: BattleState): BattleState {
  return state.legendaryActionWindow === null
    ? state
    : { ...state, legendaryActionWindow: null };
}

export function consumeLegendaryActionWindow(state: BattleState): BattleState {
  return state.legendaryActionWindow === null
    ? state
    : {
        ...state,
        legendaryActionWindow: {
          ...state.legendaryActionWindow,
          consumed: true,
        },
      };
}

export function characterOngoingFeatureProfiles(
  resources: readonly CharacterBattleResourceInit[],
  features: readonly CharacterBattleFeatureInit[],
  classLevels: readonly CharacterBattleClassLevel[],
): ReadonlyMap<
  OngoingFeatureSourceKey,
  Extract<SupportedUnitFeatureProfile, { readonly kind: "ongoingFeature" }>
> {
  const units = [
    ...resources.map((resource) => resource.unit),
    ...features.map((feature) => feature.unit),
  ];
  return new Map(
    units.flatMap((unit) => {
      const profile = parseSupportedUnitFeatureProfile(unit, classLevels);
      return profile?.kind === "ongoingFeature"
        ? [[ongoingFeatureSourceKeyForUnit(unit.id), profile] as const]
        : [];
    }),
  );
}

export function characterAttackDamageRiderProfiles(
  resources: readonly CharacterBattleResourceInit[],
  features: readonly CharacterBattleFeatureInit[],
  unitRefs: readonly BattleUnitRef[],
  classLevels: readonly CharacterBattleClassLevel[],
): ReadonlyMap<
  UnitRecord["id"],
  Extract<SupportedUnitFeatureProfile, { readonly kind: "attackDamageRider" }>
> {
  const units = [
    ...resources.map((resource) => resource.unit),
    ...features.map((feature) => feature.unit),
  ];
  return new Map(
    units.flatMap((unit) => {
      const profile = parseSupportedUnitFeatureProfile(unit, classLevels);
      return profile?.kind === "attackDamageRider" &&
        unitRefSupportsProfile(
          unitRefs,
          unit.id,
          ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE,
        )
        ? [[unit.id, profile] as const]
        : [];
    }),
  );
}

export function characterSaveDamageReplacementProfiles(
  resources: readonly CharacterBattleResourceInit[],
  features: readonly CharacterBattleFeatureInit[],
  unitRefs: readonly BattleUnitRef[],
  classLevels: readonly CharacterBattleClassLevel[],
): ReadonlyMap<
  UnitRecord["id"],
  Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "saveDamageReplacement" }
  >
> {
  const units = [
    ...resources.map((resource) => resource.unit),
    ...features.map((feature) => feature.unit),
  ];
  return new Map(
    units.flatMap((unit) => {
      const profile = parseSupportedUnitFeatureProfile(unit, classLevels);
      return profile?.kind === "saveDamageReplacement" &&
        unitRefSupportsProfile(
          unitRefs,
          unit.id,
          SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE,
        )
        ? [[unit.id, profile] as const]
        : [];
    }),
  );
}

export function characterPassiveSavingThrowRollModeProfiles(
  resources: readonly CharacterBattleResourceInit[],
  features: readonly CharacterBattleFeatureInit[],
  unitRefs: readonly BattleUnitRef[],
  classLevels: readonly CharacterBattleClassLevel[],
): ReadonlyMap<
  UnitRecord["id"],
  Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "passiveSavingThrowRollMode" }
  >
> {
  const units = [
    ...resources.map((resource) => resource.unit),
    ...features.map((feature) => feature.unit),
  ];
  return new Map(
    units.flatMap((unit) => {
      const profile = parseSupportedUnitFeatureProfile(unit, classLevels);
      return profile?.kind === "passiveSavingThrowRollMode" &&
        unitRefSupportsProfileKind(
          unitRefs,
          unit.id,
          PASSIVE_SAVING_THROW_ROLL_MODE_SUPPORT_PROFILE,
        )
        ? [[unit.id, profile] as const]
        : [];
    }),
  );
}

export function characterReactionRollOrDamageReductionProfiles(
  resources: readonly CharacterBattleResourceInit[],
  features: readonly CharacterBattleFeatureInit[],
  unitRefs: readonly BattleUnitRef[],
  classLevels: readonly CharacterBattleClassLevel[],
): ReadonlyMap<
  UnitRecord["id"],
  Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "reactionRollOrDamageReduction" }
  >
> {
  const units = [
    ...resources.map((resource) => resource.unit),
    ...features.map((feature) => feature.unit),
  ];
  return new Map(
    units.flatMap((unit) => {
      const profile = parseSupportedUnitFeatureProfile(unit, classLevels);
      return profile?.kind === "reactionRollOrDamageReduction" &&
        (unitRefSupportsProfile(
          unitRefs,
          unit.id,
          REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE,
        ) ||
          unitRefSupportsProfile(
            unitRefs,
            unit.id,
            ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SUPPORT_PROFILE,
          ))
        ? [[unit.id, profile] as const]
        : [];
    }),
  );
}

export function characterFailedAbilityCheckResourceBoostProfiles(
  resources: readonly CharacterBattleResourceInit[],
  features: readonly CharacterBattleFeatureInit[],
  unitRefs: readonly BattleUnitRef[],
  classLevels: readonly CharacterBattleClassLevel[],
): ReadonlyMap<
  UnitRecord["id"],
  Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "failedAbilityCheckResourceBoost" }
  >
> {
  const units = [
    ...resources.map((resource) => resource.unit),
    ...features.map((feature) => feature.unit),
  ];
  return new Map(
    units.flatMap((unit) => {
      const profile = parseSupportedUnitFeatureProfile(unit, classLevels);
      return profile?.kind === "failedAbilityCheckResourceBoost" &&
        unitRefSupportsProfileKind(
          unitRefs,
          unit.id,
          FAILED_ABILITY_CHECK_RESOURCE_BOOST_SUPPORT_PROFILE,
        )
        ? [[unit.id, profile] as const]
        : [];
    }),
  );
}

export function unitRefSupportsProfile(
  unitRefs: readonly BattleUnitRef[],
  unitId: UnitRecord["id"],
  supportProfile: BattleUnitSupportProfile,
): boolean {
  return unitRefs.some(
    (unitRef) =>
      unitRef.unitId === unitId &&
      unitRef.supportProfiles.some((profile) => profile === supportProfile) ===
        true,
  );
}

export function unitRefSupportsProfileKind(
  unitRefs: readonly BattleUnitRef[],
  unitId: UnitRecord["id"],
  supportProfileKind: Exclude<BattleUnitSupportProfile, string>["kind"],
): boolean {
  return unitRefs.some(
    (unitRef) =>
      unitRef.unitId === unitId &&
      unitRef.supportProfiles.some(
        (profile) =>
          typeof profile === "object" && profile.kind === supportProfileKind,
      ),
  );
}

export function literalStatBlockNumber(value: StatBlockValue): number {
  if (value.kind !== "literal") {
    throw new Error(
      "Battle runtime initialization requires literal Stat Block numeric values.",
    );
  }
  return value.value;
}
