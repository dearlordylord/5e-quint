import { Either, Option } from "effect";

import type {
  DifficultyClass,
  SpellId,
  SpellSlotLevel,
} from "#/types.ts";

// Spell access fact: creature-owned permission/resource path for this spell.
// Spell definition facts stay in authored content / spell registry.
export type BattleSpellAccess =
  | {
      readonly tag: "prepared";
      // Bookkeeping/provenance only. Battle semantics should consume access
      // shape and projected spell facts rather than branching on the id.
      readonly spellId: SpellId;
      // Access-scoped invocation default: invocations through this access use
      // this creature-owned spell save DC unless a later path widens it.
      readonly spellSaveDC: DifficultyClass;
      readonly resourcePath: {
        readonly kind: "spellSlotLadder";
      };
    }
  | {
      readonly tag: "statBlockActionGranted";
      // Bookkeeping/provenance only. Battle semantics should consume access
      // shape and projected spell facts rather than branching on the id.
      readonly spellId: SpellId;
      // Access-scoped invocation default for this stat-block action-granted path.
      readonly spellSaveDC: DifficultyClass;
      readonly resourcePath: {
        readonly kind: "dailyUse";
        readonly usageId: string;
        readonly fixedCastLevel: SpellSlotLevel;
      };
    };

export type MultipleBattleSpellAccessesError = {
  readonly tag: "MultipleBattleSpellAccesses";
  readonly spellId: SpellId;
};

export function preparedBattleSpellAccess(params: {
  readonly spellId: SpellId;
  readonly spellSaveDC: DifficultyClass;
}): BattleSpellAccess {
  return {
    tag: "prepared",
    spellId: params.spellId,
    spellSaveDC: params.spellSaveDC,
    resourcePath: { kind: "spellSlotLadder" },
  };
}

export function statBlockActionGrantedBattleSpellAccess(params: {
  readonly spellId: SpellId;
  readonly spellSaveDC: DifficultyClass;
  readonly usageId: string;
  readonly fixedCastLevel: SpellSlotLevel;
}): BattleSpellAccess {
  return {
    tag: "statBlockActionGranted",
    spellId: params.spellId,
    spellSaveDC: params.spellSaveDC,
    resourcePath: {
      kind: "dailyUse",
      usageId: params.usageId,
      fixedCastLevel: params.fixedCastLevel,
    },
  };
}

export function battleSpellAccessesForSpell(
  accesses: ReadonlyArray<BattleSpellAccess>,
  spellId: SpellId,
): ReadonlyArray<BattleSpellAccess> {
  return accesses.filter((access) => access.spellId === spellId);
}

export function singleBattleSpellAccessForSpell(
  accesses: ReadonlyArray<BattleSpellAccess>,
  spellId: SpellId,
): Either.Either<
  Option.Option<BattleSpellAccess>,
  MultipleBattleSpellAccessesError
> {
  const matching = battleSpellAccessesForSpell(accesses, spellId);
  if (matching.length === 0) return Either.right(Option.none());
  if (matching.length === 1) return Either.right(Option.some(matching[0]));
  return Either.left({ tag: "MultipleBattleSpellAccesses", spellId });
}

export function battleSpellIdsWithUnambiguousAccess(
  accesses: ReadonlyArray<BattleSpellAccess>,
): ReadonlyArray<SpellId> {
  const counts = new Map<SpellId, number>();
  for (const access of accesses) {
    counts.set(access.spellId, (counts.get(access.spellId) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count === 1)
    .map(([spellId]) => spellId)
    .sort((left, right) => String(left).localeCompare(String(right)));
}

export function hasBattleSpellAccess(
  accesses: ReadonlyArray<BattleSpellAccess>,
  spellId: SpellId,
): boolean {
  return accesses.some((access) => access.spellId === spellId);
}

export function battleSpellIds(
  accesses: ReadonlyArray<BattleSpellAccess>,
): ReadonlySet<SpellId> {
  const spellIds = new Set<SpellId>();
  for (const access of accesses) {
    spellIds.add(access.spellId);
  }
  return spellIds;
}
