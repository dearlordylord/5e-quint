import { Array, Brand, Either, Option } from "effect";
import { normalizeCastingTime } from "#/features/spell-available-actions.ts";
import {
  getSpellRecordStrict,
  type SpellLibrary,
  type SpellRecord,
} from "#/features/spell-registry.ts";

import type {
  ActivationTiming,
  DifficultyClass,
  SpellId,
  SpellSlotLevel,
} from "#/types.ts";

type BattleSpellAccessId = string & Brand.Brand<"BattleSpellAccessId">;
const BattleSpellAccessId = Brand.nominal<BattleSpellAccessId>();
export const battleSpellAccessId: (s: string) => BattleSpellAccessId =
  BattleSpellAccessId;
export type { BattleSpellAccessId };

export type BattleSpellAccessActivation = ActivationTiming;
export type BattleSpellDictionary = SpellLibrary;

// This trigger language is intentionally creature-bound. If a later reaction
// family targets areas, objects, or other subjects, split the vocabulary
// instead of stretching this reactor-vs-source-creature shape.
export type BattleCreatureReactionTrigger =
  | { readonly kind: "hitByAttackRoll" }
  | { readonly kind: "creatureCastsSpell" }
  | {
      readonly kind: "damagedByCreature";
      readonly sourceMustBeVisibleToReactor: boolean;
      readonly maxSourceDistanceFeetFromReactor?: number;
    };

export const BATTLE_SPELL_REACTION_RESOLUTIONS = [
  "none",
  "shieldArmorClassBonus",
  // this is still too authored-unit-shaped. It survives because the TS battle interrupt surface still wants a
  // stable reaction-resolution discriminator for Counterspell. If more
  // interrupt-spell lanes land, replace this with a more generic interrupt
  // effect vocabulary.
  "counterspell",
  // same seam as above. This is currently a battle-facing effect
  // discriminator for the shipped Hellish Rebuke lane, not intended as durable
  // authored taxonomy.
  "hellishRebuke",
] as const;
export type BattleSpellReactionResolution =
  (typeof BATTLE_SPELL_REACTION_RESOLUTIONS)[number];

export interface BattleSpellAccessProjection {
  readonly baseLevel: number;
  readonly activation: BattleSpellAccessActivation;
  readonly requiresVerbal: boolean;
  readonly requiresHandComponent: boolean;
  readonly creatureReactionTrigger?: BattleCreatureReactionTrigger;
  readonly reactionResolution: BattleSpellReactionResolution;
}

// Spell access fact: creature-owned permission/resource path for this spell.
// Spell definition facts stay in authored content / spell registry.
export type BattleSpellAccess =
  | {
      readonly tag: "prepared";
      readonly accessId: BattleSpellAccessId;
      readonly projection: BattleSpellAccessProjection;
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
      readonly accessId: BattleSpellAccessId;
      readonly projection: BattleSpellAccessProjection;
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

function parseBattleSpellComponentRequirements(record: SpellRecord): {
  readonly requiresVerbal: boolean;
  readonly requiresHandComponent: boolean;
} {
  const requiresSomatic = record.components.includes("S");
  const requiresMaterial = record.components.includes("M");
  return {
    requiresVerbal: record.components.includes("V"),
    requiresHandComponent: requiresSomatic || requiresMaterial,
  };
}

// EXPLANATION: compile a creature-owned prepared spell access into the battle
// access shape with a stable semantic access id.
export function preparedBattleSpellAccess(params: {
  readonly spellDictionary: BattleSpellDictionary;
  readonly spellId: SpellId;
  readonly spellSaveDC: DifficultyClass;
}): BattleSpellAccess {
  return {
    tag: "prepared",
    accessId: battleSpellAccessId(`prepared:${params.spellId}`),
    projection: projectBattleSpellAccess(
      params.spellDictionary,
      params.spellId,
    ),
    spellId: params.spellId,
    spellSaveDC: params.spellSaveDC,
    resourcePath: { kind: "spellSlotLadder" },
  };
}

// EXPLANATION: build multiple prepared spell access paths that all share one
// creature-owned prepared-spell save DC.
export function preparedBattleSpellAccesses(params: {
  readonly spellDictionary: BattleSpellDictionary;
  readonly spellIds: ReadonlyArray<SpellId>;
  readonly sharedSpellSaveDC: DifficultyClass;
}): ReadonlyArray<BattleSpellAccess> {
  return params.spellIds.map((currentSpellId) =>
    preparedBattleSpellAccess({
      spellDictionary: params.spellDictionary,
      spellId: currentSpellId,
      spellSaveDC: params.sharedSpellSaveDC,
    }),
  );
}

// EXPLANATION: compile a stat-block-granted daily-use spell lane into the same
// battle access shape while preserving the concrete resource path identity.
export function statBlockActionGrantedBattleSpellAccess(params: {
  readonly spellDictionary: BattleSpellDictionary;
  readonly spellId: SpellId;
  readonly spellSaveDC: DifficultyClass;
  readonly usageId: string;
  readonly fixedCastLevel: SpellSlotLevel;
}): BattleSpellAccess {
  return {
    tag: "statBlockActionGranted",
    accessId: battleSpellAccessId(
      `statBlockActionGranted:${params.usageId}:${params.spellId}:${params.fixedCastLevel}`,
    ),
    projection: projectBattleSpellAccess(
      params.spellDictionary,
      params.spellId,
    ),
    spellId: params.spellId,
    spellSaveDC: params.spellSaveDC,
    resourcePath: {
      kind: "dailyUse",
      usageId: params.usageId,
      fixedCastLevel: params.fixedCastLevel,
    },
  };
}

// EXPLANATION: resolve one battle spell access by its concrete access id.
// Battle reducers use this when the caller has already chosen a specific path.
export function battleSpellAccessById(
  accesses: ReadonlyArray<BattleSpellAccess>,
  accessId: BattleSpellAccessId,
): Option.Option<BattleSpellAccess> {
  return Array.findFirst(accesses, (access) => access.accessId === accessId);
}

// EXPLANATION: resolve the concrete battle spell access to use for a cast. If
// an explicit access id is present, require it to match. Otherwise accept only
// the unique access for the given spell id and fail closed on ambiguity.
export function resolveBattleSpellAccess(params: {
  readonly accesses: ReadonlyArray<BattleSpellAccess>;
  readonly accessId?: BattleSpellAccessId;
  readonly spellId: SpellId;
}): Option.Option<BattleSpellAccess> {
  if (params.accessId != null) {
    const found = battleSpellAccessById(params.accesses, params.accessId);
    if (Option.isNone(found) || found.value.spellId !== params.spellId) {
      return Option.none();
    }
    return found;
  }
  const fallback = singleBattleSpellAccessForSpell(
    params.accesses,
    params.spellId,
  );
  if (Either.isLeft(fallback)) return Option.none();
  return fallback.right;
}

// EXPLANATION: compare two creature-bound reaction triggers structurally. The
// trigger language intentionally names the reactor/source relationship
// explicitly, so equality needs to account for the optional source constraints
// instead of treating the trigger as a flat string label.
export function sameBattleCreatureReactionTrigger(
  left: BattleCreatureReactionTrigger,
  right: BattleCreatureReactionTrigger,
): boolean {
  if (left.kind !== right.kind) return false;
  if (left.kind !== "damagedByCreature" || right.kind !== "damagedByCreature") {
    return true;
  }
  return (
    left.sourceMustBeVisibleToReactor === right.sourceMustBeVisibleToReactor &&
    left.maxSourceDistanceFeetFromReactor ===
      right.maxSourceDistanceFeetFromReactor
  );
}

// EXPLANATION: project authored spell-definition facts into the smaller
// battle-facing executable spell-access projection. This is intentionally a
// narrow runtime vocabulary, not a second authored spell catalog.
function projectBattleSpellAccess(
  spellDictionary: BattleSpellDictionary,
  currentSpellId: SpellId,
): BattleSpellAccessProjection {
  const record = getSpellRecordStrict(spellDictionary, currentSpellId);
  const requirements = parseBattleSpellComponentRequirements(record);
  const activation = normalizeCastingTime(record.castingTime);
  if (activation == null) {
    throw new Error(
      `Unsupported battle spell access casting time for ${currentSpellId}: ${record.castingTime}`,
    );
  }
  switch (String(currentSpellId)) {
    // EXPLANATION: this is a known remaining seam. The battle spell access
    // projection still recognizes a few shipped SRD ids to attach the current
    // reaction-trigger / reaction-resolution surface. This is documented in
    // `plans/ACTIVE_PLAN.md` under the remaining EPT14 scope, and should be
    // replaced when the reaction-effect vocabulary becomes generic enough.
    case "shield":
      return {
        baseLevel: record.level,
        activation,
        requiresVerbal: requirements.requiresVerbal,
        requiresHandComponent: requirements.requiresHandComponent,
        creatureReactionTrigger: { kind: "hitByAttackRoll" },
        reactionResolution: "shieldArmorClassBonus",
      };
    case "counterspell":
      return {
        baseLevel: record.level,
        activation,
        requiresVerbal: requirements.requiresVerbal,
        requiresHandComponent: requirements.requiresHandComponent,
        creatureReactionTrigger: { kind: "creatureCastsSpell" },
        reactionResolution: "counterspell",
      };
    case "hellish_rebuke":
      return {
        baseLevel: record.level,
        activation,
        requiresVerbal: requirements.requiresVerbal,
        requiresHandComponent: requirements.requiresHandComponent,
        creatureReactionTrigger: {
          kind: "damagedByCreature",
          sourceMustBeVisibleToReactor: true,
          maxSourceDistanceFeetFromReactor: 60,
        },
        reactionResolution: "hellishRebuke",
      };
    default:
      return {
        baseLevel: record.level,
        activation,
        requiresVerbal: requirements.requiresVerbal,
        requiresHandComponent: requirements.requiresHandComponent,
        reactionResolution: "none",
      };
  }
}

// EXPLANATION: gather every battle spell access that grants the given spell id.
// This is bookkeeping/projection support, not a semantic authority on its own.
export function battleSpellAccessesForSpell(
  accesses: ReadonlyArray<BattleSpellAccess>,
  spellId: SpellId,
): ReadonlyArray<BattleSpellAccess> {
  return accesses.filter((access) => access.spellId === spellId);
}

// EXPLANATION: resolve a unique access for a spell id when possible, but return
// an explicit ambiguity error when multiple access paths grant the same spell.
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

// EXPLANATION: list spell ids that currently have exactly one access path. This
// is compatibility support for older seams that still reason in spell-id terms.
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

// EXPLANATION: compatibility helper for old spell-id-shaped callers. New battle
// semantics should prefer access-scoped helpers instead.
export function hasBattleSpellAccess(
  accesses: ReadonlyArray<BattleSpellAccess>,
  spellId: SpellId,
): boolean {
  return accesses.some((access) => access.spellId === spellId);
}

// EXPLANATION: collect the distinct spell ids present across all access paths.
// This is useful for display/bookkeeping and for compatibility seams only.
export function battleSpellIds(
  accesses: ReadonlyArray<BattleSpellAccess>,
): ReadonlySet<SpellId> {
  const spellIds = new Set<SpellId>();
  for (const access of accesses) {
    spellIds.add(access.spellId);
  }
  return spellIds;
}
