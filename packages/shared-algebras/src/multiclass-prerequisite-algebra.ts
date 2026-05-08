// Multiclass prerequisite algebra (SRD 5.2.1 Character Creation > Multiclassing)

import { Brand, Either, Match } from "effect";

import { type Ability, type ReadonlyNonEmptyArray } from "@dnd/shared/types";
import { CLASS_NAMES, type ClassName } from "@dnd/shared/game-facts";
import {
  readClassCreationFacts,
  type SurfaceReadIssue,
} from "@dnd/surface/surface/character-creation-readers";
import { srdUnitCollection } from "@dnd/surface/surface/unit-catalog";
import type {
  PrimaryAbilityExpression,
  UnitRecord,
} from "@dnd/surface/surface/types";
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
  const [firstClass, ...restClasses] = input.currentClasses;
  if (firstClass === undefined) {
    return Either.left({ tag: "missingCurrentClass" });
  }
  const nonEmptyCurrentClasses = [
    firstClass,
    ...restClasses,
  ] satisfies ReadonlyNonEmptyArray<ClassName>;

  const currentClasses = new Set<ClassName>();
  for (const className of nonEmptyCurrentClasses) {
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
      currentClasses: nonEmptyCurrentClasses,
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

export type MulticlassPrerequisiteTable = ReadonlyMap<
  ClassName,
  MulticlassPrerequisite
>;

export type MulticlassPrerequisiteTableIssue =
  | {
      readonly tag: "unreadableSrdClassContainer";
      readonly unitId: UnitRecord["id"];
      readonly issues: readonly SurfaceReadIssue[];
    }
  | {
      readonly tag: "duplicateSrdClassContainer";
      readonly className: ClassName;
    }
  | {
      readonly tag: "missingSrdClassContainer";
      readonly className: ClassName;
    };

export type MulticlassPrerequisiteLookupIssue =
  | MulticlassPrerequisiteTableIssue
  | {
      readonly tag: "missingMulticlassPrerequisite";
      readonly className: ClassName;
    };

const byTag = Match.discriminator("tag");
const byKind = Match.discriminator("kind");

export function multiclassPrerequisiteFromPrimaryAbilities(
  primaryAbilities: PrimaryAbilityExpression,
): MulticlassPrerequisite {
  const [firstAbility, ...restAbilities] = primaryAbilities.abilities;
  const prerequisites = [
    multiclassScorePrerequisite(firstAbility),
    ...restAbilities.map(multiclassScorePrerequisite),
  ] satisfies NonEmptyMulticlassPrerequisites;

  return Match.value(primaryAbilities).pipe(
    byKind("all_of", () =>
      prerequisites.length === 1
        ? prerequisites[0]
        : { tag: "allOf" as const, prerequisites },
    ),
    byKind("any_of", () => ({ tag: "anyOf" as const, prerequisites })),
    Match.exhaustive,
  );
}

function multiclassScorePrerequisite(ability: Ability): MulticlassPrerequisite {
  return {
    tag: "scoreAtLeast",
    ability,
    minimum: MULTICLASS_THRESHOLD,
  };
}

export function multiclassPrerequisitesFromSrdClassContainers(
  units: readonly UnitRecord[] = srdUnitCollection.units,
): Either.Either<
  MulticlassPrerequisiteTable,
  ReadonlyNonEmptyArray<MulticlassPrerequisiteTableIssue>
> {
  const prerequisites = new Map<ClassName, MulticlassPrerequisite>();
  const issues: MulticlassPrerequisiteTableIssue[] = [];

  for (const unit of units) {
    if (unit.kind !== "class") continue;

    const result = readClassCreationFacts(unit);
    if (result.tag === "unreadable") {
      issues.push({
        tag: "unreadableSrdClassContainer",
        unitId: unit.id,
        issues: result.issues,
      });
      continue;
    }

    if (prerequisites.has(result.value.className)) {
      issues.push({
        tag: "duplicateSrdClassContainer",
        className: result.value.className,
      });
      continue;
    }

    prerequisites.set(
      result.value.className,
      multiclassPrerequisiteFromPrimaryAbilities(result.value.primaryAbilities),
    );
  }

  for (const className of CLASS_NAMES) {
    if (!prerequisites.has(className)) {
      issues.push({ tag: "missingSrdClassContainer", className });
    }
  }

  const [firstIssue, ...restIssues] = issues;
  if (firstIssue !== undefined) {
    return Either.left([firstIssue, ...restIssues]);
  }

  return Either.right(prerequisites);
}

export const MULTICLASS_PREREQUISITES: Either.Either<
  MulticlassPrerequisiteTable,
  ReadonlyNonEmptyArray<MulticlassPrerequisiteTableIssue>
> = multiclassPrerequisitesFromSrdClassContainers();

/**
 * Check if a single class multiclass prerequisite is met.
 */
export function meetsMulticlassPrerequisite(
  scores: MulticlassAbilityScores,
  className: ClassName,
): Either.Either<
  boolean,
  ReadonlyNonEmptyArray<MulticlassPrerequisiteLookupIssue>
> {
  return Either.flatMap(MULTICLASS_PREREQUISITES, (prerequisites) => {
    const prerequisite = prerequisites.get(className);
    return prerequisite === undefined
      ? Either.left([{ tag: "missingMulticlassPrerequisite", className }])
      : Either.right(evalPrereq(prerequisite, scores));
  });
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
): Either.Either<
  boolean,
  ReadonlyNonEmptyArray<MulticlassPrerequisiteLookupIssue>
> {
  return Either.flatMap(MULTICLASS_PREREQUISITES, (prerequisites) => {
    for (const className of [
      ...classChange.currentClasses,
      classChange.newClass,
    ]) {
      const prerequisite = prerequisites.get(className);
      if (prerequisite === undefined) {
        return Either.left([
          { tag: "missingMulticlassPrerequisite", className },
        ]);
      }
      if (!evalPrereq(prerequisite, scores)) {
        return Either.right(false);
      }
    }

    return Either.right(true);
  });
}
