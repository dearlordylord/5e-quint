// Normalized progression type definitions.
// No standalone primaryClass. No advancement[0] = starting class.
// Starting class is declared explicitly and is the source of truth.
// Advancements store no level — computeTotalLevel = 1 + advancements.length.

import type { ClassName } from "@dnd/shared-algebras/multiclass-prerequisite-algebra";

// ── Starting class is explicitly declared ──

export type CharacterProgression = Readonly<{
  readonly startingClass: ClassName;
  readonly advancements: ReadonlyArray<ClassName>;
}>;

// ── Helpers ──

export function getStartingClass(p: CharacterProgression): ClassName {
  return p.startingClass;
}

export function computeTotalLevel(p: CharacterProgression): number {
  return 1 + p.advancements.length;
}
