import { Match } from "effect";
import * as Either from "effect/Either";
import { SURFACE_ABILITIES } from "@dnd/shared/game-facts";
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
  type CreationChoiceOptionId,
  type ToolProficiencyId,
} from "./types.ts";

export type AbilityScoreIncreaseDeltaWithCap = {
  readonly ability: Ability;
  readonly increase: number;
  readonly maxScore: number;
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
  readonly message: string;
};

function choiceOptionCodecIssue(
  optionId: string,
  message: string,
): Either.Either<never, ChoiceOptionCodecIssue> {
  return Either.left({ tag: "choiceOptionCodecIssue", optionId, message });
}

export function abilityScoreIncreaseOneScoreOptionId(input: {
  readonly ability: Ability;
  readonly increase: number;
  readonly maxScore: number;
}): CreationChoiceOptionId {
  return creationChoiceOptionId(
    `ability_score:${input.ability}:+${input.increase}:max${input.maxScore}`,
  );
}

export function requireAbilityScoreIncreaseTwoScoresOptionId(input: {
  readonly primary: Ability;
  readonly primaryIncrease: number;
  readonly secondary: Ability;
  readonly secondaryIncrease: number;
  readonly maxScore: number;
}): CreationChoiceOptionId {
  if (input.primary === input.secondary) {
    throw new Error(
      "Ability Score Increase two-score option ids require distinct ability scores.",
    );
  }

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
      return choiceOptionCodecIssue(
        optionIdText,
        "Ability Score Increase choice option encodes an unsupported ability score.",
      );
    }

    return Either.right([
      {
        ability,
        increase: Number(oneScore[2]),
        maxScore: Number(oneScore[3]),
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
      return choiceOptionCodecIssue(
        optionIdText,
        "Ability Score Increase choice option encodes an unsupported ability score.",
      );
    }
    if (primary === secondary) {
      return choiceOptionCodecIssue(
        optionIdText,
        "Ability Score Increase two-score choice option must encode two distinct ability scores.",
      );
    }

    return Either.right([
      {
        ability: primary,
        increase: Number(twoScores[2]),
        maxScore: Number(twoScores[5]),
      },
      {
        ability: secondary,
        increase: Number(twoScores[4]),
        maxScore: Number(twoScores[5]),
      },
    ]);
  }

  return choiceOptionCodecIssue(
    optionIdText,
    "Ability Score Increase choice option does not encode an ability-score increase.",
  );
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
      : choiceOptionCodecIssue(
          optionIdText,
          "Proficiency choice option encodes an unsupported weapon category.",
        );
  }

  if (optionIdText.startsWith("armor_category:")) {
    const category = optionIdText.slice("armor_category:".length);
    return isOneOf(ARMOR_TRAINING_CATEGORIES, category)
      ? Either.right({
          kind: "armor_category",
          category,
        })
      : choiceOptionCodecIssue(
          optionIdText,
          "Proficiency choice option encodes an unsupported armor category.",
        );
  }

  if (optionIdText.startsWith("tool:")) {
    const toolId = optionIdText.slice("tool:".length);
    const parsedToolId = parseToolProficiencyId(toolId);
    if (Either.isLeft(parsedToolId)) {
      return choiceOptionCodecIssue(
        optionIdText,
        "Proficiency choice option encodes an unsupported tool proficiency id.",
      );
    }

    return Either.right({
      kind: "tool",
      toolId: parsedToolId.right,
    });
  }

  return choiceOptionCodecIssue(
    optionIdText,
    "Proficiency choice option does not encode a proficiency grant subject.",
  );
}

export function parseToolProficiencyId(
  value: string,
): Either.Either<ToolProficiencyId, ChoiceOptionCodecIssue> {
  return isCharacterBuildToolProficiencyId(value)
    ? Either.right(toolProficiencyId(value))
    : choiceOptionCodecIssue(
        value,
        "Expected a supported Character Build tool proficiency id.",
      );
}

function isOneOf<T extends string>(
  values: readonly T[],
  value: string,
): value is T {
  return values.some((candidate) => candidate === value);
}
