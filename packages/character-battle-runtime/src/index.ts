// KERNEL-COVERAGE: runtime-owner SHEET.FEATURE_RESOURCES.TRANSITIONS CHARACTER.BATTLE.HANDOFF.INIT_PROJECTION CHARACTER.BATTLE.HANDOFF.SETTLEMENT CHARACTER.BATTLE.HANDOFF.IDENTITY_CONFLICTS
import {
  combatantKnockedOutUnconscious,
  combatantHasActiveDruidWildShape,
  classFeatureSpellFreeCastProfileForResource,
  characterBattleResourceIsPointPool,
  characterBattleResourceMaxPoints,
  characterBattleResourceMaxUses,
  KNOCKED_OUT_UNCONSCIOUS,
  parseSupportedUnitFeatureProfile,
  type BattleCreatureState,
  type BattleState,
  type CharacterZeroHpLifecycleInit,
} from "@dnd/battle-runtime";
import { characterBuildDruidWildShapeFacts } from "@dnd/character-creation-runtime";
import {
  CHARACTER_SHEET_KNOCKED_OUT_UNCONSCIOUS,
  characterSheetCurrentHp,
  characterSheetDruidWildShapeKnownForms,
  characterSheetHitPointMaximum,
  characterSheetPactSlots,
  characterSheetSpellSlotSourceState,
  characterSheetSpellSlots,
  characterSheetTempHp,
  createFreshCharacterSheet,
  isCharacterSheetPointPoolResourceUnitId,
  isCharacterSheetUseCountResourceUnitId,
  replaceCharacterSheetSpellSlotSourceState,
  type CharacterSheet,
  type CharacterSheetBookOfShadowsPresence,
  type CharacterSheetPositiveHpUnconscious,
  type CharacterSheetPointPoolResourceUnitId,
  type CharacterSheetResourceExpenditure,
  type CharacterSheetSpellSlotSourceState,
  type CharacterSheetStableRecovery,
  type CharacterSheetUseCountResourceUnitId,
  type CharacterSheetZeroHpLifecycleInput,
} from "@dnd/character-sheet-runtime";
import { elapsedTimeTicks } from "@dnd/shared/elapsed-time";
import {
  CONDITIONS,
  resourceCount,
  type Condition,
  type ResourceCount,
} from "@dnd/shared/types";
import {
  EMPTY_CONDITION_STATE,
  hasCondition,
} from "@dnd/shared-algebras/conditions-algebra";
import { isSupportedClassFeatureSpellFreeCastResourceTag } from "@dnd/surface/surface/types";
import type { StatBlockRecord } from "@dnd/surface/surface/types";
import type { StatBlockCatalog } from "@dnd/surface/surface/stat-block-catalog";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import { Either, Option } from "effect";

import {
  battleCreatureInitFromCharacterBuild,
  type CharacterBuildCreatureInput,
} from "./battle-creature-init.ts";
import {
  battleCreatureInitIssue,
  type BattleCreatureInitIssue,
} from "./battle-character-build-projection.ts";
import {
  characterSheetBattleHandoffIssue,
  type CharacterSheetBattleHandoffIssue,
} from "./battle-handoff-issue.ts";
import { settleCompanionFromBattle } from "./companion-handoff.ts";

// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.class-feature-use-count-resource
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.monk-uncanny-metabolism-initiative-recovery
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.font-of-magic-sorcery-points-to-spell-slot
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.metamagic-battle-resource-bridge
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.initiative-proficiency-and-swap
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.monk-focus-battle-options
export {
  battleCreatureInitFromCharacterBuild,
  characterBattleInitiativeScore,
  characterBattleResourceInitsFromBuild,
  startBattleFromCharacterBuildAndStatBlock,
  type CharacterBattleInitiativeProficiencyChoice,
  type CharacterBuildCreatureInput,
} from "./battle-creature-init.ts";
export {
  battleCreatureInitIssue,
  characterArmorClassState,
  characterAttackActionOption,
  characterBaseUnarmedStrikeActionOption,
  characterBattleLoadoutFromBuild,
  characterOffHandAttackActionOption,
  characterSpellcasting,
  getRequiredUnit,
  type BattleCreatureInitIssue,
} from "./battle-character-build-projection.ts";
export {
  characterBattleWeaponMasterySelections,
  characterUnitRefsWithBattleSupportProfiles,
  type BattleSupportProfileIssue,
} from "./battle-support-profiles.ts";
export type { CharacterSheetBattleHandoffIssue } from "./battle-handoff-issue.ts";
export {
  admitCharacterSheetCompanionToBattle,
  type CharacterSheetCompanionBattleAdmissionInput,
} from "./companion-handoff.ts";

export type CharacterSheetBattleInitInput = Omit<
  CharacterBuildCreatureInput,
  | "build"
  | "characterId"
  | "hitPointMaximum"
  | "currentHp"
  | "tempHp"
  | "conditions"
  | "positiveHpUnconscious"
  | "zeroHpLifecycle"
  | "spellSlots"
  | "bookOfShadowsPresence"
  | "resourceExpenditures"
  | "druidWildShapeAvailableForms"
> & {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly statBlockCatalog: StatBlockCatalog;
};

export function characterSheetBattleInit(input: CharacterSheetBattleInitInput) {
  const { sheet, unitLibrary, statBlockCatalog, ...battleInput } = input;
  const stableRecoveryIssue = unsupportedStableRecoveryBattleBoundary(sheet);
  if (stableRecoveryIssue !== null) {
    return battleCreatureInitIssue(stableRecoveryIssue);
  }
  const druidWildShapeAvailableForms =
    battleDruidWildShapeAvailableFormsFromSheet({
      sheet,
      statBlockCatalog,
    });
  if (Either.isLeft(druidWildShapeAvailableForms)) {
    return Either.left(druidWildShapeAvailableForms.left);
  }
  return battleCreatureInitFromCharacterBuild({
    ...battleInput,
    unitLibrary,
    build: sheet.build,
    characterId: sheet.characterId,
    hitPointMaximum: characterSheetHitPointMaximum(sheet),
    currentHp: characterSheetCurrentHp(sheet),
    tempHp: characterSheetTempHp(sheet),
    ...withDefinedCharacterBattleSheetState(sheet),
    ...(druidWildShapeAvailableForms.right === undefined
      ? {}
      : { druidWildShapeAvailableForms: druidWildShapeAvailableForms.right }),
  });
}

export function settleCharacterSheetFromBattle(input: {
  readonly sheet: CharacterSheet;
  readonly state: BattleState;
  readonly combatant: BattleCreatureState;
  readonly unitLibrary: UnitCatalog;
  readonly statBlockCatalog?: StatBlockCatalog;
}): Either.Either<CharacterSheet, CharacterSheetBattleHandoffIssue> {
  const settledCharacter = settleBattleCombatantIntoCharacterSheet(input);
  if (Either.isLeft(settledCharacter)) return settledCharacter;
  return settleCompanionFromBattle({
    sheet: settledCharacter.right,
    state: input.state,
    ownerCombatantId: input.combatant.combatantId,
  });
}

function settleBattleCombatantIntoCharacterSheet(input: {
  readonly sheet: CharacterSheet;
  readonly combatant: BattleCreatureState;
  readonly unitLibrary: UnitCatalog;
  readonly statBlockCatalog?: StatBlockCatalog;
}): Either.Either<CharacterSheet, CharacterSheetBattleHandoffIssue> {
  if (input.combatant.origin.kind !== "character") {
    return characterSheetBattleHandoffIssue(
      "Battle handoff combatant is not a character.",
    );
  }
  if (input.combatant.origin.characterId !== input.sheet.characterId) {
    return characterSheetBattleHandoffIssue(
      "Battle handoff character identity does not match Character Sheet.",
    );
  }
  const hitPointMaximum = characterSheetHitPointMaximum(input.sheet);
  if (input.combatant.maxHp !== hitPointMaximum) {
    return characterSheetBattleHandoffIssue(
      "Battle handoff maximum HP does not match Character Sheet.",
    );
  }
  if (input.combatant.hp > hitPointMaximum) {
    return characterSheetBattleHandoffIssue(
      "Battle handoff current HP exceeds Character Sheet maximum HP.",
    );
  }
  if (combatantHasActiveDruidWildShape(input.combatant)) {
    return characterSheetBattleHandoffIssue(
      "Battle handoff while Wild Shape is active is blocked; dismiss or resolve reversion before Character Sheet handoff.",
    );
  }

  const zeroHpLifecycle =
    input.combatant.hp === 0
      ? characterZeroHpLifecycleFromBattle(input)
      : undefined;
  if (zeroHpLifecycle !== undefined && Either.isLeft(zeroHpLifecycle)) {
    return Either.left(zeroHpLifecycle.left);
  }
  const knockedOut = combatantKnockedOutUnconscious(input.combatant);
  if (Either.isLeft(knockedOut)) {
    return characterSheetBattleHandoffIssue(knockedOut.left.message);
  }
  const pactSlots = characterSheetPactSlots(input.sheet);
  const resourceExpenditures = characterResourceExpendituresFromBattle(input);
  if (Either.isLeft(resourceExpenditures)) {
    return Either.left(resourceExpenditures.left);
  }
  const bookOfShadowsPresence = bookOfShadowsPresenceFromBattle(input);
  const druidWildShapeKnownForms = characterSheetDruidWildShapeKnownForms(
    input.sheet,
  );
  const spellSlotState = characterSheetSpellSlotSourceStateFromBattle(input);
  if (Either.isLeft(spellSlotState)) {
    return Either.left(spellSlotState.left);
  }

  const sheet = createFreshCharacterSheet({
    characterId: input.sheet.characterId,
    build: input.sheet.build,
    maximumHp: input.sheet.maximumHp,
    hitPointMaximumReduction: input.sheet.hitPointMaximumReduction,
    currentHp: input.combatant.hp,
    tempHp: input.combatant.tempHp,
    conditions: characterSheetConditionsFromBattle(input.combatant),
    unitLibrary: input.unitLibrary,
    ...(knockedOut.right === null
      ? {}
      : {
          positiveHpUnconscious:
            characterSheetPositiveHpUnconsciousFromBattle(),
        }),
    ...(input.combatant.hp === 0 && zeroHpLifecycle !== undefined
      ? { zeroHpLifecycle: zeroHpLifecycle.right }
      : {}),
    ...(pactSlots === undefined
      ? {}
      : { pactSlots: { expended: pactSlots.expended } }),
    ...(bookOfShadowsPresence === undefined ? {} : { bookOfShadowsPresence }),
    ...(druidWildShapeKnownForms === undefined
      ? {}
      : {
          druidWildShapeKnownFormStatBlockIds:
            druidWildShapeKnownForms.statBlockIds,
        }),
    spentHitDice: input.sheet.spentHitDice,
    restFeatureUses: input.sheet.restFeatureUses,
    resourceExpenditures: resourceExpenditures.right,
    companion: input.sheet.companion,
    ...(input.statBlockCatalog === undefined
      ? {}
      : { statBlockCatalog: input.statBlockCatalog }),
  });
  if (Either.isLeft(sheet)) return Either.left(sheet.left);
  return spellSlotState.right === undefined
    ? Either.right(sheet.right)
    : replaceCharacterSheetSpellSlotSourceState({
        sheet: sheet.right,
        unitLibrary: input.unitLibrary,
        spellSlotState: spellSlotState.right,
      });
}

function characterSheetSpellSlotSourceStateFromBattle(input: {
  readonly sheet: CharacterSheet;
  readonly combatant: BattleCreatureState;
}): Either.Either<
  CharacterSheetSpellSlotSourceState | undefined,
  CharacterSheetBattleHandoffIssue
> {
  if (input.combatant.origin.kind !== "character") {
    return Either.right(undefined);
  }
  const battleSpellcasting = input.combatant.origin.spellcasting;
  if (battleSpellcasting === undefined) {
    return Either.right(undefined);
  }
  const sheetSpellSlots = characterSheetSpellSlots(input.sheet);
  const sheetSlotState = characterSheetSpellSlotSourceState(input.sheet);
  if (sheetSpellSlots === undefined || sheetSlotState === undefined) {
    return characterSheetBattleHandoffIssue(
      "Battle handoff Spell Slot state requires Character Sheet Spell Slot state.",
    );
  }

  const battleLevels = new Set<number>();
  for (const battleSlot of battleSpellcasting.spellSlots) {
    if (battleLevels.has(battleSlot.spellLevel)) {
      return characterSheetBattleHandoffIssue(
        "Battle handoff Spell Slot state must not duplicate spell levels.",
      );
    }
    battleLevels.add(battleSlot.spellLevel);
    if (
      !Number.isInteger(battleSlot.expended) ||
      !Number.isInteger(battleSlot.count) ||
      battleSlot.expended < 0 ||
      battleSlot.count < 0 ||
      battleSlot.expended > battleSlot.count
    ) {
      return characterSheetBattleHandoffIssue(
        "Battle handoff Spell Slot state must have nonnegative count and expenditure.",
      );
    }
  }

  let ordinarySpellSlotExpenditures =
    sheetSlotState.ordinarySpellSlotExpenditures;
  let createdSpellSlots = sheetSlotState.createdSpellSlots;
  for (const sheetSlot of sheetSpellSlots) {
    const battleSlot = battleSpellcasting.spellSlots.find(
      (candidate) => candidate.spellLevel === sheetSlot.spellLevel,
    );
    if (battleSlot === undefined || battleSlot.count !== sheetSlot.count) {
      return characterSheetBattleHandoffIssue(
        "Battle handoff Spell Slot capacity must match Character Sheet Spell Slot capacity.",
      );
    }
    if (battleSlot.expended < sheetSlot.expended) {
      return characterSheetBattleHandoffIssue(
        "Battle handoff Spell Slot expenditure cannot be lower than the pre-battle Character Sheet expenditure.",
      );
    }
    const delta = resourceCount(battleSlot.expended - sheetSlot.expended);
    if (delta === 0) continue;

    const sourceSpend = spellSlotSourceSpendForBattleDelta({
      spellLevel: sheetSlot.spellLevel,
      delta,
      totalCount: sheetSlot.count,
      ordinarySpellSlotExpenditures,
      createdSpellSlots,
    });
    if (Either.isLeft(sourceSpend)) return Either.left(sourceSpend.left);
    ordinarySpellSlotExpenditures =
      sourceSpend.right.ordinarySpellSlotExpenditures;
    createdSpellSlots = sourceSpend.right.createdSpellSlots;
  }

  for (const battleSlot of battleSpellcasting.spellSlots) {
    if (
      !sheetSpellSlots.some(
        (sheetSlot) => sheetSlot.spellLevel === battleSlot.spellLevel,
      )
    ) {
      return characterSheetBattleHandoffIssue(
        "Battle handoff Spell Slot state must match Character Sheet Spell Slot levels.",
      );
    }
  }

  return Either.right({
    ordinarySpellSlotExpenditures,
    createdSpellSlots,
  });
}

function spellSlotSourceSpendForBattleDelta(input: {
  readonly spellLevel: number;
  readonly delta: ResourceCount;
  readonly totalCount: ResourceCount;
  readonly ordinarySpellSlotExpenditures: CharacterSheetSpellSlotSourceState["ordinarySpellSlotExpenditures"];
  readonly createdSpellSlots: CharacterSheetSpellSlotSourceState["createdSpellSlots"];
}): Either.Either<
  CharacterSheetSpellSlotSourceState,
  CharacterSheetBattleHandoffIssue
> {
  const ordinaryExpenditure = input.ordinarySpellSlotExpenditures.find(
    (slot) => slot.spellLevel === input.spellLevel,
  );
  const createdSlot = input.createdSpellSlots.find(
    (slot) => slot.spellLevel === input.spellLevel,
  );
  const createdCount = createdSlot?.count ?? resourceCount(0);
  const ordinaryCount = resourceCount(input.totalCount - createdCount);
  const ordinaryExpended = ordinaryExpenditure?.expended ?? resourceCount(0);
  const createdExpended = createdSlot?.expended ?? resourceCount(0);
  const ordinaryAvailable = ordinaryCount - ordinaryExpended;
  const createdAvailable = createdCount - createdExpended;
  if (input.delta > ordinaryAvailable + createdAvailable) {
    return characterSheetBattleHandoffIssue(
      "Battle handoff Spell Slot expenditure exceeds available Character Sheet Spell Slots.",
    );
  }

  const minimumCreatedSpend = Math.max(0, input.delta - ordinaryAvailable);
  const maximumCreatedSpend = Math.min(input.delta, createdAvailable);
  if (minimumCreatedSpend !== maximumCreatedSpend) {
    return characterSheetBattleHandoffIssue(
      `Battle handoff Spell Slot expenditure is source-ambiguous for level ${input.spellLevel}.`,
    );
  }
  const createdSpend = resourceCount(minimumCreatedSpend);
  const ordinarySpend = resourceCount(input.delta - createdSpend);
  return Either.right({
    ordinarySpellSlotExpenditures:
      ordinarySpend === 0
        ? input.ordinarySpellSlotExpenditures
        : input.ordinarySpellSlotExpenditures.map((slot) =>
            slot.spellLevel === input.spellLevel
              ? {
                  ...slot,
                  expended: resourceCount(slot.expended + ordinarySpend),
                }
              : slot,
          ),
    createdSpellSlots:
      createdSpend === 0
        ? input.createdSpellSlots
        : input.createdSpellSlots.map((slot) =>
            slot.spellLevel === input.spellLevel
              ? {
                  ...slot,
                  expended: resourceCount(slot.expended + createdSpend),
                }
              : slot,
          ),
  });
}

function characterResourceExpendituresFromBattle(input: {
  readonly sheet: CharacterSheet;
  readonly combatant: BattleCreatureState;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<
  readonly CharacterSheetResourceExpenditure[],
  CharacterSheetBattleHandoffIssue
> {
  if (input.combatant.origin.kind !== "character") {
    return Either.right(input.sheet.resourceExpenditures);
  }
  const origin = input.combatant.origin;
  const wildShapeUnitId = characterSheetDruidWildShapeResourceUnitId(input);
  if (Either.isLeft(wildShapeUnitId)) {
    return Either.left(wildShapeUnitId.left);
  }
  const battleResources = origin.resources;
  const battleUseCountResourceUnitIds =
    new Set<CharacterSheetUseCountResourceUnitId>();
  const battlePointPoolResourceUnitIds =
    new Set<CharacterSheetPointPoolResourceUnitId>();
  for (const resource of battleResources) {
    const unitId =
      characterSheetUseCountResourceUnitIdForBattleResource(resource);
    if (unitId !== null) battleUseCountResourceUnitIds.add(unitId);
    const pointPoolUnitId =
      characterSheetPointPoolResourceUnitIdForBattleResource(resource);
    if (
      pointPoolUnitId !== null &&
      characterBattleResourceIsPointPool(resource)
    ) {
      battlePointPoolResourceUnitIds.add(pointPoolUnitId);
    }
  }
  if (wildShapeUnitId.right !== undefined) {
    battleUseCountResourceUnitIds.add(wildShapeUnitId.right);
  }
  const nextExpenditures = input.sheet.resourceExpenditures.filter(
    (expenditure) =>
      !isSupportedClassFeatureSpellFreeCastResourceTag(expenditure.tag) &&
      (expenditure.tag !== "useCountResource" ||
        !isCharacterSheetUseCountResourceUnitId(expenditure.unitId) ||
        !battleUseCountResourceUnitIds.has(expenditure.unitId)) &&
      (expenditure.tag !== "pointPoolResource" ||
        !isCharacterSheetPointPoolResourceUnitId(expenditure.unitId) ||
        !battlePointPoolResourceUnitIds.has(expenditure.unitId)),
  );
  const nextFreeCastExpenditures: CharacterSheetResourceExpenditure[] = [];
  const nextUseCountExpenditures: CharacterSheetResourceExpenditure[] = [];
  const nextPointPoolExpenditures: CharacterSheetResourceExpenditure[] = [];
  const druidWildShapeExpenditure =
    druidWildShapeResourceExpenditureFromBattle(input);
  if (Either.isLeft(druidWildShapeExpenditure)) {
    return Either.left(druidWildShapeExpenditure.left);
  }
  for (const resource of battleResources) {
    const pointPoolUnitId =
      characterSheetPointPoolResourceUnitIdForBattleResource(resource);
    if (
      pointPoolUnitId !== null &&
      characterBattleResourceIsPointPool(resource)
    ) {
      const maxPoints = characterBattleResourceMaxPoints({
        unit: resource.unit,
        classLevels: input.combatant.origin.classLevels,
      });
      if (maxPoints === undefined) {
        return characterSheetBattleHandoffIssue(
          "Class feature point-pool resources must carry finite remaining points during battle handoff.",
        );
      }
      const expended = Number(maxPoints) - Number(resource.pointsRemaining);
      if (expended < 0) {
        return characterSheetBattleHandoffIssue(
          "Class feature point-pool remaining points exceed the battle resource cap during battle handoff.",
        );
      }
      if (expended > 0) {
        nextPointPoolExpenditures.push({
          tag: "pointPoolResource",
          unitId: pointPoolUnitId,
          expended: resourceCount(expended),
        });
      }
      continue;
    }
    const profile = classFeatureSpellFreeCastProfileForResource(resource);
    if (profile !== null && !characterBattleResourceIsPointPool(resource)) {
      if (resource.resource.cap.kind !== "fixed") {
        return characterSheetBattleHandoffIssue(
          "Class feature spell free casts must use a fixed battle resource cap during battle handoff.",
        );
      }
      if (resource.usesRemaining === undefined) {
        return characterSheetBattleHandoffIssue(
          "Class feature spell free casts must carry remaining uses during battle handoff.",
        );
      }
      const expended = resource.resource.cap.uses - resource.usesRemaining;
      if (expended < 0) {
        return characterSheetBattleHandoffIssue(
          "Class feature spell free-cast remaining uses exceed the battle resource cap during battle handoff.",
        );
      }
      if (expended > 0) {
        nextFreeCastExpenditures.push({
          tag: profile.resourceTag,
          expended: resourceCount(expended),
        });
      }
      continue;
    }
    if (
      parseSupportedUnitFeatureProfile(resource.unit, origin.classLevels)
        ?.kind === "druidWildShapeKnownForm"
    ) {
      continue;
    }
    const useCountUnitId =
      characterSheetUseCountResourceUnitIdForBattleResource(resource);
    if (
      useCountUnitId !== null &&
      !characterBattleResourceIsPointPool(resource)
    ) {
      const maxUses = characterBattleResourceMaxUses({
        unit: resource.unit,
        classLevels: input.combatant.origin.classLevels,
      });
      if (maxUses === undefined || resource.usesRemaining === undefined) {
        return characterSheetBattleHandoffIssue(
          "Class feature use-count resources must carry finite remaining uses during battle handoff.",
        );
      }
      const expended = Number(maxUses) - Number(resource.usesRemaining);
      if (expended < 0) {
        return characterSheetBattleHandoffIssue(
          "Class feature use-count remaining uses exceed the battle resource cap during battle handoff.",
        );
      }
      if (expended > 0) {
        nextUseCountExpenditures.push({
          tag: "useCountResource",
          unitId: useCountUnitId,
          expended: resourceCount(expended),
        });
      }
    }
  }
  return Either.right([
    ...nextExpenditures,
    ...nextFreeCastExpenditures,
    ...nextUseCountExpenditures,
    ...nextPointPoolExpenditures,
    ...(druidWildShapeExpenditure.right === undefined
      ? []
      : [druidWildShapeExpenditure.right]),
  ]);
}

function characterSheetPointPoolResourceUnitIdForBattleResource(
  resource: NonNullable<
    Extract<
      BattleCreatureState["origin"],
      { readonly kind: "character" }
    >["resources"]
  >[number],
): CharacterSheetPointPoolResourceUnitId | null {
  return characterBattleResourceIsPointPool(resource) &&
    isCharacterSheetPointPoolResourceUnitId(resource.unit.id)
    ? resource.unit.id
    : null;
}

function characterSheetUseCountResourceUnitIdForBattleResource(
  resource: NonNullable<
    Extract<
      BattleCreatureState["origin"],
      { readonly kind: "character" }
    >["resources"]
  >[number],
): CharacterSheetUseCountResourceUnitId | null {
  return resource.resource.kind === "use_count" &&
    isCharacterSheetUseCountResourceUnitId(resource.unit.id)
    ? resource.unit.id
    : null;
}

function characterSheetDruidWildShapeResourceUnitId(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<
  CharacterSheetUseCountResourceUnitId | undefined,
  CharacterSheetBattleHandoffIssue
> {
  const facts = characterBuildDruidWildShapeFacts({
    build: input.sheet.build,
    unitLibrary: input.unitLibrary,
  });
  if (Either.isLeft(facts)) {
    return characterSheetBattleHandoffIssue(facts.left.message);
  }
  const unitId = facts.right?.unitId;
  if (unitId === undefined) {
    return Either.right(undefined);
  }
  if (!isCharacterSheetUseCountResourceUnitId(unitId)) {
    return characterSheetBattleHandoffIssue(
      "Druid Wild Shape must use a Character Sheet use-count resource during battle handoff.",
    );
  }
  return Either.right(unitId);
}

function battleDruidWildShapeAvailableFormsFromSheet(input: {
  readonly sheet: CharacterSheet;
  readonly statBlockCatalog: StatBlockCatalog;
}): Either.Either<
  readonly StatBlockRecord[] | undefined,
  BattleCreatureInitIssue
> {
  const knownForms = characterSheetDruidWildShapeKnownForms(input.sheet);
  if (knownForms === undefined) return Either.right(undefined);
  const forms: StatBlockRecord[] = [];
  for (const statBlockId of knownForms.statBlockIds) {
    const statBlock = input.statBlockCatalog.getStatBlock(statBlockId);
    if (Option.isSome(statBlock)) {
      forms.push(statBlock.value);
    }
  }
  return Either.right(forms);
}

function druidWildShapeResourceExpenditureFromBattle(input: {
  readonly sheet: CharacterSheet;
  readonly combatant: BattleCreatureState;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<
  CharacterSheetResourceExpenditure | undefined,
  CharacterSheetBattleHandoffIssue
> {
  if (input.combatant.origin.kind !== "character") {
    return Either.right(undefined);
  }
  const origin = input.combatant.origin;
  const resources = origin.resources.filter(
    (candidate) =>
      parseSupportedUnitFeatureProfile(candidate.unit, origin.classLevels)
        ?.kind === "druidWildShapeKnownForm",
  );
  if (resources.length > 1) {
    return characterSheetBattleHandoffIssue(
      "Battle handoff supports exactly one Druid Wild Shape resource.",
    );
  }
  const resource = resources[0];
  if (resource === undefined) {
    return Either.right(undefined);
  }
  const facts = characterBuildDruidWildShapeFacts({
    build: input.sheet.build,
    unitLibrary: input.unitLibrary,
  });
  if (Either.isLeft(facts)) {
    return characterSheetBattleHandoffIssue(facts.left.message);
  }
  if (facts.right === undefined) {
    return characterSheetBattleHandoffIssue(
      "Battle handoff Druid Wild Shape resource requires the Druid Wild Shape feature.",
    );
  }
  if (!("usesRemaining" in resource)) {
    return characterSheetBattleHandoffIssue(
      "Druid Wild Shape must carry remaining uses during battle handoff.",
    );
  }
  const expended =
    Number(facts.right.useCount.maximum) - Number(resource.usesRemaining);
  if (expended < 0) {
    return characterSheetBattleHandoffIssue(
      "Druid Wild Shape remaining uses exceed the character resource cap during battle handoff.",
    );
  }
  return Either.right(
    expended === 0
      ? undefined
      : {
          tag: "useCountResource",
          unitId: resource.unit.id,
          expended: resourceCount(expended),
        },
  );
}

function characterSheetInitialConditions(
  sheet: CharacterSheet,
): CharacterBuildCreatureInput["conditions"] {
  return [
    ...sheet.conditions,
    ...(sheet.hitPoints.tag === "knockedOut" ? (["unconscious"] as const) : []),
  ];
}

function characterSheetConditionsFromBattle(
  combatant: BattleCreatureState,
): CharacterSheet["conditions"] {
  const conditions = combatant.conditions ?? EMPTY_CONDITION_STATE;
  return CONDITIONS.filter(
    (condition): condition is Exclude<Condition, "unconscious"> =>
      condition !== "unconscious" && hasCondition(conditions, condition),
  );
}

function withDefinedCharacterBattleSheetState(
  sheet: CharacterSheet,
): Partial<
  Pick<
    CharacterBuildCreatureInput,
    | "conditions"
    | "positiveHpUnconscious"
    | "zeroHpLifecycle"
    | "spellSlots"
    | "bookOfShadowsPresence"
    | "resourceExpenditures"
  >
> {
  const conditions = characterSheetInitialConditions(sheet);
  const positiveHpUnconscious = characterSheetPositiveHpUnconscious(sheet);
  const zeroHpLifecycle = characterSheetZeroHpLifecycle(sheet);
  const spellSlots = characterSheetSpellSlots(sheet);
  return {
    ...(conditions === undefined ? {} : { conditions }),
    ...(positiveHpUnconscious === undefined ? {} : { positiveHpUnconscious }),
    ...(zeroHpLifecycle === undefined ? {} : { zeroHpLifecycle }),
    ...(spellSlots === undefined ? {} : { spellSlots }),
    ...(sheet.bookOfShadowsPresence === undefined
      ? {}
      : { bookOfShadowsPresence: sheet.bookOfShadowsPresence }),
    resourceExpenditures: sheet.resourceExpenditures,
  };
}

function bookOfShadowsPresenceFromBattle(input: {
  readonly sheet: CharacterSheet;
  readonly combatant: BattleCreatureState;
}): CharacterSheetBookOfShadowsPresence | undefined {
  if (input.combatant.origin.kind !== "character") {
    return input.sheet.bookOfShadowsPresence;
  }
  return (
    input.combatant.origin.spellcasting?.bookOfShadowsSpellAccesses[0]
      ?.bookPresence ?? input.sheet.bookOfShadowsPresence
  );
}

function characterSheetPositiveHpUnconscious(
  sheet: CharacterSheet,
): CharacterBuildCreatureInput["positiveHpUnconscious"] {
  return sheet.hitPoints.tag === "knockedOut"
    ? KNOCKED_OUT_UNCONSCIOUS
    : undefined;
}

function characterSheetPositiveHpUnconsciousFromBattle(): CharacterSheetPositiveHpUnconscious {
  return CHARACTER_SHEET_KNOCKED_OUT_UNCONSCIOUS;
}

function characterSheetZeroHpLifecycle(
  sheet: CharacterSheet,
): CharacterZeroHpLifecycleInit | undefined {
  if (sheet.hitPoints.tag !== "zero") return undefined;
  const lifecycle = sheet.hitPoints.lifecycle;
  if (lifecycle.tag === "stable") {
    return {
      policy: "usesDeathSavingThrows",
      deathSaves: {
        deathSaves: { successes: 0, failures: 0 },
        stable: true,
        dead: false,
        hpRegained: false,
      },
    };
  }
  if (lifecycle.tag === "dead") {
    return {
      policy: "usesDeathSavingThrows",
      deathSaves: {
        deathSaves: lifecycle.deathSaves,
        stable: false,
        dead: true,
        hpRegained: false,
      },
    };
  }
  return {
    policy: "usesDeathSavingThrows",
    deathSaves: {
      deathSaves: lifecycle.deathSaves,
      stable: false,
      dead: false,
      hpRegained: false,
    },
  };
}

function characterZeroHpLifecycleFromBattle(input: {
  readonly sheet: CharacterSheet;
  readonly combatant: BattleCreatureState;
}): Either.Either<
  CharacterSheetZeroHpLifecycleInput,
  CharacterSheetBattleHandoffIssue
> {
  if (input.combatant.zeroHpLifecycle.policy !== "usesDeathSavingThrows") {
    return characterSheetBattleHandoffIssue(
      "Battle character has unsupported zero-HP lifecycle.",
    );
  }
  const lifecycle = input.combatant.zeroHpLifecycle.deathSaves;
  if (lifecycle.dead) {
    return Either.right({ tag: "dead", deathSaves: lifecycle.deathSaves });
  }
  if (lifecycle.stable) {
    const stableRecoveryIssue = unsupportedStableRecoveryBattleBoundary(
      input.sheet,
    );
    if (stableRecoveryIssue !== null) {
      return characterSheetBattleHandoffIssue(stableRecoveryIssue);
    }
    return Either.right({
      tag: "stable",
      recovery: {
        kind: "regains1HpAfter1d4Hours",
        elapsedBeforeRecoveryRoll: elapsedTimeTicks(0),
      },
    });
  }
  return Either.right({ tag: "unstable", deathSaves: lifecycle.deathSaves });
}

function unsupportedStableRecoveryBattleBoundary(
  sheet: CharacterSheet,
): string | null {
  if (
    sheet.hitPoints.tag !== "zero" ||
    sheet.hitPoints.lifecycle.tag !== "stable"
  ) {
    return null;
  }
  return freshStableRecovery(sheet.hitPoints.lifecycle.recovery)
    ? null
    : "Battle handoff cannot preserve in-progress Stable recovery timers.";
}

function freshStableRecovery(recovery: CharacterSheetStableRecovery): boolean {
  return (
    recovery.kind === "regains1HpAfter1d4Hours" &&
    Number(recovery.elapsedBeforeRecoveryRoll) === 0
  );
}
