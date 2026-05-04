// Multiclass prerequisite algebra (SRD 5.2.1 Character Creation > Multiclassing)

import { Match } from "effect";

import {
  ABILITIES,
  AbilityScore,
  type Ability,
  type AbilityScore as AbilityScoreValue,
  type ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
import type { ClassName } from "@dnd/shared/game-facts";

export { CLASS_NAMES, type ClassName } from "@dnd/shared/game-facts";

export const MULTICLASS_THRESHOLD = 13;

export type MulticlassAbilityScores = Readonly<
  Record<Ability, AbilityScoreValue>
>;

export function multiclassAbilityScores(
  scores: unknown,
): MulticlassAbilityScores {
  if (typeof scores !== "object" || scores == null) {
    throw new Error("Multiclass ability scores must be an object.");
  }

  const record = scores as Partial<Record<Ability, unknown>>;
  return Object.fromEntries(
    ABILITIES.map((ability) => {
      const score = record[ability];
      if (typeof score !== "number") {
        throw new Error(`Missing numeric ability score: ${ability}`);
      }

      return [ability, AbilityScore.make(score)];
    }),
  ) as MulticlassAbilityScores;
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

export type NonEmptyMulticlassPrerequisites = ReadonlyNonEmptyArray<MulticlassPrerequisite>;

export const MULTICLASS_PREREQUISITES: Readonly<
  Record<ClassName, MulticlassPrerequisite>
> = {
  barbarian: { tag: "scoreAtLeast", ability: "str", minimum: MULTICLASS_THRESHOLD },
  bard: { tag: "scoreAtLeast", ability: "cha", minimum: MULTICLASS_THRESHOLD },
  cleric: { tag: "scoreAtLeast", ability: "wis", minimum: MULTICLASS_THRESHOLD },
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
  sorcerer: { tag: "scoreAtLeast", ability: "cha", minimum: MULTICLASS_THRESHOLD },
  warlock: { tag: "scoreAtLeast", ability: "cha", minimum: MULTICLASS_THRESHOLD },
  wizard: { tag: "scoreAtLeast", ability: "int", minimum: MULTICLASS_THRESHOLD },
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
 * Must meet prerequisites for both current and new classes.
 */
export function canMulticlass(
  scores: MulticlassAbilityScores,
  currentClass: ClassName,
  newClass: ClassName,
): boolean {
  return (
    meetsMulticlassPrerequisite(scores, currentClass) &&
    meetsMulticlassPrerequisite(scores, newClass)
  );
}
