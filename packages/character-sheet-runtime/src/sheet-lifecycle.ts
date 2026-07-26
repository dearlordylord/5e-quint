// KERNEL-COVERAGE: runtime-owner CHARACTER.LIFECYCLE.LAYER_PROJECTION
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.sorcerous-restoration-sorcery-point-recovery
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.passive-defense-projection
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.ranger-tireless
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import {
  characterBuildMonkUncannyMetabolismFacts,
  type CharacterBuild,
  type UnitCatalog,
} from "@dnd/character-creation-runtime";
import {
  Hp,
  resourceCount,
  type ReadonlyNonEmptyArray,
  type ResourceCount,
} from "@dnd/shared/types";
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
import {
  resourceExpendituresFromInput,
  sorcerousRestorationProfileForBuild,
} from "./resources.ts";
import { pactSlotRecoveryProfileForBuild } from "./rests.ts";
import {
  pactSlotExpenditureFromInput,
  spellSlotStateFromInput,
} from "./spell-slots.ts";
import {
  druidCircleLandFromInput,
  druidWildShapeKnownFormsConstruction,
  druidWildShapeKnownFormsFromInput,
  storedBookOfShadowsDruidCircleLandSelectionIssue,
} from "./druid-features.ts";
import {
  fiendishResilienceFromInput,
  parseStoredFiendishResilience,
} from "./passive-defenses.ts";
import {
  companionFromInput,
  parseStoredCharacterSheetCompanion,
} from "./companions.ts";
import {
  ARCANE_RECOVERY_REST_FEATURE_TAG,
  COMMUNE_CASTING_REST_FEATURE_TAG,
  CHARACTER_SHEET_CONDITIONS,
  MAGICAL_CUNNING_REST_FEATURE_TAG,
  SORCEROUS_RESTORATION_REST_FEATURE_TAG,
  SPELL_RECIPIENT_REST_LOCKOUT_TAG,
  UNCANNY_METABOLISM_REST_FEATURE_TAG,
  CHARACTER_SHEET_HEROIC_INSPIRATION_AVAILABLE,
  CHARACTER_SHEET_CONSTRUCTION_ISSUE_CODES,
  CHARACTER_SHEET_NO_HEROIC_INSPIRATION,
  characterSheetId,
  characterSheetIssue,
  type CharacterSheet,
  type CharacterSheetBookOfShadowsPresence,
  type CharacterSheetCondition,
  type CharacterSheetConstructionIssue,
  type CharacterSheetExhaustionLevel,
  type CharacterSheetHeroicInspiration,
  type CharacterSheetInput,
  type CharacterSheetHitPoints,
  type CharacterSheetIssue,
  type CharacterSheetRestFeatureUse,
  type CharacterSheetSpellSlotSourceState,
  type CharacterSheetSpentHitDiePool,
} from "./sheet-types.ts";
import {
  freshCharacterSheet,
  type FreshCharacterSheet,
} from "./fresh-character-sheet.ts";
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
  recordHasExactKeys,
} from "./stored-sheet-parser.ts";

// Hp validates the branded value; the assertion retains the proven literal zero.
const FRESH_CHARACTER_SHEET_ZERO_HP = Hp(0) as Hp & 0;

export function createFreshCharacterSheet(
  input: CharacterSheetInput,
): Either.Either<
  FreshCharacterSheet,
  ReadonlyNonEmptyArray<CharacterSheetConstructionIssue>
> {
  const issues: CharacterSheetConstructionIssue[] = [];
  const hitPoints = freshCharacterSheetHitPoints(input);
  if (Either.isLeft(hitPoints)) {
    issues.push({ code: "hitPointStateInvalid" });
  }
  if (input.tempHp !== 0) {
    issues.push({ code: "temporaryHitPointsNotZero" });
  }
  if (input.hitPointMaximumReduction !== 0) {
    issues.push({ code: "hitPointMaximumReductionNotZero" });
  }
  if ((input.exhaustionLevel ?? 0) !== 0) {
    issues.push({ code: "exhaustionNotZero" });
  }
  if (input.conditions.length !== 0) {
    issues.push({ code: "conditionsNotEmpty" });
  }
  if ((input.spentHitDice?.length ?? 0) !== 0) {
    issues.push({ code: "spentHitDiceNotEmpty" });
  }
  if ((input.restFeatureUses?.length ?? 0) !== 0) {
    issues.push({ code: "restFeatureUsesNotEmpty" });
  }
  if ((input.resourceExpenditures?.length ?? 0) !== 0) {
    issues.push({ code: "resourceExpendituresNotEmpty" });
  }
  if (
    input.heroicInspiration !== undefined &&
    input.heroicInspiration.tag !== "none"
  ) {
    issues.push({ code: "heroicInspirationNotEmpty" });
  }
  if (input.companion !== undefined && input.companion.tag !== "none") {
    issues.push({ code: "companionNotEmpty" });
  }

  const bookOfShadowsPresence = bookOfShadowsPresenceFromInput(input);
  if (Either.isLeft(bookOfShadowsPresence)) {
    issues.push({ code: "bookOfShadowsPresenceInvalid" });
  }
  const druidWildShapeKnownForms = druidWildShapeKnownFormsConstruction(input);
  if (Either.isLeft(druidWildShapeKnownForms)) {
    issues.push(...druidWildShapeKnownForms.left);
  }
  const druidCircleLand = druidCircleLandFromInput(input);
  if (Either.isLeft(druidCircleLand)) {
    issues.push({ code: "druidCircleLandInvalid" });
  } else if (
    Either.isLeft(
      storedBookOfShadowsDruidCircleLandSelectionIssue({
        build: input.build,
        unitLibrary: input.unitLibrary,
        circleLand: druidCircleLand.right,
      }),
    )
  ) {
    issues.push({ code: "druidCircleLandInvalid" });
  }
  const fiendishResilience = fiendishResilienceFromInput(input);
  if (Either.isLeft(fiendishResilience)) {
    issues.push({ code: "fiendishResilienceInvalid" });
  }

  const spellSlotState = isSpellcastingBuild(input.build)
    ? spellSlotStateFromInput({
        build: input.build,
        unitLibrary: input.unitLibrary,
        ...(input.spellSlotExpenditures === undefined
          ? {}
          : { spellSlotExpenditures: input.spellSlotExpenditures }),
      })
    : Either.right(undefined);
  if (isNonSpellcastingBuild(input.build)) {
    if (input.spellSlotExpenditures !== undefined) {
      issues.push({ code: "spellSlotStateUnexpected" });
    }
    if (input.pactSlots !== undefined) {
      issues.push({ code: "pactSlotStateUnexpected" });
    }
  } else {
    if (
      Either.isLeft(spellSlotState) ||
      input.spellSlotExpenditures?.some(
        (expenditure) => expenditure.expended !== 0,
      ) === true
    ) {
      issues.push({ code: "spellSlotStateInvalid" });
    }
  }
  const pactSlotExpenditure = isSpellcastingBuild(input.build)
    ? pactSlotExpenditureFromInput({
        build: input.build,
        ...(input.pactSlots === undefined
          ? {}
          : { pactSlots: input.pactSlots }),
      })
    : Either.right(undefined);
  if (
    isSpellcastingBuild(input.build) &&
    (Either.isLeft(pactSlotExpenditure) ||
      (input.pactSlots?.expended ?? 0) !== 0)
  ) {
    issues.push({ code: "pactSlotStateInvalid" });
  }

  const firstIssue = issues[0];
  if (firstIssue !== undefined) {
    const orderedIssues = [...issues].sort(compareConstructionIssues);
    const firstOrderedIssue = orderedIssues[0];
    if (firstOrderedIssue === undefined) {
      throw new Error("Character Sheet construction issue ordering failed.");
    }
    return Either.left([firstOrderedIssue, ...orderedIssues.slice(1)]);
  }

  const validHitPoints = requireFreshConstructionFact(hitPoints);
  const knownForms = requireFreshConstructionFact(druidWildShapeKnownForms);
  const circleLand = requireFreshConstructionFact(druidCircleLand);
  const resilience = requireFreshConstructionFact(fiendishResilience);
  const common = {
    tag: "available" as const,
    characterId: input.characterId,
    hitPointMaximumReduction: FRESH_CHARACTER_SHEET_ZERO_HP,
    exhaustionLevel: 0 as const,
    hitPoints: validHitPoints,
    conditions: [] as const,
    spentHitDice: [] as const,
    restFeatureUses: [] as const,
    resourceExpenditures: [] as const,
    heroicInspiration: { tag: "none" as const },
    companion: { tag: "none" as const },
    ...(knownForms === undefined
      ? {}
      : { druidWildShapeKnownForms: knownForms }),
    ...(circleLand === undefined ? {} : { druidCircleLand: circleLand }),
    ...(resilience === undefined ? {} : { fiendishResilience: resilience }),
  };
  if (isNonSpellcastingBuild(input.build)) {
    return Either.right(freshCharacterSheet({ ...common, build: input.build }));
  }
  if (!isSpellcastingBuild(input.build)) {
    return Either.left([{ code: "spellSlotStateInvalid" }]);
  }
  return Either.right(
    freshCharacterSheet({
      ...common,
      build: input.build,
      bookOfShadowsPresence: requireFreshConstructionFact(
        bookOfShadowsPresence,
      ),
      spellSlotExpenditures: [],
      createdSpellSlots: [],
      pactSlotExpenditure: undefined,
    }),
  );
}

type FreshCharacterSheetHitPoints = Extract<
  CharacterSheetHitPoints,
  { readonly tag: "positive" }
> & { readonly tempHp: Hp & 0 };

function freshCharacterSheetHitPoints(
  input: CharacterSheetInput,
): Either.Either<FreshCharacterSheetHitPoints, CharacterSheetIssue> {
  const capacity = characterSheetHitPointCapacity(input);
  if (
    Either.isLeft(capacity) ||
    capacity.right.currentHp !== capacity.right.hitPointMaximum
  ) {
    return characterSheetIssue(
      "Fresh Character Sheet requires full current Hit Points.",
    );
  }
  const hitPoints = characterSheetHitPoints({
    ...input,
    currentHp: capacity.right.currentHp,
    tempHp: FRESH_CHARACTER_SHEET_ZERO_HP,
  });
  if (Either.isLeft(hitPoints) || hitPoints.right.tag !== "positive") {
    return characterSheetIssue(
      "Fresh Character Sheet requires positive conscious Hit Point state.",
    );
  }
  return Either.right({
    ...hitPoints.right,
    tempHp: FRESH_CHARACTER_SHEET_ZERO_HP,
  });
}

function compareConstructionIssues(
  left: CharacterSheetConstructionIssue,
  right: CharacterSheetConstructionIssue,
): number {
  if ("statBlockId" in left && "statBlockId" in right) {
    const identityOrder =
      left.statBlockId < right.statBlockId
        ? -1
        : left.statBlockId > right.statBlockId
          ? 1
          : 0;
    return identityOrder !== 0
      ? identityOrder
      : CHARACTER_SHEET_CONSTRUCTION_ISSUE_CODES.indexOf(left.code) -
          CHARACTER_SHEET_CONSTRUCTION_ISSUE_CODES.indexOf(right.code);
  }
  return (
    CHARACTER_SHEET_CONSTRUCTION_ISSUE_CODES.indexOf(left.code) -
    CHARACTER_SHEET_CONSTRUCTION_ISSUE_CODES.indexOf(right.code)
  );
}

function requireFreshConstructionFact<Value, Error>(
  result: Either.Either<Value, Error>,
): Value {
  if (Either.isRight(result)) return result.right;
  throw new Error("Fresh Character Sheet facts were already accumulated.");
}

export function rebuildCharacterSheet(
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
  const heroicInspiration = heroicInspirationFromInput(input);
  if (Either.isLeft(heroicInspiration)) {
    return Either.left(heroicInspiration.left);
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
  const fiendishResilience = fiendishResilienceFromInput(input);
  if (Either.isLeft(fiendishResilience)) {
    return Either.left(fiendishResilience.left);
  }
  const hitPoints = characterSheetHitPoints({
    ...input,
    currentHp: hitPointCapacity.right.currentHp,
  });
  if (Either.isLeft(hitPoints)) return Either.left(hitPoints.left);
  const commonState = availableSheetCommonState(input, {
    hitPoints: hitPoints.right,
    conditions: conditions.right,
    spentHitDice: spentHitDice.right,
    restFeatureUses: restFeatureUses.right,
    resourceExpenditures: resourceExpenditures.right,
    heroicInspiration: heroicInspiration.right,
    companion: companion.right,
    druidWildShapeKnownForms: druidWildShapeKnownForms.right,
    druidCircleLand: druidCircleLand.right,
    fiendishResilience: fiendishResilience.right,
  });

  if (isNonSpellcastingBuild(input.build)) {
    if (
      input.spellSlotExpenditures !== undefined ||
      storedSpellSlotState !== undefined
    ) {
      return characterSheetIssue(
        "Non-spellcasting Character Sheet cannot carry Spell Slot state.",
      );
    }
    if (input.pactSlots !== undefined) {
      return characterSheetIssue(
        "Non-spellcasting Character Sheet cannot carry Pact Slot state.",
      );
    }
    return Either.right({
      ...commonState,
      build: input.build,
    });
  }

  if (!isSpellcastingBuild(input.build)) {
    return characterSheetIssue(
      "Character build spellcasting state is inconsistent.",
    );
  }
  const build = input.build;
  const spellSlotState =
    storedSpellSlotState === undefined
      ? spellSlotStateFromInput({
          build,
          unitLibrary: input.unitLibrary,
          ...(input.spellSlotExpenditures === undefined
            ? {}
            : { spellSlotExpenditures: input.spellSlotExpenditures }),
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
    ...commonState,
    build,
    bookOfShadowsPresence: bookOfShadowsPresence.right,
    spellSlotExpenditures: spellSlotState.right.ordinarySpellSlotExpenditures,
    createdSpellSlots: spellSlotState.right.createdSpellSlots,
    pactSlotExpenditure: pactSlotExpenditure.right,
  });
}

type AvailableSheetCommonState = Pick<
  CharacterSheet,
  | "companion"
  | "conditions"
  | "heroicInspiration"
  | "hitPoints"
  | "resourceExpenditures"
  | "restFeatureUses"
  | "spentHitDice"
> & {
  readonly druidCircleLand: CharacterSheet["druidCircleLand"];
  readonly druidWildShapeKnownForms: CharacterSheet["druidWildShapeKnownForms"];
  readonly fiendishResilience: CharacterSheet["fiendishResilience"];
};

function availableSheetCommonState(
  input: CharacterSheetInput,
  state: AvailableSheetCommonState,
) {
  return {
    tag: "available" as const,
    characterId: input.characterId,
    hitPointMaximumReduction: input.hitPointMaximumReduction,
    exhaustionLevel: input.exhaustionLevel ?? 0,
    hitPoints: state.hitPoints,
    conditions: state.conditions,
    spentHitDice: state.spentHitDice,
    restFeatureUses: state.restFeatureUses,
    resourceExpenditures: state.resourceExpenditures,
    heroicInspiration: state.heroicInspiration,
    companion: state.companion,
    ...(state.druidWildShapeKnownForms === undefined
      ? {}
      : { druidWildShapeKnownForms: state.druidWildShapeKnownForms }),
    ...(state.druidCircleLand === undefined
      ? {}
      : { druidCircleLand: state.druidCircleLand }),
    ...(state.fiendishResilience === undefined
      ? {}
      : { fiendishResilience: state.fiendishResilience }),
  };
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
  if (Object.hasOwn(value, "maximumHp")) {
    return characterSheetIssue(
      "Stored Character Sheet must not carry build-derived maximum HP.",
    );
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
  if (!Object.hasOwn(value, "hitPointMaximumReduction")) {
    return characterSheetIssue(
      "Character Sheet Hit Point maximum reduction is required.",
    );
  }
  const hitPointMaximumReduction = parseHp(value.hitPointMaximumReduction);
  if (Either.isLeft(hitPointMaximumReduction)) {
    return Either.left(hitPointMaximumReduction.left);
  }
  const exhaustionLevel = parseStoredExhaustionLevel(value.exhaustionLevel);
  if (Either.isLeft(exhaustionLevel)) {
    return Either.left(exhaustionLevel.left);
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
  const heroicInspiration = parseStoredHeroicInspiration(
    value.heroicInspiration,
  );
  if (Either.isLeft(heroicInspiration)) {
    return Either.left(heroicInspiration.left);
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
  const fiendishResilience = parseStoredFiendishResilience(
    value.fiendishResilience,
  );
  if (Either.isLeft(fiendishResilience)) {
    return Either.left(fiendishResilience.left);
  }

  return rebuildCharacterSheet(
    {
      characterId: characterSheetId(value.characterId),
      build: build.right,
      hitPointMaximumReduction: hitPointMaximumReduction.right,
      exhaustionLevel: exhaustionLevel.right,
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
      heroicInspiration: heroicInspiration.right,
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
      ...(fiendishResilience.right === undefined
        ? {}
        : { fiendishResilience: fiendishResilience.right }),
    },
    spellSlots.right,
  );
}

function heroicInspirationFromInput(
  input: Pick<CharacterSheetInput, "heroicInspiration">,
): Either.Either<CharacterSheetHeroicInspiration, CharacterSheetIssue> {
  const state =
    input.heroicInspiration ?? CHARACTER_SHEET_NO_HEROIC_INSPIRATION;
  return state.tag === CHARACTER_SHEET_NO_HEROIC_INSPIRATION.tag ||
    state.tag === CHARACTER_SHEET_HEROIC_INSPIRATION_AVAILABLE.tag
    ? Either.right(state)
    : characterSheetIssue("Expected Character Sheet Heroic Inspiration state.");
}

function parseStoredHeroicInspiration(
  value: unknown,
): Either.Either<CharacterSheetHeroicInspiration, CharacterSheetIssue> {
  if (!isRecord(value)) {
    return characterSheetIssue(
      "Character Sheet requires Heroic Inspiration state.",
    );
  }
  if (value.tag === CHARACTER_SHEET_NO_HEROIC_INSPIRATION.tag) {
    return Either.right(CHARACTER_SHEET_NO_HEROIC_INSPIRATION);
  }
  if (value.tag === CHARACTER_SHEET_HEROIC_INSPIRATION_AVAILABLE.tag) {
    return Either.right(CHARACTER_SHEET_HEROIC_INSPIRATION_AVAILABLE);
  }
  return characterSheetIssue(
    "Expected Character Sheet Heroic Inspiration state.",
  );
}

function parseStoredExhaustionLevel(
  value: unknown,
): Either.Either<CharacterSheetExhaustionLevel, CharacterSheetIssue> {
  if (value === undefined) return Either.right(0);
  if (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 6
  ) {
    return Either.right(value as CharacterSheetExhaustionLevel);
  }
  return characterSheetIssue(
    "Character Sheet Exhaustion level must be an integer from 0 to 6.",
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
  if (use.tag === COMMUNE_CASTING_REST_FEATURE_TAG) {
    if (!Number.isInteger(use.castCount) || use.castCount < 1) {
      return characterSheetIssue(
        "Commune cast count requires a positive integer count.",
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
  if (use.tag === SORCEROUS_RESTORATION_REST_FEATURE_TAG) {
    if (
      Either.isLeft(
        sorcerousRestorationProfileForBuild(input.build, input.unitLibrary),
      )
    ) {
      return characterSheetIssue(
        "Sorcerous Restoration rest feature use requires the Sorcerer level 5 feature.",
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
    if (!recordHasExactKeys(spent, ["classUnitId", "spent"])) {
      return characterSheetIssue(
        "Spent Hit Dice state must contain exactly class Unit id and spent count.",
      );
    }
    const spentCount = parseResourceCount(spent.spent);
    if (Either.isLeft(spentCount)) return Either.left(spentCount.left);
    spentHitDice.push({
      classUnitId: authoredUnitId(spent.classUnitId),
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
        use.tag !== SORCEROUS_RESTORATION_REST_FEATURE_TAG &&
        use.tag !== COMMUNE_CASTING_REST_FEATURE_TAG &&
        use.tag !== SPELL_RECIPIENT_REST_LOCKOUT_TAG) ||
      use.usedSinceLongRest !== true
    ) {
      return characterSheetIssue("Expected supported rest feature use state.");
    }
    if (use.tag === SPELL_RECIPIENT_REST_LOCKOUT_TAG) {
      if (!recordHasExactKeys(use, ["tag", "spellId", "usedSinceLongRest"])) {
        return characterSheetIssue(
          "Spell recipient rest lockout state must contain exactly tag, spell Unit id, and Long Rest use flag.",
        );
      }
      if (typeof use.spellId !== "string") {
        return characterSheetIssue(
          "Spell recipient rest lockout requires a spell Unit id.",
        );
      }
      uses.push({
        tag: use.tag,
        spellId: authoredUnitId(use.spellId),
        usedSinceLongRest: true,
      });
      continue;
    }
    if (use.tag === COMMUNE_CASTING_REST_FEATURE_TAG) {
      if (!recordHasExactKeys(use, ["tag", "usedSinceLongRest", "castCount"])) {
        return characterSheetIssue(
          "Commune casting state must contain exactly tag, Long Rest use flag, and cast count.",
        );
      }
      const castCount = parseResourceCount(use.castCount);
      if (Either.isLeft(castCount)) return Either.left(castCount.left);
      uses.push({
        tag: use.tag,
        usedSinceLongRest: true,
        castCount: castCount.right,
      });
      continue;
    }
    if (!recordHasExactKeys(use, ["tag", "usedSinceLongRest"])) {
      return characterSheetIssue(
        "Character Sheet rest feature use state must contain exactly tag and Long Rest use flag.",
      );
    }
    uses.push({ tag: use.tag, usedSinceLongRest: true });
  }
  return restFeatureUsesFromInput({
    build,
    unitLibrary,
    restFeatureUses: uses,
  });
}
