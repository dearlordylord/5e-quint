// Multiclass prerequisite algebra (SRD 5.2.1 Ch18.4)
// Canonical implementation — owned by @dnd/shared-algebras.
// @dnd/core consumers import this instead of defining their own table.

import type { Ability } from "@dnd/shared/types";

export const CLASS_NAMES = [
  "barbarian",
  "bard",
  "cleric",
  "druid",
  "fighter",
  "monk",
  "paladin",
  "ranger",
  "rogue",
  "sorcerer",
  "warlock",
  "wizard",
] as const satisfies ReadonlyArray<string>;

export type ClassName = (typeof CLASS_NAMES)[number];

export const MULTICLASS_THRESHOLD = 13;

// ── Discriminated prerequisite expression ──

export type MulticlassPrerequisite =
  | { readonly tag: "scoreAtLeast"; readonly ability: Ability; readonly minimum: 13 }
  | { readonly tag: "allOf"; readonly prerequisites: NonEmptyMulticlassPrerequisites }
  | { readonly tag: "anyOf"; readonly prerequisites: NonEmptyMulticlassPrerequisites };

export type NonEmptyMulticlassPrerequisites = readonly [
  MulticlassPrerequisite,
  ...MulticlassPrerequisite[],
];

export const MULTICLASS_PREREQUISITES: Readonly<Record<ClassName, MulticlassPrerequisite>> = {
  barbarian: { tag: "scoreAtLeast", ability: "str", minimum: 13 },
  bard: { tag: "scoreAtLeast", ability: "cha", minimum: 13 },
  cleric: { tag: "scoreAtLeast", ability: "wis", minimum: 13 },
  druid: { tag: "scoreAtLeast", ability: "wis", minimum: 13 },
  fighter: { tag: "anyOf", prerequisites: [
    { tag: "scoreAtLeast", ability: "str", minimum: 13 },
    { tag: "scoreAtLeast", ability: "dex", minimum: 13 },
  ]},
  monk: { tag: "allOf", prerequisites: [
    { tag: "scoreAtLeast", ability: "dex", minimum: 13 },
    { tag: "scoreAtLeast", ability: "wis", minimum: 13 },
  ]},
  paladin: { tag: "allOf", prerequisites: [
    { tag: "scoreAtLeast", ability: "str", minimum: 13 },
    { tag: "scoreAtLeast", ability: "cha", minimum: 13 },
  ]},
  ranger: { tag: "allOf", prerequisites: [
    { tag: "scoreAtLeast", ability: "dex", minimum: 13 },
    { tag: "scoreAtLeast", ability: "wis", minimum: 13 },
  ]},
  rogue: { tag: "scoreAtLeast", ability: "dex", minimum: 13 },
  sorcerer: { tag: "scoreAtLeast", ability: "cha", minimum: 13 },
  warlock: { tag: "scoreAtLeast", ability: "cha", minimum: 13 },
  wizard: { tag: "scoreAtLeast", ability: "int", minimum: 13 },
} as const satisfies Record<ClassName, MulticlassPrerequisite>;

/**
 * Check if a single class multiclass prerequisite is met (SRD 5.2.1 Ch18.4).
 * Threshold is always 13.
 */
export function meetsMulticlassPrerequisite(
  scores: Record<Ability, number>,
  className: ClassName,
): boolean {
  const prereq = MULTICLASS_PREREQUISITES[className];
  if (!prereq) return false;
  return evalPrereq(prereq, scores);
}

function evalPrereq(prereq: MulticlassPrerequisite, scores: Record<Ability, number>): boolean {
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
