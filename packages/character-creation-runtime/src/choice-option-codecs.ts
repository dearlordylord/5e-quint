// UNIT-PROFILE-COVERAGE: runtime-owner character-creation.origin-feat-proficiency-choice character-creation.species-trait-proficiency-choice character-creation.species-origin-feat-proficiency-choice
import { Match } from "effect";
import * as Either from "effect/Either";
import { SURFACE_ABILITIES } from "@dnd/shared/game-facts";
import {
  abilityScore,
  PositiveInteger,
  type AbilityScore as AbilityScoreType,
  type PositiveInteger as PositiveIntegerType,
} from "@dnd/shared/types";
import {
  ARMOR_TRAINING_CATEGORIES,
  SKILLS,
  WEAPON_PROFICIENCY_CATEGORIES,
} from "@dnd/surface/surface/types";
import type {
  Ability,
  ProficiencyGrantSubject,
} from "@dnd/surface/surface/types";
import { skillOption } from "./hole-factories.ts";
import {
  creationChoiceOptionId,
  isCharacterBuildToolProficiencyId,
  MUSICAL_INSTRUMENT_TOOL_PROFICIENCY_IDS,
  toolProficiencyId,
  type CreationChoiceOption,
  type CreationChoiceOptionDecodeCause,
  type CreationChoiceOptionId,
  type ToolProficiencyId,
} from "./types.ts";

export type AbilityScoreIncreaseDeltaWithCap = {
  readonly ability: Ability;
  readonly increase: PositiveIntegerType;
  readonly maxScore: AbilityScoreType;
};

export type ParsedProficiencyGrantSubject =
  | Extract<ProficiencyGrantSubject, { readonly kind: "skill" }>
  | Extract<ProficiencyGrantSubject, { readonly kind: "weapon_category" }>
  | Extract<ProficiencyGrantSubject, { readonly kind: "armor_category" }>
  | {
      readonly kind: "tool";
      readonly toolId: ToolProficiencyId;
    };

export type ChoiceOptionCodecIssue = {
  readonly tag: "choiceOptionCodecIssue";
  readonly optionId: string;
  readonly cause: CreationChoiceOptionDecodeCause;
};

function choiceOptionCodecIssue(
  optionId: string,
  cause: CreationChoiceOptionDecodeCause,
): Either.Either<never, ChoiceOptionCodecIssue> {
  return Either.left({
    tag: "choiceOptionCodecIssue",
    optionId,
    cause,
  });
}

export function abilityScoreIncreaseOneScoreOptionId(input: {
  readonly ability: Ability;
  readonly increase: PositiveIntegerType;
  readonly maxScore: AbilityScoreType;
}): CreationChoiceOptionId {
  return creationChoiceOptionId(
    `ability_score:${input.ability}:+${input.increase}:max${input.maxScore}`,
  );
}

export function requireAbilityScoreIncreaseTwoScoresOptionId(input: {
  readonly primary: Ability;
  readonly primaryIncrease: PositiveIntegerType;
  readonly secondary: Ability;
  readonly secondaryIncrease: PositiveIntegerType;
  readonly maxScore: AbilityScoreType;
}): CreationChoiceOptionId {
  /* v8 ignore start -- Typed callers construct two-score options only after proving the abilities differ. */
  if (input.primary === input.secondary) {
    throw new Error(
      "Ability Score Increase two-score option ids require distinct ability scores.",
    );
  }
  /* v8 ignore stop */

  return creationChoiceOptionId(
    `ability_scores:${input.primary}:+${input.primaryIncrease};${input.secondary}:+${input.secondaryIncrease}:max${input.maxScore}`,
  );
}

export function decodeAbilityScoreIncreaseOptionId(
  optionId: CreationChoiceOptionId | string,
): Either.Either<
  readonly AbilityScoreIncreaseDeltaWithCap[],
  ChoiceOptionCodecIssue
> {
  const optionIdText = String(optionId);
  const oneScore = optionIdText.match(
    /^ability_score:([^:;]+):\+(\d+):max(\d+)$/,
  );
  if (oneScore != null) {
    const ability = oneScore[1];
    if (!isOneOf(SURFACE_ABILITIES, ability)) {
      return choiceOptionCodecIssue(optionIdText, {
        tag: "unsupportedAbility",
      });
    }
    const increase = decodePositiveAbilityScoreIncreaseValue(
      oneScore[2],
      optionIdText,
      "increase",
    );
    if (Either.isLeft(increase)) return Either.left(increase.left);
    const maximum = decodeAbilityScoreMaximum(oneScore[3], optionIdText);
    if (Either.isLeft(maximum)) return Either.left(maximum.left);

    return Either.right([
      {
        ability,
        increase: increase.right,
        maxScore: maximum.right,
      },
    ]);
  }

  const twoScores = optionIdText.match(
    /^ability_scores:([^:;]+):\+(\d+);([^:;]+):\+(\d+):max(\d+)$/,
  );
  if (twoScores != null) {
    const primary = twoScores[1];
    const secondary = twoScores[3];
    if (
      !isOneOf(SURFACE_ABILITIES, primary) ||
      !isOneOf(SURFACE_ABILITIES, secondary)
    ) {
      return choiceOptionCodecIssue(optionIdText, {
        tag: "unsupportedAbility",
      });
    }
    if (primary === secondary) {
      return choiceOptionCodecIssue(optionIdText, {
        tag: "duplicateAbilities",
      });
    }
    const primaryIncrease = decodePositiveAbilityScoreIncreaseValue(
      twoScores[2],
      optionIdText,
      "increase",
    );
    if (Either.isLeft(primaryIncrease)) {
      return Either.left(primaryIncrease.left);
    }
    const secondaryIncrease = decodePositiveAbilityScoreIncreaseValue(
      twoScores[4],
      optionIdText,
      "increase",
    );
    if (Either.isLeft(secondaryIncrease)) {
      return Either.left(secondaryIncrease.left);
    }
    const maximum = decodeAbilityScoreMaximum(twoScores[5], optionIdText);
    if (Either.isLeft(maximum)) return Either.left(maximum.left);

    return Either.right([
      {
        ability: primary,
        increase: primaryIncrease.right,
        maxScore: maximum.right,
      },
      {
        ability: secondary,
        increase: secondaryIncrease.right,
        maxScore: maximum.right,
      },
    ]);
  }

  return choiceOptionCodecIssue(optionIdText, {
    tag: "invalidAbilityScoreIncreaseEncoding",
  });
}

function decodePositiveAbilityScoreIncreaseValue(
  token: string | undefined,
  optionId: string,
  field: "increase" | "maximum",
): Either.Either<PositiveIntegerType, ChoiceOptionCodecIssue> {
  const value = Number(token);
  if (!Number.isSafeInteger(value)) {
    return invalidPositiveAbilityScoreIncreaseValueIssue(
      optionId,
      field,
      "unsafeInteger",
    );
  }
  return value > 0
    ? Either.right(PositiveInteger(value))
    : invalidPositiveAbilityScoreIncreaseValueIssue(
        optionId,
        field,
        "nonPositive",
      );
}

function decodeAbilityScoreMaximum(
  token: string | undefined,
  optionId: string,
): Either.Either<AbilityScoreType, ChoiceOptionCodecIssue> {
  const positive = decodePositiveAbilityScoreIncreaseValue(
    token,
    optionId,
    "maximum",
  );
  if (Either.isLeft(positive)) return Either.left(positive.left);
  return positive.right <= 30
    ? Either.right(abilityScore(positive.right))
    : invalidAbilityScoreIncreaseValueIssue(optionId, {
        tag: "invalidAbilityScoreIncreaseValue",
        field: "maximum",
        reason: "maximumOutOfRange",
      });
}

function invalidPositiveAbilityScoreIncreaseValueIssue(
  optionId: string,
  field: "increase" | "maximum",
  reason: "nonPositive" | "unsafeInteger",
): Either.Either<never, ChoiceOptionCodecIssue> {
  return invalidAbilityScoreIncreaseValueIssue(
    optionId,
    field === "increase"
      ? { tag: "invalidAbilityScoreIncreaseValue", field, reason }
      : { tag: "invalidAbilityScoreIncreaseValue", field, reason },
  );
}

function invalidAbilityScoreIncreaseValueIssue(
  optionId: string,
  cause: Extract<
    CreationChoiceOptionDecodeCause,
    { readonly tag: "invalidAbilityScoreIncreaseValue" }
  >,
): Either.Either<never, ChoiceOptionCodecIssue> {
  return choiceOptionCodecIssue(optionId, cause);
}

export function proficiencyGrantSubjectOption(
  subject: ProficiencyGrantSubject,
): CreationChoiceOption {
  return Match.value(subject).pipe(
    Match.when({ kind: "skill" }, ({ skill }) => skillOption(skill)),
    Match.when({ kind: "weapon_category" }, ({ category }) => ({
      optionId: proficiencyGrantSubjectOptionId({
        kind: "weapon_category",
        category,
      }),
      label: `Weapon category: ${category}`,
    })),
    Match.when({ kind: "armor_category" }, ({ category }) => ({
      optionId: proficiencyGrantSubjectOptionId({
        kind: "armor_category",
        category,
      }),
      label: `Armor category: ${category}`,
    })),
    Match.when({ kind: "tool" }, ({ toolId }) => ({
      optionId: proficiencyGrantSubjectOptionId({ kind: "tool", toolId }),
      label: toolId,
    })),
    Match.when({ kind: "tool_category" }, ({ category }) => ({
      optionId: proficiencyGrantSubjectOptionId({
        kind: "tool_category",
        category,
      }),
      label: `Tool category: ${category}`,
    })),
    Match.exhaustive,
  );
}

export function proficiencyGrantSubjectOptions(
  subject: ProficiencyGrantSubject,
): readonly CreationChoiceOption[] {
  if (
    subject.kind === "tool_category" &&
    subject.category === "musical_instrument"
  ) {
    return MUSICAL_INSTRUMENT_TOOL_PROFICIENCY_IDS.map((toolId) =>
      proficiencyGrantSubjectOption({ kind: "tool", toolId }),
    );
  }

  return [proficiencyGrantSubjectOption(subject)];
}

export function proficiencyGrantSubjectOptionId(
  subject: ProficiencyGrantSubject,
): CreationChoiceOptionId {
  return Match.value(subject).pipe(
    Match.when({ kind: "skill" }, ({ skill }) => creationChoiceOptionId(skill)),
    Match.when({ kind: "weapon_category" }, ({ category }) =>
      creationChoiceOptionId(`weapon_category:${category}`),
    ),
    Match.when({ kind: "armor_category" }, ({ category }) =>
      creationChoiceOptionId(`armor_category:${category}`),
    ),
    Match.when({ kind: "tool" }, ({ toolId }) =>
      creationChoiceOptionId(`tool:${toolId}`),
    ),
    Match.when({ kind: "tool_category" }, ({ category }) =>
      creationChoiceOptionId(`tool_category:${category}`),
    ),
    Match.exhaustive,
  );
}

export function decodeProficiencyGrantSubjectOptionId(
  optionId: CreationChoiceOptionId | string,
): Either.Either<ParsedProficiencyGrantSubject, ChoiceOptionCodecIssue> {
  const optionIdText = String(optionId);
  const skill = SKILLS.find((candidate) => candidate === optionIdText);
  if (skill != null) {
    return Either.right({ kind: "skill", skill });
  }

  if (optionIdText.startsWith("weapon_category:")) {
    const category = optionIdText.slice("weapon_category:".length);
    return isOneOf(WEAPON_PROFICIENCY_CATEGORIES, category)
      ? Either.right({
          kind: "weapon_category",
          category,
        })
      : choiceOptionCodecIssue(optionIdText, {
          tag: "unsupportedWeaponCategory",
        });
  }

  if (optionIdText.startsWith("armor_category:")) {
    const category = optionIdText.slice("armor_category:".length);
    return isOneOf(ARMOR_TRAINING_CATEGORIES, category)
      ? Either.right({
          kind: "armor_category",
          category,
        })
      : choiceOptionCodecIssue(optionIdText, {
          tag: "unsupportedArmorCategory",
        });
  }

  if (optionIdText.startsWith("tool:")) {
    const toolId = optionIdText.slice("tool:".length);
    const parsedToolId = parseToolProficiencyId(toolId);
    if (Either.isLeft(parsedToolId)) {
      return choiceOptionCodecIssue(optionIdText, {
        tag: "unsupportedToolProficiencyId",
      });
    }

    return Either.right({
      kind: "tool",
      toolId: parsedToolId.right,
    });
  }

  return choiceOptionCodecIssue(optionIdText, {
    tag: "invalidProficiencyEncoding",
  });
}

export function toolProficiencyIdsFromProficiencyChoiceOptionIds(
  optionIds: readonly (CreationChoiceOptionId | string)[],
): readonly ToolProficiencyId[] {
  return optionIds.flatMap((optionId) => {
    const decoded = decodeProficiencyGrantSubjectOptionId(optionId);
    return Either.isRight(decoded) && decoded.right.kind === "tool"
      ? [decoded.right.toolId]
      : [];
  });
}

export function toolProficiencyIdsFromDirectToolOptionIds(
  optionIds: readonly (CreationChoiceOptionId | string)[],
): readonly ToolProficiencyId[] {
  return optionIds.flatMap((optionId) => {
    const parsed = parseToolProficiencyId(String(optionId));
    return Either.isRight(parsed) ? [parsed.right] : [];
  });
}

export function toolProficiencyIdsFromSubjects(
  subjects: readonly ProficiencyGrantSubject[],
): readonly ToolProficiencyId[] {
  return subjects.flatMap((subject) => {
    if (subject.kind !== "tool") {
      return [];
    }

    const parsed = parseToolProficiencyId(subject.toolId);
    return Either.isRight(parsed) ? [parsed.right] : [];
  });
}

export function parseToolProficiencyId(
  value: string,
): Either.Either<ToolProficiencyId, ChoiceOptionCodecIssue> {
  return isCharacterBuildToolProficiencyId(value)
    ? Either.right(toolProficiencyId(value))
    : choiceOptionCodecIssue(value, {
        tag: "unsupportedCharacterBuildToolProficiencyId",
      });
}

function isOneOf<T extends string>(
  values: readonly T[],
  value: string,
): value is T {
  return values.some((candidate) => candidate === value);
}
