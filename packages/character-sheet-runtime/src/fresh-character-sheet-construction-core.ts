import type { StatBlockCatalog } from "@dnd/surface/surface/stat-block-catalog-contract";
import { Hp, type ReadonlyNonEmptyArray } from "@dnd/shared/types";
import { Result } from "effect";

import {
  characterBuildHasBookOfShadows,
  isNonSpellcastingBuild,
  isSpellcastingBuild,
} from "./character-build-shape.ts";
import {
  druidCircleLandFromInput,
  druidWildShapeKnownFormsConstructionWithStatBlockCatalog,
  storedBookOfShadowsDruidCircleLandSelectionIssue,
} from "./druid-features-core.ts";
import {
  FRESH_CHARACTER_SHEET_ZERO_HP,
  freshCharacterSheet,
  type FreshCharacterSheet,
} from "./fresh-character-sheet.ts";
import {
  characterSheetHitPointCapacity,
  characterSheetHitPoints,
} from "./hit-points.ts";
import { fiendishResilienceFromInput } from "./passive-defenses.ts";
import {
  pactSlotExpenditureFromInput,
  spellSlotStateFromInput,
} from "./spell-slots.ts";
import {
  CHARACTER_SHEET_CONSTRUCTION_ISSUE_CODES,
  characterSheetIssue,
  type CharacterSheetBookOfShadowsPresence,
  type CharacterSheetConstructionIssue,
  type CharacterSheetHitPoints,
  type CharacterSheetInput,
  type CharacterSheetIssue,
} from "./sheet-types.ts";

export type FreshCharacterSheetConstructionInput = CharacterSheetInput & {
  readonly statBlockCatalog: StatBlockCatalog;
};

export function createFreshCharacterSheetWithStatBlockCatalog(
  input: FreshCharacterSheetConstructionInput,
): Result.Result<
  FreshCharacterSheet,
  ReadonlyNonEmptyArray<CharacterSheetConstructionIssue>
> {
  const issues: CharacterSheetConstructionIssue[] = [];
  const hitPoints = freshCharacterSheetHitPoints(input);
  if (Result.isFailure(hitPoints))
    issues.push({ code: "hitPointStateInvalid" });
  if (input.tempHp !== 0) issues.push({ code: "temporaryHitPointsNotZero" });
  if (input.hitPointMaximumReduction !== 0) {
    issues.push({ code: "hitPointMaximumReductionNotZero" });
  }
  if ((input.exhaustionLevel ?? 0) !== 0) {
    issues.push({ code: "exhaustionNotZero" });
  }
  if (input.conditions.length !== 0)
    issues.push({ code: "conditionsNotEmpty" });
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

  const bookOfShadowsPresence = bookOfShadowsPresenceFromInput(input);
  if (Result.isFailure(bookOfShadowsPresence)) {
    issues.push({ code: "bookOfShadowsPresenceInvalid" });
  }
  const druidWildShapeKnownForms =
    druidWildShapeKnownFormsConstructionWithStatBlockCatalog(input);
  if (Result.isFailure(druidWildShapeKnownForms)) {
    issues.push(...druidWildShapeKnownForms.failure);
  }
  const druidCircleLand = druidCircleLandFromInput(input);
  if (Result.isFailure(druidCircleLand)) {
    issues.push({ code: "druidCircleLandInvalid" });
  } else if (
    Result.isFailure(
      storedBookOfShadowsDruidCircleLandSelectionIssue({
        build: input.build,
        unitLibrary: input.unitLibrary,
        circleLand: druidCircleLand.success,
      }),
    )
  ) {
    issues.push({ code: "druidCircleLandInvalid" });
  }
  const fiendishResilience = fiendishResilienceFromInput(input);
  if (Result.isFailure(fiendishResilience)) {
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
    : Result.succeed(undefined);
  if (isNonSpellcastingBuild(input.build)) {
    if (input.spellSlotExpenditures !== undefined) {
      issues.push({ code: "spellSlotStateUnexpected" });
    }
    if (input.pactSlots !== undefined) {
      issues.push({ code: "pactSlotStateUnexpected" });
    }
  } else if (
    Result.isFailure(spellSlotState) ||
    input.spellSlotExpenditures?.some(
      (expenditure) => expenditure.expended !== 0,
    ) === true
  ) {
    issues.push({ code: "spellSlotStateInvalid" });
  }

  const pactSlotExpenditure = isSpellcastingBuild(input.build)
    ? pactSlotExpenditureFromInput({
        build: input.build,
        ...(input.pactSlots === undefined
          ? {}
          : { pactSlots: input.pactSlots }),
      })
    : Result.succeed(undefined);
  if (
    isSpellcastingBuild(input.build) &&
    (Result.isFailure(pactSlotExpenditure) ||
      (input.pactSlots?.expended ?? 0) !== 0)
  ) {
    issues.push({ code: "pactSlotStateInvalid" });
  }

  if (issues.length > 0) {
    const orderedIssues = [...issues].sort(compareConstructionIssues);
    const firstIssue = orderedIssues[0];
    if (firstIssue === undefined) {
      throw new Error("Character Sheet construction issue ordering failed.");
    }
    return Result.fail([firstIssue, ...orderedIssues.slice(1)]);
  }

  const knownForms = requireFreshConstructionFact(druidWildShapeKnownForms);
  const circleLand = requireFreshConstructionFact(druidCircleLand);
  const resilience = requireFreshConstructionFact(fiendishResilience);
  const common = {
    tag: "available" as const,
    characterId: input.characterId,
    hitPointMaximumReduction: FRESH_CHARACTER_SHEET_ZERO_HP,
    exhaustionLevel: 0 as const,
    hitPoints: requireFreshConstructionFact(hitPoints),
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
    return Result.succeed(
      freshCharacterSheet({ ...common, build: input.build }),
    );
  }
  if (!isSpellcastingBuild(input.build)) {
    return Result.fail([{ code: "spellSlotStateInvalid" }]);
  }
  return Result.succeed(
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
): Result.Result<FreshCharacterSheetHitPoints, CharacterSheetIssue> {
  const capacity = characterSheetHitPointCapacity(input);
  if (
    Result.isFailure(capacity) ||
    capacity.success.currentHp !== capacity.success.hitPointMaximum
  ) {
    return characterSheetIssue(
      "Fresh Character Sheet requires full current Hit Points.",
    );
  }
  const hitPoints = characterSheetHitPoints({
    ...input,
    currentHp: capacity.success.currentHp,
    tempHp: FRESH_CHARACTER_SHEET_ZERO_HP,
  });
  if (Result.isFailure(hitPoints) || hitPoints.success.tag !== "positive") {
    return characterSheetIssue(
      "Fresh Character Sheet requires positive conscious Hit Point state.",
    );
  }
  return Result.succeed({
    ...hitPoints.success,
    tempHp: FRESH_CHARACTER_SHEET_ZERO_HP,
  });
}

function bookOfShadowsPresenceFromInput(
  input: CharacterSheetInput,
): Result.Result<
  CharacterSheetBookOfShadowsPresence | undefined,
  CharacterSheetIssue
> {
  if (!characterBuildHasBookOfShadows(input.build)) {
    return input.bookOfShadowsPresence === undefined
      ? Result.succeed(undefined)
      : characterSheetIssue(
          "Character Sheet Book of Shadows presence requires Book of Shadows selection.",
        );
  }
  return Result.succeed(input.bookOfShadowsPresence ?? { tag: "onPerson" });
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
  result: Result.Result<Value, Error>,
): Value {
  if (Result.isSuccess(result)) return result.success;
  throw new Error("Fresh Character Sheet facts were already accumulated.");
}
