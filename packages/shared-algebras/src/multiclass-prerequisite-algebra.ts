// Multiclass prerequisite algebra (SRD 5.2.1 Character Creation > Multiclassing)

import { Brand, Match, Result } from "effect";

import { type Ability, type ReadonlyNonEmptyArray } from "@dnd/shared/types";
import { CLASS_NAMES, type ClassName } from "@dnd/shared/game-facts";
import { classCreationFacts } from "@dnd/surface/surface/character-creation-readers";
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
}): Result.Result<MulticlassClassChange, MulticlassClassChangeIssue> {
  const [firstClass, ...restClasses] = input.currentClasses;
  if (firstClass === undefined) {
    return Result.fail({ tag: "missingCurrentClass" });
  }
  const nonEmptyCurrentClasses = [
    firstClass,
    ...restClasses,
  ] satisfies ReadonlyNonEmptyArray<ClassName>;

  const currentClasses = new Set<ClassName>();
  for (const className of nonEmptyCurrentClasses) {
    if (currentClasses.has(className)) {
      return Result.fail({ tag: "duplicateCurrentClass", className });
    }
    currentClasses.add(className);
  }

  if (currentClasses.has(input.newClass)) {
    return Result.fail({
      tag: "newClassAlreadyCurrent",
      className: input.newClass,
    });
  }

  return Result.succeed(
    MulticlassClassChange({
      currentClasses: nonEmptyCurrentClasses,
      newClass: input.newClass,
    }),
  );
}

export function multiclassAbilityScores(
  scores: unknown,
): Result.Result<
  MulticlassAbilityScores,
  ReadonlyNonEmptyArray<MulticlassAbilityScoresIssue>
> {
  return Result.mapError(abilityScoreAssignment(scores), (issues) => {
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

export type MulticlassPrerequisiteTable = Readonly<
  Record<ClassName, MulticlassPrerequisite>
>;

export type MulticlassPrerequisiteTableIssue =
  | {
      readonly tag: "duplicateSrdClassContainer";
      readonly className: ClassName;
    }
  | {
      readonly tag: "missingSrdClassContainer";
      readonly className: ClassName;
    };

export type MulticlassPrerequisiteLookupIssue =
  MulticlassPrerequisiteTableIssue;

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
): Result.Result<
  MulticlassPrerequisiteTable,
  ReadonlyNonEmptyArray<MulticlassPrerequisiteTableIssue>
> {
  const prerequisites = new Map<ClassName, MulticlassPrerequisite>();
  const issues: MulticlassPrerequisiteTableIssue[] = [];

  for (const unit of units) {
    if (unit.kind !== "class") continue;

    const facts = classCreationFacts(unit);

    if (prerequisites.has(facts.className)) {
      issues.push({
        tag: "duplicateSrdClassContainer",
        className: facts.className,
      });
      continue;
    }

    prerequisites.set(
      facts.className,
      multiclassPrerequisiteFromPrimaryAbilities(facts.primaryAbilities),
    );
  }

  for (const className of CLASS_NAMES) {
    if (!prerequisites.has(className)) {
      issues.push({ tag: "missingSrdClassContainer", className });
    }
  }

  const [firstIssue, ...restIssues] = issues;
  if (firstIssue !== undefined) {
    return Result.fail([firstIssue, ...restIssues]);
  }

  return Result.succeed(
    Object.fromEntries(prerequisites) as MulticlassPrerequisiteTable,
  );
}

export const MULTICLASS_PREREQUISITES: Result.Result<
  MulticlassPrerequisiteTable,
  ReadonlyNonEmptyArray<MulticlassPrerequisiteTableIssue>
> = multiclassPrerequisitesFromSrdClassContainers();

/**
 * Check if a single class multiclass prerequisite is met.
 */
export function meetsMulticlassPrerequisite(
  scores: MulticlassAbilityScores,
  className: ClassName,
): Result.Result<
  boolean,
  ReadonlyNonEmptyArray<MulticlassPrerequisiteLookupIssue>
> {
  return Result.map(MULTICLASS_PREREQUISITES, (prerequisites) =>
    evalPrereq(prerequisites[className], scores),
  );
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
): Result.Result<
  boolean,
  ReadonlyNonEmptyArray<MulticlassPrerequisiteLookupIssue>
> {
  return Result.flatMap(MULTICLASS_PREREQUISITES, (prerequisites) => {
    for (const className of [
      ...classChange.currentClasses,
      classChange.newClass,
    ]) {
      const prerequisite = prerequisites[className];
      if (!evalPrereq(prerequisite, scores)) {
        return Result.succeed(false);
      }
    }

    return Result.succeed(true);
  });
}
