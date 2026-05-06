// Multiclass prerequisite algebra (SRD 5.2.1 Character Creation > Multiclassing)

import { Brand, Either, Match } from "effect";

import { type Ability, type ReadonlyNonEmptyArray } from "@dnd/shared/types";
import type { ClassName } from "@dnd/shared/game-facts";
import {
  abilityScoreAssignment,
  type AbilityScoreAssignmentIssue,
  type ParsedAbilityScoreAssignment,
} from "./ability-score-algebra.ts";

export { CLASS_NAMES, type ClassName } from "@dnd/shared/game-facts";

export const MULTICLASS_THRESHOLD = 13;

export type MulticlassAbilityScores = ParsedAbilityScoreAssignment;

export type MulticlassAbilityScoresIssue =
  | { readonly tag: "multiclassAbilityScoresNotObject" }
  | {
      readonly tag: "missingNumericMulticlassAbilityScore";
      readonly ability: Ability;
    }
  | {
      readonly tag: "invalidMulticlassAbilityScore";
      readonly ability: Ability;
      readonly value: number;
    };

export type MulticlassClassChange = {
  readonly currentClasses: ReadonlyNonEmptyArray<ClassName>;
  readonly newClass: ClassName;
} & Brand.Brand<"MulticlassClassChange">;
const MulticlassClassChange = Brand.nominal<MulticlassClassChange>();

export type MulticlassClassChangeIssue =
  | { readonly tag: "missingCurrentClass" }
  | {
      readonly tag: "duplicateCurrentClass";
      readonly className: ClassName;
    }
  | {
      readonly tag: "newClassAlreadyCurrent";
      readonly className: ClassName;
    };

export function multiclassClassChange(input: {
  readonly currentClasses: readonly ClassName[];
  readonly newClass: ClassName;
}): Either.Either<MulticlassClassChange, MulticlassClassChangeIssue> {
  if (input.currentClasses.length === 0) {
    return Either.left({ tag: "missingCurrentClass" });
  }

  const currentClasses = new Set<ClassName>();
  for (const className of input.currentClasses) {
    if (currentClasses.has(className)) {
      return Either.left({ tag: "duplicateCurrentClass", className });
    }
    currentClasses.add(className);
  }

  if (currentClasses.has(input.newClass)) {
    return Either.left({
      tag: "newClassAlreadyCurrent",
      className: input.newClass,
    });
  }

  return Either.right(
    MulticlassClassChange({
      currentClasses: input.currentClasses as ReadonlyNonEmptyArray<ClassName>,
      newClass: input.newClass,
    }),
  );
}

export function multiclassAbilityScores(
  scores: unknown,
): Either.Either<
  MulticlassAbilityScores,
  ReadonlyNonEmptyArray<MulticlassAbilityScoresIssue>
> {
  return Either.mapLeft(abilityScoreAssignment(scores), (issues) => {
    const [first, ...rest] = issues;
    return [
      multiclassScoresIssue(first),
      ...rest.map(multiclassScoresIssue),
    ] satisfies ReadonlyNonEmptyArray<MulticlassAbilityScoresIssue>;
  });
}

function multiclassScoresIssue(
  issue: AbilityScoreAssignmentIssue,
): MulticlassAbilityScoresIssue {
  return Match.value(issue).pipe(
    byTag("abilityScoreAssignmentNotObject", () => ({
      tag: "multiclassAbilityScoresNotObject" as const,
    })),
    byTag("missingNumericAbilityScore", ({ ability }) => ({
      tag: "missingNumericMulticlassAbilityScore" as const,
      ability,
    })),
    byTag("invalidAbilityScore", ({ ability, value }) => ({
      tag: "invalidMulticlassAbilityScore" as const,
      ability,
      value,
    })),
    Match.exhaustive,
  );
}

export type MulticlassPrerequisite =
  | {
      readonly tag: "scoreAtLeast";
      readonly ability: Ability;
      readonly minimum: typeof MULTICLASS_THRESHOLD;
    }
  | {
      readonly tag: "allOf";
      readonly prerequisites: NonEmptyMulticlassPrerequisites;
    }
  | {
      readonly tag: "anyOf";
      readonly prerequisites: NonEmptyMulticlassPrerequisites;
    };

export type NonEmptyMulticlassPrerequisites =
  ReadonlyNonEmptyArray<MulticlassPrerequisite>;

export const MULTICLASS_PREREQUISITES: Readonly<
  Record<ClassName, MulticlassPrerequisite>
> = {
  barbarian: {
    tag: "scoreAtLeast",
    ability: "str",
    minimum: MULTICLASS_THRESHOLD,
  },
  bard: { tag: "scoreAtLeast", ability: "cha", minimum: MULTICLASS_THRESHOLD },
  cleric: {
    tag: "scoreAtLeast",
    ability: "wis",
    minimum: MULTICLASS_THRESHOLD,
  },
  druid: { tag: "scoreAtLeast", ability: "wis", minimum: MULTICLASS_THRESHOLD },
  fighter: {
    tag: "anyOf",
    prerequisites: [
      { tag: "scoreAtLeast", ability: "str", minimum: MULTICLASS_THRESHOLD },
      { tag: "scoreAtLeast", ability: "dex", minimum: MULTICLASS_THRESHOLD },
    ],
  },
  monk: {
    tag: "allOf",
    prerequisites: [
      { tag: "scoreAtLeast", ability: "dex", minimum: MULTICLASS_THRESHOLD },
      { tag: "scoreAtLeast", ability: "wis", minimum: MULTICLASS_THRESHOLD },
    ],
  },
  paladin: {
    tag: "allOf",
    prerequisites: [
      { tag: "scoreAtLeast", ability: "str", minimum: MULTICLASS_THRESHOLD },
      { tag: "scoreAtLeast", ability: "cha", minimum: MULTICLASS_THRESHOLD },
    ],
  },
  ranger: {
    tag: "allOf",
    prerequisites: [
      { tag: "scoreAtLeast", ability: "dex", minimum: MULTICLASS_THRESHOLD },
      { tag: "scoreAtLeast", ability: "wis", minimum: MULTICLASS_THRESHOLD },
    ],
  },
  rogue: { tag: "scoreAtLeast", ability: "dex", minimum: MULTICLASS_THRESHOLD },
  sorcerer: {
    tag: "scoreAtLeast",
    ability: "cha",
    minimum: MULTICLASS_THRESHOLD,
  },
  warlock: {
    tag: "scoreAtLeast",
    ability: "cha",
    minimum: MULTICLASS_THRESHOLD,
  },
  wizard: {
    tag: "scoreAtLeast",
    ability: "int",
    minimum: MULTICLASS_THRESHOLD,
  },
} as const satisfies Record<ClassName, MulticlassPrerequisite>;

const byTag = Match.discriminator("tag");

/**
 * Check if a single class multiclass prerequisite is met.
 */
export function meetsMulticlassPrerequisite(
  scores: MulticlassAbilityScores,
  className: ClassName,
): boolean {
  return evalPrereq(MULTICLASS_PREREQUISITES[className], scores);
}

function evalPrereq(
  prereq: MulticlassPrerequisite,
  scores: MulticlassAbilityScores,
): boolean {
  return Match.value(prereq).pipe(
    byTag(
      "scoreAtLeast",
      (requirement) => scores[requirement.ability] >= requirement.minimum,
    ),
    byTag("allOf", (requirement) =>
      requirement.prerequisites.every((p) => evalPrereq(p, scores)),
    ),
    byTag("anyOf", (requirement) =>
      requirement.prerequisites.some((p) => evalPrereq(p, scores)),
    ),
    Match.exhaustive,
  );
}

/**
 * Must meet prerequisites for every class the character already has and the
 * class they are adding.
 */
export function canMulticlass(
  scores: MulticlassAbilityScores,
  classChange: MulticlassClassChange,
): boolean {
  return [...classChange.currentClasses, classChange.newClass].every(
    (className) => meetsMulticlassPrerequisite(scores, className),
  );
}
