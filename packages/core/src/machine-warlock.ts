import { assert } from "#/assert.ts";
import {
  canEldritchSmite,
  canUseMagicalCunning,
  canUseMysticArcanum,
} from "#/features/class-warlock.ts";
import { updateClass } from "#/machine-helpers.ts";
import { isIncapacitated } from "#/machine-queries.ts";
import type { DndContext, WarlockClassState } from "#/machine-types.ts";
import type { ClassLevel } from "#/types.ts";

function w(c: DndContext) {
  return c.classStates.warlock!;
}

// -- Actions --

/** Magical Cunning: set used flag. Pact slot recovery is caller-managed.
 * SRD: "you regain expended Pact Magic spell slots but no more than a number
 * equal to half your maximum (round up). Once you use this feature, you can't
 * do so again until you finish a Long Rest." */
export function magicalCunningUpdate(c: DndContext): Partial<DndContext> {
  const ws = w(c);
  assert(
    !isIncapacitated(c) &&
      canUseMagicalCunning(ws.level, ws.magicalCunningUsed),
    "guard: canMagicalCunning should have prevented this",
  );
  return updateClass(c, "warlock", { magicalCunningUsed: true });
}

/** Mystic Arcanum: mark spell level as used this LR.
 * SRD: "You can cast your arcanum spell once without expending a spell slot,
 * and you must finish a Long Rest before you can cast it in this way again." */
export function mysticArcanumUpdate(
  c: DndContext,
  spellLevel: number,
): Partial<DndContext> {
  const ws = w(c);
  assert(
    !isIncapacitated(c) && ws.level >= 11,
    "guard: canMysticArcanum should have prevented this",
  );
  if (!canUseMysticArcanum(spellLevel, ws.mysticArcanumUsed)) return {};
  return updateClass(c, "warlock", {
    mysticArcanumUsed: new Set([...ws.mysticArcanumUsed, spellLevel]),
  });
}

/** Eldritch Smite: expend pact slot for Force damage on pact weapon hit.
 * SRD: "Once per turn when you hit a creature with your pact weapon,
 * you can expend a Pact Magic spell slot to deal an extra 1d8 Force damage" */
export function eldritchSmiteUpdate(c: DndContext): Partial<DndContext> {
  const ws = w(c);
  assert(
    !isIncapacitated(c) &&
      canEldritchSmite(ws.level) &&
      c.pactSlotsCurrent > 0 &&
      !ws.eldritchSmiteUsedThisTurn,
    "guard: canEldritchSmite should have prevented this",
  );
  return {
    pactSlotsCurrent: c.pactSlotsCurrent - 1,
    ...updateClass(c, "warlock", { eldritchSmiteUsedThisTurn: true }),
  };
}

// -- Lifecycle --

export function warlockStartTurnUpdate(c: DndContext): Partial<DndContext> {
  const ws = c.classStates.warlock;
  if (!ws || ws.level === 0) return {};
  return updateClass(c, "warlock", { eldritchSmiteUsedThisTurn: false });
}

/** SRD: Pact Magic slots recover on Short Rest (handled by caller).
 * Magical Cunning recharges on Long Rest only — no SR reset. */
export function warlockShortRestUpdate(c: DndContext): Partial<DndContext> {
  const ws = c.classStates.warlock;
  if (!ws || ws.level === 0) return {};
  return {};
}

/** SRD: Long Rest resets Magical Cunning and all Mystic Arcanum uses. */
export function warlockLongRestUpdate(c: DndContext): Partial<DndContext> {
  const ws = c.classStates.warlock;
  if (!ws || ws.level === 0) return {};
  return updateClass(c, "warlock", {
    mysticArcanumUsed: new Set<number>(),
    magicalCunningUsed: false,
    eldritchSmiteUsedThisTurn: false,
  });
}

// -- Init --

export function initialWarlockState(
  warlockLevel: ClassLevel,
): WarlockClassState {
  return {
    level: warlockLevel,
    mysticArcanumUsed: new Set<number>(),
    magicalCunningUsed: false,
    eldritchSmiteUsedThisTurn: false,
  };
}
