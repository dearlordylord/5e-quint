import {
  characterBuildMonkUncannyMetabolismFacts,
  type CharacterBuild,
  type UnitCatalog,
} from "@dnd/character-creation-runtime";
import { resourceCount, type ResourceCount } from "@dnd/shared/types";
import type { UnitRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";

import {
  characterSheetHitPointCapacity,
  characterSheetHitPoints,
  parseHp,
} from "./hit-points.ts";
import {
  characterBuildHitDice,
  characterSheetSpellRestBenefitProfile,
  restSpellSlotRecoveryProfileForBuild,
} from "./healing-rest-benefit.ts";
import { resourceExpendituresFromInput } from "./resources.ts";
import { pactSlotRecoveryProfileForBuild } from "./rests.ts";
import {
  pactSlotExpenditureFromInput,
  spellSlotStateFromInput,
} from "./spell-slots.ts";
import {
  druidCircleLandFromInput,
  druidWildShapeKnownFormsFromInput,
  storedBookOfShadowsDruidCircleLandSelectionIssue,
} from "./druid-features.ts";
import {
  companionFromInput,
  parseStoredCharacterSheetCompanion,
} from "./companions.ts";
import {
  ARCANE_RECOVERY_REST_FEATURE_TAG,
  CHARACTER_SHEET_CONDITIONS,
  MAGICAL_CUNNING_REST_FEATURE_TAG,
  SPELL_RECIPIENT_REST_LOCKOUT_TAG,
  UNCANNY_METABOLISM_REST_FEATURE_TAG,
  characterSheetId,
  characterSheetIssue,
  type CharacterSheet,
  type CharacterSheetBookOfShadowsPresence,
  type CharacterSheetCondition,
  type CharacterSheetInput,
  type CharacterSheetIssue,
  type CharacterSheetRestFeatureUse,
  type CharacterSheetSpellSlotSourceState,
  type CharacterSheetSpentHitDiePool,
} from "./sheet-types.ts";
import {
  characterBuildHasBookOfShadows,
  isNonSpellcastingBuild,
  isRecord,
  isSpellcastingBuild,
  parseCharacterBuild,
  parseResourceCount,
  parseStoredCharacterSheetBookOfShadowsPresence,
  parseStoredDruidCircleLand,
  parseStoredDruidWildShapeKnownForms,
  parseStoredHitPoints,
  parseStoredPactSlots,
  parseStoredResourceExpenditures,
  parseStoredSpellSlots,
} from "./stored-sheet-parser.ts";

export function createFreshCharacterSheet(
  input: CharacterSheetInput,
): Either.Either<CharacterSheet, CharacterSheetIssue> {
  return createCharacterSheet(input);
}

function createCharacterSheet(
  input: CharacterSheetInput,
  storedSpellSlotState?: CharacterSheetSpellSlotSourceState,
): Either.Either<CharacterSheet, CharacterSheetIssue> {
  const hitPointCapacity = characterSheetHitPointCapacity(input);
  if (Either.isLeft(hitPointCapacity))
    return Either.left(hitPointCapacity.left);
  const spentHitDice = spentHitDiceFromInput(input);
  if (Either.isLeft(spentHitDice)) return Either.left(spentHitDice.left);
  const restFeatureUses = restFeatureUsesFromInput(input);
  if (Either.isLeft(restFeatureUses)) return Either.left(restFeatureUses.left);
  const conditions = conditionsFromInput(input.conditions);
  if (Either.isLeft(conditions)) return Either.left(conditions.left);
  const resourceExpenditures = resourceExpendituresFromInput(input);
  if (Either.isLeft(resourceExpenditures)) {
    return Either.left(resourceExpenditures.left);
  }
  const companion = companionFromInput(input.companion);
  if (Either.isLeft(companion)) {
    return Either.left(companion.left);
  }
  const bookOfShadowsPresence = bookOfShadowsPresenceFromInput(input);
  if (Either.isLeft(bookOfShadowsPresence)) {
    return Either.left(bookOfShadowsPresence.left);
  }
  const druidWildShapeKnownForms = druidWildShapeKnownFormsFromInput(input);
  if (Either.isLeft(druidWildShapeKnownForms)) {
    return Either.left(druidWildShapeKnownForms.left);
  }
  const druidCircleLand = druidCircleLandFromInput(input);
  if (Either.isLeft(druidCircleLand)) {
    return Either.left(druidCircleLand.left);
  }
  const druidCircleBookOfShadowsIssue =
    storedBookOfShadowsDruidCircleLandSelectionIssue({
      build: input.build,
      unitLibrary: input.unitLibrary,
      circleLand: druidCircleLand.right,
    });
  if (Either.isLeft(druidCircleBookOfShadowsIssue)) {
    return Either.left(druidCircleBookOfShadowsIssue.left);
  }

  if (isNonSpellcastingBuild(input.build)) {
    if (input.spellSlots !== undefined || storedSpellSlotState !== undefined) {
      return characterSheetIssue(
        "Non-spellcasting Character Sheet cannot carry Spell Slot state.",
      );
    }
    if (input.pactSlots !== undefined) {
      return characterSheetIssue(
        "Non-spellcasting Character Sheet cannot carry Pact Slot state.",
      );
    }
    const hitPoints = characterSheetHitPoints(input);
    if (Either.isLeft(hitPoints)) return Either.left(hitPoints.left);
    return Either.right({
      tag: "available",
      characterId: input.characterId,
      build: input.build,
      maximumHp: input.maximumHp,
      hitPointMaximumReduction: input.hitPointMaximumReduction,
      hitPoints: hitPoints.right,
      conditions: conditions.right,
      spentHitDice: spentHitDice.right,
      restFeatureUses: restFeatureUses.right,
      resourceExpenditures: resourceExpenditures.right,
      companion: companion.right,
      ...(druidWildShapeKnownForms.right === undefined
        ? {}
        : { druidWildShapeKnownForms: druidWildShapeKnownForms.right }),
      ...(druidCircleLand.right === undefined
        ? {}
        : { druidCircleLand: druidCircleLand.right }),
    });
  }

  if (!isSpellcastingBuild(input.build)) {
    return characterSheetIssue(
      "Character build spellcasting state is inconsistent.",
    );
  }
  const build = input.build;
  const hitPoints = characterSheetHitPoints(input);
  if (Either.isLeft(hitPoints)) return Either.left(hitPoints.left);
  const spellSlotState =
    storedSpellSlotState === undefined
      ? spellSlotStateFromInput({
          build,
          unitLibrary: input.unitLibrary,
          ...(input.spellSlots === undefined
            ? {}
            : { spellSlots: input.spellSlots }),
        })
      : Either.right(storedSpellSlotState);
  if (Either.isLeft(spellSlotState)) {
    return Either.left(spellSlotState.left);
  }
  const pactSlotExpenditure = pactSlotExpenditureFromInput({
    build,
    ...(input.pactSlots === undefined ? {} : { pactSlots: input.pactSlots }),
  });
  if (Either.isLeft(pactSlotExpenditure)) {
    return Either.left(pactSlotExpenditure.left);
  }

  return Either.right({
    tag: "available",
    characterId: input.characterId,
    build,
    maximumHp: input.maximumHp,
    hitPointMaximumReduction: input.hitPointMaximumReduction,
    hitPoints: hitPoints.right,
    conditions: conditions.right,
    spentHitDice: spentHitDice.right,
    restFeatureUses: restFeatureUses.right,
    resourceExpenditures: resourceExpenditures.right,
    companion: companion.right,
    bookOfShadowsPresence: bookOfShadowsPresence.right,
    ...(druidWildShapeKnownForms.right === undefined
      ? {}
      : { druidWildShapeKnownForms: druidWildShapeKnownForms.right }),
    ...(druidCircleLand.right === undefined
      ? {}
      : { druidCircleLand: druidCircleLand.right }),
    spellSlotExpenditures: spellSlotState.right.ordinarySpellSlotExpenditures,
    createdSpellSlots: spellSlotState.right.createdSpellSlots,
    pactSlotExpenditure: pactSlotExpenditure.right,
  });
}

function bookOfShadowsPresenceFromInput(
  input: CharacterSheetInput,
): Either.Either<
  CharacterSheetBookOfShadowsPresence | undefined,
  CharacterSheetIssue
> {
  if (!characterBuildHasBookOfShadows(input.build)) {
    return input.bookOfShadowsPresence === undefined
      ? Either.right(undefined)
      : characterSheetIssue(
          "Character Sheet Book of Shadows presence requires Book of Shadows selection.",
        );
  }
  return Either.right(input.bookOfShadowsPresence ?? { tag: "onPerson" });
}



export function parseCharacterSheet(
  value: unknown,
  unitLibrary: UnitCatalog,
): Either.Either<CharacterSheet, CharacterSheetIssue> {
  if (!isRecord(value)) return characterSheetIssue("Expected Character Sheet.");
  if (value.tag !== "available") {
    return characterSheetIssue("Expected available Character Sheet.");
  }
  if (typeof value.characterId !== "string") {
    return characterSheetIssue("Character Sheet requires character id.");
  }
  const build = parseCharacterBuild(value.build, unitLibrary);
  if (Either.isLeft(build)) return Either.left(build.left);
  const bookOfShadowsPresence = parseStoredCharacterSheetBookOfShadowsPresence(
    build.right,
    value.bookOfShadowsPresence,
  );
  if (Either.isLeft(bookOfShadowsPresence)) {
    return Either.left(bookOfShadowsPresence.left);
  }
  const maximumHp = parseHp(value.maximumHp);
  if (Either.isLeft(maximumHp)) return Either.left(maximumHp.left);
  if (!Object.hasOwn(value, "hitPointMaximumReduction")) {
    return characterSheetIssue(
      "Character Sheet Hit Point maximum reduction is required.",
    );
  }
  const hitPointMaximumReduction = parseHp(value.hitPointMaximumReduction);
  if (Either.isLeft(hitPointMaximumReduction)) {
    return Either.left(hitPointMaximumReduction.left);
  }
  const hitPoints = parseStoredHitPoints(value.hitPoints);
  if (Either.isLeft(hitPoints)) return Either.left(hitPoints.left);
  const conditions = parseStoredConditions(value.conditions);
  if (Either.isLeft(conditions)) return Either.left(conditions.left);
  const spentHitDice = parseStoredSpentHitDice(value.spentHitDice);
  if (Either.isLeft(spentHitDice)) return Either.left(spentHitDice.left);
  const resourceExpenditures = parseStoredResourceExpenditures(
    value.resourceExpenditures,
  );
  if (Either.isLeft(resourceExpenditures)) {
    return Either.left(resourceExpenditures.left);
  }
  const companion = parseStoredCharacterSheetCompanion(value.companion);
  if (Either.isLeft(companion)) return Either.left(companion.left);
  const spellSlots = parseStoredSpellSlots(build.right, unitLibrary, value);
  if (Either.isLeft(spellSlots)) return Either.left(spellSlots.left);
  const pactSlots = parseStoredPactSlots(build.right, value);
  if (Either.isLeft(pactSlots)) return Either.left(pactSlots.left);
  const restFeatureUses = parseStoredRestFeatureUses(
    build.right,
    unitLibrary,
    value.restFeatureUses,
  );
  if (Either.isLeft(restFeatureUses)) return Either.left(restFeatureUses.left);
  const druidWildShapeKnownForms = parseStoredDruidWildShapeKnownForms(
    value.druidWildShapeKnownForms,
  );
  if (Either.isLeft(druidWildShapeKnownForms)) {
    return Either.left(druidWildShapeKnownForms.left);
  }
  const druidCircleLand = parseStoredDruidCircleLand(value.druidCircleLand);
  if (Either.isLeft(druidCircleLand)) {
    return Either.left(druidCircleLand.left);
  }

  return createCharacterSheet(
    {
      characterId: characterSheetId(value.characterId),
      build: build.right,
      maximumHp: maximumHp.right,
      hitPointMaximumReduction: hitPointMaximumReduction.right,
      currentHp: hitPoints.right.currentHp,
      tempHp: hitPoints.right.tempHp,
      conditions: conditions.right,
      unitLibrary,
      ...(hitPoints.right.positiveHpUnconscious === undefined
        ? {}
        : { positiveHpUnconscious: hitPoints.right.positiveHpUnconscious }),
      ...(hitPoints.right.zeroHpLifecycle === undefined
        ? {}
        : { zeroHpLifecycle: hitPoints.right.zeroHpLifecycle }),
      ...(pactSlots.right === undefined ? {} : { pactSlots: pactSlots.right }),
      ...(bookOfShadowsPresence.right === undefined
        ? {}
        : { bookOfShadowsPresence: bookOfShadowsPresence.right }),
      spentHitDice: spentHitDice.right,
      restFeatureUses: restFeatureUses.right,
      resourceExpenditures: resourceExpenditures.right,
      companion: companion.right,
      ...(druidWildShapeKnownForms.right === undefined
        ? {}
        : {
            druidWildShapeKnownFormStatBlockIds:
              druidWildShapeKnownForms.right.statBlockIds,
          }),
      ...(druidCircleLand.right === undefined
        ? {}
        : { druidCircleLand: druidCircleLand.right }),
    },
    spellSlots.right,
  );
}

function spentHitDiceFromInput(
  input: Pick<CharacterSheetInput, "build" | "spentHitDice" | "unitLibrary">,
): Either.Either<
  readonly CharacterSheetSpentHitDiePool[],
  CharacterSheetIssue
> {
  const capacity = characterBuildHitDice(input.build, input.unitLibrary);
  if (Either.isLeft(capacity)) return Either.left(capacity.left);
  const spentHitDice = input.spentHitDice ?? [];
  const spentByClass = new Map<UnitRecord["id"], ResourceCount>();
  for (const spent of spentHitDice) {
    if (spentByClass.has(spent.classUnitId)) {
      return characterSheetIssue("Spent Hit Dice state must not duplicate.");
    }
    spentByClass.set(spent.classUnitId, spent.spent);
  }
  const capacityByClass = new Map(
    capacity.right.map((pool) => [pool.classUnitId, pool]),
  );
  const result = [];
  for (const spent of spentHitDice) {
    const pool = capacityByClass.get(spent.classUnitId);
    if (pool === undefined) {
      return characterSheetIssue(
        "Spent Hit Dice state must match build Hit Dice exactly.",
      );
    }
    if (
      !Number.isInteger(spent.spent) ||
      spent.spent < 0 ||
      spent.spent > pool.total
    ) {
      return characterSheetIssue(
        "Spent Hit Dice state cannot exceed build Hit Dice.",
      );
    }
    if (spent.spent > 0) {
      result.push({
        classUnitId: spent.classUnitId,
        spent: resourceCount(spent.spent),
      });
    }
  }
  return Either.right(result);
}

function restFeatureUsesFromInput(
  input: Pick<CharacterSheetInput, "build" | "restFeatureUses" | "unitLibrary">,
): Either.Either<readonly CharacterSheetRestFeatureUse[], CharacterSheetIssue> {
  const uses = input.restFeatureUses ?? [];
  const usedFeatureTags = new Set<string>();
  for (const use of uses) {
    if (use.usedSinceLongRest !== true) {
      return characterSheetIssue("Expected supported rest feature use state.");
    }
    const useKey = restFeatureUseStateKey(use);
    if (usedFeatureTags.has(useKey)) {
      return characterSheetIssue("Rest feature use state must not duplicate.");
    }
    const featureUseState = restFeatureUseStateMatchesBuild(input, use);
    if (Either.isLeft(featureUseState))
      return Either.left(featureUseState.left);
    usedFeatureTags.add(useKey);
  }
  return Either.right([...uses]);
}

function restFeatureUseStateKey(use: CharacterSheetRestFeatureUse): string {
  return use.tag === SPELL_RECIPIENT_REST_LOCKOUT_TAG
    ? `${use.tag}:${use.spellId}`
    : use.tag;
}

function restFeatureUseStateMatchesBuild(
  input: Pick<CharacterSheetInput, "build" | "unitLibrary">,
  use: CharacterSheetRestFeatureUse,
): Either.Either<void, CharacterSheetIssue> {
  if (use.tag === SPELL_RECIPIENT_REST_LOCKOUT_TAG) {
    const profile = characterSheetSpellRestBenefitProfile({
      spellId: use.spellId,
      unitLibrary: input.unitLibrary,
    });
    if (Either.isLeft(profile)) {
      return characterSheetIssue(
        "Spell recipient rest lockout requires an admitted spell rest-benefit profile.",
      );
    }
    return Either.right(undefined);
  }
  if (use.tag === ARCANE_RECOVERY_REST_FEATURE_TAG) {
    if (
      Either.isLeft(
        restSpellSlotRecoveryProfileForBuild(input.build, input.unitLibrary),
      )
    ) {
      return characterSheetIssue(
        "Arcane Recovery rest feature use requires the Wizard Arcane Recovery feature.",
      );
    }
    return Either.right(undefined);
  }
  if (use.tag === MAGICAL_CUNNING_REST_FEATURE_TAG) {
    if (
      Either.isLeft(
        pactSlotRecoveryProfileForBuild(input.build, input.unitLibrary),
      )
    ) {
      return characterSheetIssue(
        "Magical Cunning rest feature use requires the Warlock Magical Cunning feature.",
      );
    }
    return Either.right(undefined);
  }
  if (use.tag === UNCANNY_METABOLISM_REST_FEATURE_TAG) {
    const facts = characterBuildMonkUncannyMetabolismFacts(input);
    if (Either.isLeft(facts)) return characterSheetIssue(facts.left.message);
    if (facts.right === undefined) {
      return characterSheetIssue(
        "Uncanny Metabolism rest feature use requires the Monk Uncanny Metabolism feature.",
      );
    }
    return Either.right(undefined);
  }
  return characterSheetIssue("Expected supported rest feature use state.");
}

function conditionsFromInput(
  conditions: readonly CharacterSheetCondition[],
): Either.Either<readonly CharacterSheetCondition[], CharacterSheetIssue> {
  const active = new Set<CharacterSheetCondition>();
  for (const condition of conditions) {
    if (!CHARACTER_SHEET_CONDITIONS.some((allowed) => allowed === condition)) {
      return characterSheetIssue(
        "Character Sheet condition state must contain supported non-Unconscious conditions.",
      );
    }
    if (active.has(condition)) {
      return characterSheetIssue(
        "Character Sheet condition state must not duplicate.",
      );
    }
    active.add(condition);
  }
  return Either.right([...conditions]);
}

function parseStoredSpentHitDice(
  value: unknown,
): Either.Either<
  readonly CharacterSheetSpentHitDiePool[],
  CharacterSheetIssue
> {
  if (!Array.isArray(value)) {
    return characterSheetIssue(
      "Character Sheet requires spent Hit Dice state.",
    );
  }
  const spentHitDice = [];
  for (const spent of value) {
    if (!isRecord(spent) || typeof spent.classUnitId !== "string") {
      return characterSheetIssue("Expected spent Hit Dice state.");
    }
    const spentCount = parseResourceCount(spent.spent);
    if (Either.isLeft(spentCount)) return Either.left(spentCount.left);
    spentHitDice.push({
      classUnitId: spent.classUnitId,
      spent: spentCount.right,
    });
  }
  return Either.right(spentHitDice);
}

function parseStoredConditions(
  value: unknown,
): Either.Either<readonly CharacterSheetCondition[], CharacterSheetIssue> {
  if (!Array.isArray(value)) {
    return characterSheetIssue("Character Sheet requires condition state.");
  }
  const conditions: CharacterSheetCondition[] = [];
  for (const condition of value) {
    if (typeof condition !== "string") {
      return characterSheetIssue("Expected Character Sheet condition.");
    }
    const supportedCondition = CHARACTER_SHEET_CONDITIONS.find(
      (allowed) => allowed === condition,
    );
    if (supportedCondition === undefined) {
      return characterSheetIssue(
        "Character Sheet condition state must contain supported non-Unconscious conditions.",
      );
    }
    conditions.push(supportedCondition);
  }
  return conditionsFromInput(conditions);
}

function parseStoredRestFeatureUses(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
  value: unknown,
): Either.Either<readonly CharacterSheetRestFeatureUse[], CharacterSheetIssue> {
  if (value === undefined) return Either.right([]);
  if (!Array.isArray(value)) {
    return characterSheetIssue("Expected Character Sheet rest feature uses.");
  }
  const uses: CharacterSheetRestFeatureUse[] = [];
  for (const use of value) {
    if (!isRecord(use)) {
      return characterSheetIssue("Expected Character Sheet rest feature use.");
    }
    if (
      (use.tag !== ARCANE_RECOVERY_REST_FEATURE_TAG &&
        use.tag !== MAGICAL_CUNNING_REST_FEATURE_TAG &&
        use.tag !== UNCANNY_METABOLISM_REST_FEATURE_TAG &&
        use.tag !== SPELL_RECIPIENT_REST_LOCKOUT_TAG) ||
      use.usedSinceLongRest !== true
    ) {
      return characterSheetIssue("Expected supported rest feature use state.");
    }
    if (use.tag === SPELL_RECIPIENT_REST_LOCKOUT_TAG) {
      if (typeof use.spellId !== "string") {
        return characterSheetIssue(
          "Spell recipient rest lockout requires a spell Unit id.",
        );
      }
      uses.push({
        tag: use.tag,
        spellId: use.spellId,
        usedSinceLongRest: true,
      });
      continue;
    }
    uses.push({ tag: use.tag, usedSinceLongRest: true });
  }
  return restFeatureUsesFromInput({
    build,
    unitLibrary,
    restFeatureUses: uses,
  });
}
