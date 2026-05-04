// Multiclass prerequisite algebra (SRD 5.2.1 Ch18.4)

import type { Ability, ReadonlyNonEmptyArray } from '@dnd/shared/types';
import type { ClassName } from "@dnd/shared/game-facts";

export { CLASS_NAMES, type ClassName } from "@dnd/shared/game-facts";

export const MULTICLASS_THRESHOLD = 13;

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

/**
 * Check if a single class multiclass prerequisite is met (SRD 5.2.1 Ch18.4).
 */
export function meetsMulticlassPrerequisite(
  scores: Record<Ability, number>,
  className: ClassName,
): boolean {
  const prereq = MULTICLASS_PREREQUISITES[className];
  if (!prereq) return false;
  return evalPrereq(prereq, scores);
}

function evalPrereq(
  prereq: MulticlassPrerequisite,
  scores: Record<Ability, number>,
): boolean {
  switch (prereq.tag) {
    case "scoreAtLeast":
      return scores[prereq.ability] >= prereq.minimum;
    case "allOf":
      return prereq.prerequisites.every((p) => evalPrereq(p, scores));
    case "anyOf":
      return prereq.prerequisites.some((p) => evalPrereq(p, scores));
  }
}

/**
 * Must meet prereqs for BOTH current and new class (SRD 5.2.1 Ch18.4).
 */
export function canMulticlass(
  scores: Record<Ability, number>,
  currentClass: ClassName,
  newClass: ClassName,
): boolean {
  return (
    meetsMulticlassPrerequisite(scores, currentClass) &&
    meetsMulticlassPrerequisite(scores, newClass)
  );
}
