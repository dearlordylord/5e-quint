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
  type CharacterSheetRebuildInput,
  type CharacterSheetHitPoints,
  type CharacterSheetIssue,
  type CharacterSheetRestFeatureUse,
  type CharacterSheetSpellSlotSourceState,
  type CharacterSheetSpentHitDiePool,
} from "./sheet-types.ts";
import {
  FRESH_CHARACTER_SHEET_ZERO_HP,
  freshCharacterSheet,
  freshCharacterSheetFromParsedState,
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
  /* v8 ignore start -- Malformed fresh-sheet input: in-play HP, condition, rest, or resource state must be empty at construction. */
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
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed fresh-sheet input: Heroic Inspiration must begin in the explicit none state. */
  if (
    input.heroicInspiration !== undefined &&
    input.heroicInspiration.tag !== "none"
  ) {
    issues.push({ code: "heroicInspirationNotEmpty" });
  }
  /* v8 ignore stop */
  const bookOfShadowsPresence = bookOfShadowsPresenceFromInput(input);
  /* v8 ignore start -- Malformed fresh-sheet input: Book of Shadows presence disagrees with the selected build. */
  if (Either.isLeft(bookOfShadowsPresence)) {
    issues.push({ code: "bookOfShadowsPresenceInvalid" });
  }
  /* v8 ignore stop */
  const druidWildShapeKnownForms = druidWildShapeKnownFormsConstruction(input);
  if (Either.isLeft(druidWildShapeKnownForms)) {
    issues.push(...druidWildShapeKnownForms.left);
  }
  const druidCircleLand = druidCircleLandFromInput(input);
  /* v8 ignore start -- Malformed fresh-sheet input: Circle of the Land state is unreadable or disagrees with the selected build and Book of Shadows state. */
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
  /* v8 ignore stop */
  const fiendishResilience = fiendishResilienceFromInput(input);
  /* v8 ignore start -- Malformed fresh-sheet input: Fiendish Resilience state disagrees with the selected build. */
  if (Either.isLeft(fiendishResilience)) {
    issues.push({ code: "fiendishResilienceInvalid" });
  }
  /* v8 ignore stop */

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
    /* v8 ignore start -- Malformed fresh-sheet input: a spellcaster cannot begin with an invalid or expended ordinary Spell Slot projection. */
    if (
      Either.isLeft(spellSlotState) ||
      input.spellSlotExpenditures?.some(
        (expenditure) => expenditure.expended !== 0,
      ) === true
    ) {
      issues.push({ code: "spellSlotStateInvalid" });
    }
    /* v8 ignore stop */
  }
  const pactSlotExpenditure = isSpellcastingBuild(input.build)
    ? pactSlotExpenditureFromInput({
        build: input.build,
        ...(input.pactSlots === undefined
          ? {}
          : { pactSlots: input.pactSlots }),
      })
    : Either.right(undefined);
  /* v8 ignore start -- Malformed fresh-sheet input: a spellcaster cannot begin with invalid or expended Pact Slots. */
  if (
    isSpellcastingBuild(input.build) &&
    (Either.isLeft(pactSlotExpenditure) ||
      (input.pactSlots?.expended ?? 0) !== 0)
  ) {
    issues.push({ code: "pactSlotStateInvalid" });
  }
  /* v8 ignore stop */

  const firstIssue = issues[0];
  if (firstIssue !== undefined) {
    const orderedIssues = [...issues].sort(compareConstructionIssues);
    const firstOrderedIssue = orderedIssues[0];
    /* v8 ignore start -- A nonempty accumulated issue list necessarily remains nonempty after sorting. */
    if (firstOrderedIssue === undefined) {
      throw new Error("Character Sheet construction issue ordering failed.");
    }
    /* v8 ignore stop */
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
  /* v8 ignore start -- The parsed CharacterBuild union is exhaustive between spellcasting and non-spellcasting variants. */
  if (!isSpellcastingBuild(input.build)) {
    return Either.left([{ code: "spellSlotStateInvalid" }]);
  }
  /* v8 ignore stop */
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
  /* v8 ignore start -- Malformed fresh-sheet input: current HP must equal the build-derived effective maximum. */
  if (
    Either.isLeft(capacity) ||
    capacity.right.currentHp !== capacity.right.hitPointMaximum
  ) {
    return characterSheetIssue(
      "Fresh Character Sheet requires full current Hit Points.",
    );
  }
  /* v8 ignore stop */
  const hitPoints = characterSheetHitPoints({
    ...input,
    currentHp: capacity.right.currentHp,
    tempHp: FRESH_CHARACTER_SHEET_ZERO_HP,
  });
  /* v8 ignore start -- Internal invariant: full positive build capacity above constructs a conscious positive-HP fresh state. */
  if (Either.isLeft(hitPoints) || hitPoints.right.tag !== "positive") {
    return characterSheetIssue(
      "Fresh Character Sheet requires positive conscious Hit Point state.",
    );
  }
  /* v8 ignore stop */
  return Either.right({
    ...hitPoints.right,
    tempHp: FRESH_CHARACTER_SHEET_ZERO_HP,
  });
}

function compareConstructionIssues(
  left: CharacterSheetConstructionIssue,
  right: CharacterSheetConstructionIssue,
): number {
  /* v8 ignore start -- This ordering is exercised only for batches of malformed fresh-sheet inputs, including multiple Stat Block-specific issues. */
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
  /* v8 ignore stop */
}

function requireFreshConstructionFact<Value, Error>(
  result: Either.Either<Value, Error>,
): Value {
  /* v8 ignore next -- Internal invariant: createFreshCharacterSheet calls this only after accumulating no issue from the same parsed fact. */
  if (Either.isRight(result)) return result.right;
  /* v8 ignore start -- Internal invariant: the Left branch is unreachable after the immediately preceding no-issues gate. */
  throw new Error("Fresh Character Sheet facts were already accumulated.");
  /* v8 ignore stop */
}

export function rebuildCharacterSheet(
  input: CharacterSheetRebuildInput,
  storedSpellSlotState?: CharacterSheetSpellSlotSourceState,
): Either.Either<CharacterSheet, CharacterSheetIssue> {
  const hitPointCapacity = characterSheetHitPointCapacity(input);
  /* v8 ignore start -- Malformed rebuild input: build and retained HP facts must still yield one correlated effective capacity. */
  if (Either.isLeft(hitPointCapacity))
    return Either.left(hitPointCapacity.left);
  /* v8 ignore stop */
  const spentHitDice = spentHitDiceFromInput(input);
  /* v8 ignore next -- Rebuild spent-Hit-Dice rejection is malformed retained pool input. */
  if (Either.isLeft(spentHitDice)) return Either.left(spentHitDice.left);
  const restFeatureUses = restFeatureUsesFromInput(input);
  /* v8 ignore next -- Rebuild rest-use rejection is malformed retained feature-use input. */
  if (Either.isLeft(restFeatureUses)) return Either.left(restFeatureUses.left);
  const conditions = conditionsFromInput(input.conditions);
  /* v8 ignore next -- Rebuild condition rejection is malformed retained condition input. */
  if (Either.isLeft(conditions)) return Either.left(conditions.left);
  const resourceExpenditures = resourceExpendituresFromInput(input);
  /* v8 ignore start -- Malformed rebuild input: retained resource expenditures failed correlation with the admitted build resources. */
  if (Either.isLeft(resourceExpenditures)) {
    return Either.left(resourceExpenditures.left);
  }
  /* v8 ignore stop */
  const heroicInspiration = heroicInspirationFromInput(input);
  /* v8 ignore start -- Malformed rebuild input: Heroic Inspiration failed its closed-state parser. */
  if (Either.isLeft(heroicInspiration)) {
    return Either.left(heroicInspiration.left);
  }
  /* v8 ignore stop */
  const companion = companionFromInput(input.companion);
  /* v8 ignore start -- Malformed rebuild input: retained companion state failed its closed-state parser. */
  if (Either.isLeft(companion)) {
    return Either.left(companion.left);
  }
  /* v8 ignore stop */
  const bookOfShadowsPresence = bookOfShadowsPresenceFromInput(input);
  /* v8 ignore start -- Malformed rebuild input: Book of Shadows presence disagrees with the selected build. */
  if (Either.isLeft(bookOfShadowsPresence)) {
    return Either.left(bookOfShadowsPresence.left);
  }
  /* v8 ignore stop */
  const druidWildShapeKnownForms = druidWildShapeKnownFormsFromInput(input);
  /* v8 ignore start -- Malformed rebuild input: retained Wild Shape forms disagree with the admitted Druid build and catalog. */
  if (Either.isLeft(druidWildShapeKnownForms)) {
    return Either.left(druidWildShapeKnownForms.left);
  }
  /* v8 ignore stop */
  const druidCircleLand = druidCircleLandFromInput(input);
  /* v8 ignore start -- Malformed rebuild input: retained Circle of the Land state disagrees with the admitted Druid build and catalog. */
  if (Either.isLeft(druidCircleLand)) {
    return Either.left(druidCircleLand.left);
  }
  /* v8 ignore stop */
  const druidCircleBookOfShadowsIssue =
    storedBookOfShadowsDruidCircleLandSelectionIssue({
      build: input.build,
      unitLibrary: input.unitLibrary,
      circleLand: druidCircleLand.right,
    });
  /* v8 ignore start -- Malformed rebuild input: retained Book of Shadows and Circle of the Land selections violate their admitted cross-feature constraint. */
  if (Either.isLeft(druidCircleBookOfShadowsIssue)) {
    return Either.left(druidCircleBookOfShadowsIssue.left);
  }
  /* v8 ignore stop */
  const fiendishResilience = fiendishResilienceFromInput(input);
  /* v8 ignore start -- Malformed rebuild input: retained Fiendish Resilience state disagrees with the admitted Warlock build and catalog. */
  if (Either.isLeft(fiendishResilience)) {
    return Either.left(fiendishResilience.left);
  }
  /* v8 ignore stop */
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
    /* v8 ignore start -- Malformed rebuild input: a non-spellcasting build cannot carry ordinary or Pact Magic slot state. */
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
    /* v8 ignore stop */
    return Either.right({
      ...commonState,
      build: input.build,
    });
  }

  if (!isSpellcastingBuild(input.build)) {
    /* v8 ignore start -- The parsed CharacterBuild union is exhaustive between spellcasting and non-spellcasting variants. */
    return characterSheetIssue(
      "Character build spellcasting state is inconsistent.",
    );
    /* v8 ignore stop */
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
  /* v8 ignore start -- Malformed rebuild input: Pact Slot expenditure failed correlation with the parsed build capacity. */
  if (Either.isLeft(pactSlotExpenditure)) {
    return Either.left(pactSlotExpenditure.left);
  }
  /* v8 ignore stop */

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
  input: CharacterSheetInput | CharacterSheetRebuildInput,
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
  input: CharacterSheetInput | CharacterSheetRebuildInput,
): Either.Either<
  CharacterSheetBookOfShadowsPresence | undefined,
  CharacterSheetIssue
> {
  if (!characterBuildHasBookOfShadows(input.build)) {
    /* v8 ignore start -- Malformed sheet input: Book of Shadows presence is supplied without the corresponding selected access. */
    return input.bookOfShadowsPresence === undefined
      ? Either.right(undefined)
      : characterSheetIssue(
          "Character Sheet Book of Shadows presence requires Book of Shadows selection.",
        );
    /* v8 ignore stop */
  }
  return Either.right(input.bookOfShadowsPresence ?? { tag: "onPerson" });
}

export function parseCharacterSheet(
  value: unknown,
  unitLibrary: UnitCatalog,
): Either.Either<CharacterSheet, CharacterSheetIssue> {
  /* v8 ignore next -- Malformed stored sheet: the raw persistence boundary requires a record before any field parsing. */
  if (!isRecord(value)) return characterSheetIssue("Expected Character Sheet.");
  /* v8 ignore start -- Malformed stored sheet: the top-level tag or character id does not match the available-sheet wire shape. */
  if (value.tag !== "available") {
    return characterSheetIssue("Expected available Character Sheet.");
  }
  if (typeof value.characterId !== "string") {
    return characterSheetIssue("Character Sheet requires character id.");
  }
  /* v8 ignore stop */
  if (Object.hasOwn(value, "maximumHp")) {
    return characterSheetIssue(
      "Stored Character Sheet must not carry build-derived maximum HP.",
    );
  }
  const build = parseCharacterBuild(value.build, unitLibrary);
  /* v8 ignore next -- Character Build parser rejection is malformed stored build input. */
  if (Either.isLeft(build)) return Either.left(build.left);
  const bookOfShadowsPresence = parseStoredCharacterSheetBookOfShadowsPresence(
    build.right,
    value.bookOfShadowsPresence,
  );
  /* v8 ignore start -- Malformed stored sheet: Book of Shadows presence failed correlation with the parsed build. */
  if (Either.isLeft(bookOfShadowsPresence)) {
    return Either.left(bookOfShadowsPresence.left);
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed stored sheet: the required Hit Point maximum reduction field is absent or invalid. */
  if (!Object.hasOwn(value, "hitPointMaximumReduction")) {
    return characterSheetIssue(
      "Character Sheet Hit Point maximum reduction is required.",
    );
  }
  const hitPointMaximumReduction = parseHp(value.hitPointMaximumReduction);
  if (Either.isLeft(hitPointMaximumReduction)) {
    return Either.left(hitPointMaximumReduction.left);
  }
  /* v8 ignore stop */
  const exhaustionLevel = parseStoredExhaustionLevel(value.exhaustionLevel);
  /* v8 ignore start -- Malformed stored sheet: Exhaustion is outside its closed integer range. */
  if (Either.isLeft(exhaustionLevel)) {
    return Either.left(exhaustionLevel.left);
  }
  /* v8 ignore stop */
  const hitPoints = parseStoredHitPoints(value.hitPoints);
  /* v8 ignore next -- Hit Point parser rejection is malformed stored HP input. */
  if (Either.isLeft(hitPoints)) return Either.left(hitPoints.left);
  const conditions = parseStoredConditions(value.conditions);
  /* v8 ignore next -- Condition parser rejection is malformed stored condition input. */
  if (Either.isLeft(conditions)) return Either.left(conditions.left);
  const spentHitDice = parseStoredSpentHitDice(value.spentHitDice);
  /* v8 ignore next -- Spent-Hit-Dice parser rejection is malformed stored pool input. */
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
  /* v8 ignore start -- Malformed stored sheet: Heroic Inspiration failed its closed tagged-state parser. */
  if (Either.isLeft(heroicInspiration)) {
    return Either.left(heroicInspiration.left);
  }
  /* v8 ignore stop */
  const companion = parseStoredCharacterSheetCompanion(value.companion);
  /* v8 ignore next -- Companion parser rejection is malformed stored companion input. */
  if (Either.isLeft(companion)) return Either.left(companion.left);
  const spellSlots = parseStoredSpellSlots(build.right, unitLibrary, value);
  /* v8 ignore next -- Spell Slot parser rejection is malformed stored slot input. */
  if (Either.isLeft(spellSlots)) return Either.left(spellSlots.left);
  const pactSlots = parseStoredPactSlots(build.right, value);
  /* v8 ignore next -- Pact Slot parser rejection is malformed stored Pact input. */
  if (Either.isLeft(pactSlots)) return Either.left(pactSlots.left);
  const restFeatureUses = parseStoredRestFeatureUses(
    build.right,
    unitLibrary,
    value.restFeatureUses,
  );
  /* v8 ignore next -- Rest-feature parser rejection is malformed stored use-state input. */
  if (Either.isLeft(restFeatureUses)) return Either.left(restFeatureUses.left);
  const druidWildShapeKnownForms = parseStoredDruidWildShapeKnownForms(
    value.druidWildShapeKnownForms,
  );
  /* v8 ignore start -- Malformed stored sheet: the optional Wild Shape known-form roster failed its boundary parser. */
  if (Either.isLeft(druidWildShapeKnownForms)) {
    return Either.left(druidWildShapeKnownForms.left);
  }
  /* v8 ignore stop */
  const druidCircleLand = parseStoredDruidCircleLand(value.druidCircleLand);
  /* v8 ignore start -- Malformed stored sheet: the optional Druid Circle land selection failed its boundary parser. */
  if (Either.isLeft(druidCircleLand)) {
    return Either.left(druidCircleLand.left);
  }
  /* v8 ignore stop */
  const fiendishResilience = parseStoredFiendishResilience(
    value.fiendishResilience,
  );
  /* v8 ignore start -- Malformed stored sheet: the optional Fiendish Resilience selection failed its boundary parser. */
  if (Either.isLeft(fiendishResilience)) {
    return Either.left(fiendishResilience.left);
  }
  /* v8 ignore stop */

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

export function parseFreshCharacterSheet(
  value: unknown,
  unitLibrary: UnitCatalog,
): Either.Either<FreshCharacterSheet, CharacterSheetIssue> {
  const parsed = parseCharacterSheet(value, unitLibrary);
  if (Either.isLeft(parsed)) return Either.left(parsed.left);
  const sheet = parsed.right;
  const maximum = characterSheetHitPointCapacity({
    build: sheet.build,
    unitLibrary,
    currentHp:
      sheet.hitPoints.tag === "positive"
        ? sheet.hitPoints.currentHp
        : sheet.hitPoints.tag === "knockedOut"
          ? Hp(1)
          : Hp(0),
    hitPointMaximumReduction: sheet.hitPointMaximumReduction,
  });
  if (
    Either.isLeft(maximum) ||
    sheet.hitPoints.tag !== "positive" ||
    maximum.right.currentHp !== maximum.right.hitPointMaximum
  ) {
    return characterSheetIssue(
      "Fresh Character Sheet requires full current Hit Points.",
    );
  }
  const fresh = freshCharacterSheetFromParsedState(sheet);
  return Either.isRight(fresh)
    ? Either.right(fresh.right)
    : characterSheetIssue(fresh.left);
}

function heroicInspirationFromInput(
  input: Pick<CharacterSheetInput, "heroicInspiration">,
): Either.Either<CharacterSheetHeroicInspiration, CharacterSheetIssue> {
  const state =
    input.heroicInspiration ?? CHARACTER_SHEET_NO_HEROIC_INSPIRATION;
  /* v8 ignore start -- Malformed typed input: Heroic Inspiration carries a tag outside its closed state union. */
  return state.tag === CHARACTER_SHEET_NO_HEROIC_INSPIRATION.tag ||
    state.tag === CHARACTER_SHEET_HEROIC_INSPIRATION_AVAILABLE.tag
    ? Either.right(state)
    : characterSheetIssue("Expected Character Sheet Heroic Inspiration state.");
  /* v8 ignore stop */
}

function parseStoredHeroicInspiration(
  value: unknown,
): Either.Either<CharacterSheetHeroicInspiration, CharacterSheetIssue> {
  /* v8 ignore start -- Malformed stored sheet: Heroic Inspiration is absent or not a closed tagged-state record. */
  if (!isRecord(value)) {
    return characterSheetIssue(
      "Character Sheet requires Heroic Inspiration state.",
    );
  }
  /* v8 ignore stop */
  if (value.tag === CHARACTER_SHEET_NO_HEROIC_INSPIRATION.tag) {
    return Either.right(CHARACTER_SHEET_NO_HEROIC_INSPIRATION);
  }
  if (value.tag === CHARACTER_SHEET_HEROIC_INSPIRATION_AVAILABLE.tag) {
    return Either.right(CHARACTER_SHEET_HEROIC_INSPIRATION_AVAILABLE);
  }
  /* v8 ignore start -- Malformed stored sheet: Heroic Inspiration carries a tag outside the closed none/available roster. */
  return characterSheetIssue(
    "Expected Character Sheet Heroic Inspiration state.",
  );
  /* v8 ignore stop */
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
  /* v8 ignore start -- Malformed stored sheet: Exhaustion is not an integer in the closed 0-through-6 range. */
  return characterSheetIssue(
    "Character Sheet Exhaustion level must be an integer from 0 to 6.",
  );
  /* v8 ignore stop */
}

function spentHitDiceFromInput(
  input: Pick<CharacterSheetInput, "build" | "spentHitDice" | "unitLibrary">,
): Either.Either<
  readonly CharacterSheetSpentHitDiePool[],
  CharacterSheetIssue
> {
  const capacity = characterBuildHitDice(input.build, input.unitLibrary);
  /* v8 ignore next -- Malformed build/catalog correlation: admitted class progression must still yield its Hit Die capacities. */
  if (Either.isLeft(capacity)) return Either.left(capacity.left);
  const spentHitDice = input.spentHitDice ?? [];
  const spentByClass = new Map<UnitRecord["id"], ResourceCount>();
  for (const spent of spentHitDice) {
    /* v8 ignore start -- Malformed sheet input: spent Hit Dice duplicates a class pool. */
    if (spentByClass.has(spent.classUnitId)) {
      return characterSheetIssue("Spent Hit Dice state must not duplicate.");
    }
    /* v8 ignore stop */
    spentByClass.set(spent.classUnitId, spent.spent);
  }
  const capacityByClass = new Map(
    capacity.right.map((pool) => [pool.classUnitId, pool]),
  );
  const result = [];
  for (const spent of spentHitDice) {
    const pool = capacityByClass.get(spent.classUnitId);
    /* v8 ignore start -- Malformed sheet input: a spent Hit Die pool names no class retained by the build. */
    if (pool === undefined) {
      return characterSheetIssue(
        "Spent Hit Dice state must match build Hit Dice exactly.",
      );
    }
    /* v8 ignore stop */
    /* v8 ignore start -- Malformed sheet input: a spent Hit Die count is nonintegral, negative, or above its build-derived pool. */
    if (
      !Number.isInteger(spent.spent) ||
      spent.spent < 0 ||
      spent.spent > pool.total
    ) {
      return characterSheetIssue(
        "Spent Hit Dice state cannot exceed build Hit Dice.",
      );
    }
    /* v8 ignore stop */
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
    /* v8 ignore start -- Malformed sheet input: retained rest-feature use state must explicitly record Long-Rest use. */
    if (use.usedSinceLongRest !== true) {
      return characterSheetIssue("Expected supported rest feature use state.");
    }
    /* v8 ignore stop */
    const useKey = restFeatureUseStateKey(use);
    /* v8 ignore start -- Malformed sheet input: rest-feature use state duplicates the same feature or spell-recipient lockout key. */
    if (usedFeatureTags.has(useKey)) {
      return characterSheetIssue("Rest feature use state must not duplicate.");
    }
    /* v8 ignore stop */
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
    /* v8 ignore start -- Malformed retained rest state: a spell lockout must reference the admitted rest-benefit profile that created it. */
    if (Either.isLeft(profile)) {
      return characterSheetIssue(
        "Spell recipient rest lockout requires an admitted spell rest-benefit profile.",
      );
    }
    /* v8 ignore stop */
    return Either.right(undefined);
  }
  if (use.tag === COMMUNE_CASTING_REST_FEATURE_TAG) {
    /* v8 ignore start -- Malformed Commune state: the retained cast count is not a positive integer. */
    if (!Number.isInteger(use.castCount) || use.castCount < 1) {
      return characterSheetIssue(
        "Commune cast count requires a positive integer count.",
      );
    }
    /* v8 ignore stop */
    return Either.right(undefined);
  }
  if (use.tag === ARCANE_RECOVERY_REST_FEATURE_TAG) {
    /* v8 ignore start -- Malformed retained rest state: Arcane Recovery use requires the admitted Wizard recovery profile that created it. */
    if (
      Either.isLeft(
        restSpellSlotRecoveryProfileForBuild(input.build, input.unitLibrary),
      )
    ) {
      return characterSheetIssue(
        "Arcane Recovery rest feature use requires the Wizard Arcane Recovery feature.",
      );
    }
    /* v8 ignore stop */
    return Either.right(undefined);
  }
  if (use.tag === MAGICAL_CUNNING_REST_FEATURE_TAG) {
    /* v8 ignore start -- Malformed rest state: Magical Cunning use is retained by a build without its admitted recovery profile. */
    if (
      Either.isLeft(
        pactSlotRecoveryProfileForBuild(input.build, input.unitLibrary),
      )
    ) {
      return characterSheetIssue(
        "Magical Cunning rest feature use requires the Warlock Magical Cunning feature.",
      );
    }
    /* v8 ignore stop */
    return Either.right(undefined);
  }
  if (use.tag === UNCANNY_METABOLISM_REST_FEATURE_TAG) {
    const facts = characterBuildMonkUncannyMetabolismFacts(input);
    /* v8 ignore next -- Malformed build/catalog correlation: Uncanny Metabolism facts can fail only when admitted Monk Units no longer resolve. */
    if (Either.isLeft(facts)) return characterSheetIssue(facts.left.message);
    /* v8 ignore start -- Malformed retained rest state: Uncanny Metabolism use requires the admitted Monk feature that created it. */
    if (facts.right === undefined) {
      return characterSheetIssue(
        "Uncanny Metabolism rest feature use requires the Monk Uncanny Metabolism feature.",
      );
    }
    /* v8 ignore stop */
    return Either.right(undefined);
  }
  /* v8 ignore start -- Malformed retained state: this final range contains only a Sorcerous Restoration use without its admitted profile or an unknown tag outside the closed CharacterSheetRestFeatureUse union. */
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
  /* v8 ignore stop */
}

function conditionsFromInput(
  conditions: readonly CharacterSheetCondition[],
): Either.Either<readonly CharacterSheetCondition[], CharacterSheetIssue> {
  const active = new Set<CharacterSheetCondition>();
  for (const condition of conditions) {
    /* v8 ignore start -- Malformed sheet input: a condition is outside the closed non-Unconscious roster or is duplicated. */
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
    /* v8 ignore stop */
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
  /* v8 ignore start -- Malformed stored sheet: spent Hit Dice state is absent, non-list, or contains an invalid entry/count shape. */
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
    /* v8 ignore stop */
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
  /* v8 ignore start -- Malformed stored sheet: condition state is absent, non-list, or contains a value outside the closed condition roster. */
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
    /* v8 ignore stop */
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
  /* v8 ignore start -- Malformed stored sheet: rest-feature use state is not a list of exact supported tagged records. */
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
      /* v8 ignore stop */
      uses.push({
        tag: use.tag,
        spellId: authoredUnitId(use.spellId),
        usedSinceLongRest: true,
      });
      continue;
    }
    if (use.tag === COMMUNE_CASTING_REST_FEATURE_TAG) {
      /* v8 ignore start -- Malformed stored sheet: Commune use state has extra fields or an invalid cast-count value. */
      if (!recordHasExactKeys(use, ["tag", "usedSinceLongRest", "castCount"])) {
        return characterSheetIssue(
          "Commune casting state must contain exactly tag, Long Rest use flag, and cast count.",
        );
      }
      const castCount = parseResourceCount(use.castCount);
      if (Either.isLeft(castCount)) return Either.left(castCount.left);
      /* v8 ignore stop */
      uses.push({
        tag: use.tag,
        usedSinceLongRest: true,
        castCount: castCount.right,
      });
      continue;
    }
    /* v8 ignore start -- Malformed stored sheet: a simple rest-feature use record carries fields beyond its tag and Long-Rest flag. */
    if (!recordHasExactKeys(use, ["tag", "usedSinceLongRest"])) {
      return characterSheetIssue(
        "Character Sheet rest feature use state must contain exactly tag and Long Rest use flag.",
      );
    }
    /* v8 ignore stop */
    uses.push({ tag: use.tag, usedSinceLongRest: true });
  }
  return restFeatureUsesFromInput({
    build,
    unitLibrary,
    restFeatureUses: uses,
  });
}
