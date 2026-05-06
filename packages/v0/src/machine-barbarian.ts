import { assert } from "#/assert.ts";
import type { RageState } from "#/features/class-barbarian.ts";
import {
  canEnterRage as tsCanEnterRage,
  canUseBrutalStrike,
  canUseIntimidatingPresence as tsCanUseIP,
  canUseRelentlessRage,
  pCheckRageMaintenance as tsCheckMaintenance,
  pEndRage as tsPEndRage,
  pEnterRage as tsPEnterRage,
  pExtendRageWithBA as tsPExtendRageBA,
  pMarkAttackOrForcedSave as tsPMarkAttack,
  rageMaxCharges,
  relentlessRageResult,
  restoreIntimidatingPresenceWithRage as tsRestoreIP,
  useIntimidatingPresence as tsUseIP,
} from "#/features/class-barbarian.ts";
import { updateClass } from "#/machine-helpers.ts";
import { isIncapacitated } from "#/machine-queries.ts";
import type { BarbarianClassState, DndContext } from "#/machine-types.ts";
import type { ClassLevel } from "#/types.ts";
import { hp, resourceCount } from "#/types.ts";

function b(c: DndContext) {
  return c.classStates.barbarian!;
}

function toRageState(c: DndContext): RageState {
  const bs = b(c);
  return {
    raging: bs.raging,
    rageCharges: bs.rageCharges,
    rageMaxCharges: bs.rageMaxCharges,
    rageTurnsRemaining: bs.rageTurnsRemaining,
    attackedOrForcedSaveThisTurn: bs.attackedOrForcedSaveThisTurn,
    rageExtendedWithBA: bs.rageExtendedWithBA,
    concentrationSpellId: c.concentrationSpellId,
  };
}

function fromRageState(rs: RageState): Partial<BarbarianClassState> {
  return {
    raging: rs.raging,
    rageCharges: resourceCount(rs.rageCharges),
    rageTurnsRemaining: rs.rageTurnsRemaining,
    attackedOrForcedSaveThisTurn: rs.attackedOrForcedSaveThisTurn,
    rageExtendedWithBA: rs.rageExtendedWithBA,
  };
}

export function enterRageUpdate(c: DndContext): Partial<DndContext> {
  const bs = b(c);
  assert(
    !c.bonusActionUsed &&
      !isIncapacitated(c) &&
      !bs.raging &&
      tsCanEnterRage(bs.rageCharges, "none"),
    "guard: canEnterRage should have prevented this",
  );
  return {
    bonusActionUsed: true,
    ...updateClass(c, "barbarian", fromRageState(tsPEnterRage(toRageState(c)))),
  };
}

export function endRageUpdate(c: DndContext): Partial<DndContext> {
  const bs = b(c);
  assert(bs.raging, "guard: isRaging should have prevented this");
  return updateClass(c, "barbarian", {
    ...fromRageState(tsPEndRage(toRageState(c))),
    recklessThisTurn: false,
  });
}

export function extendRageBAUpdate(c: DndContext): Partial<DndContext> {
  const bs = b(c);
  assert(
    bs.raging && !c.bonusActionUsed,
    "guard: canExtendRageBA should have prevented this",
  );
  return {
    bonusActionUsed: true,
    ...updateClass(
      c,
      "barbarian",
      fromRageState(tsPExtendRageBA(toRageState(c))),
    ),
  };
}

export function markAttackOrForcedSaveUpdate(
  c: DndContext,
): Partial<DndContext> {
  const bs = b(c);
  assert(bs.raging, "guard: isRaging should have prevented this");
  return updateClass(
    c,
    "barbarian",
    fromRageState(tsPMarkAttack(toRageState(c))),
  );
}

export function declareRecklessUpdate(c: DndContext): Partial<DndContext> {
  const bs = b(c);
  assert(
    !bs.recklessThisTurn && bs.level >= 2,
    "guard: canDeclareReckless should have prevented this",
  );
  return updateClass(c, "barbarian", { recklessThisTurn: true });
}

export function useIntimidatingPresenceUpdate(
  c: DndContext,
): Partial<DndContext> {
  const bs = b(c);
  assert(
    tsCanUseIP(bs.level, c.bonusActionUsed, bs.intimidatingPresenceUsed),
    "guard: canIntimidatingPresence should have prevented this",
  );
  const r = tsUseIP();
  return {
    ...updateClass(c, "barbarian", {
      intimidatingPresenceUsed: r.intimidatingPresenceUsed,
    }),
    bonusActionUsed: r.bonusActionUsed,
  };
}

export function restoreIntimidatingPresenceUpdate(
  c: DndContext,
): Partial<DndContext> {
  if (!c.classStates.barbarian) return {};
  const bs = b(c);
  const r = tsRestoreIP(bs.rageCharges, bs.intimidatingPresenceUsed);
  if (!r) return {};
  return updateClass(c, "barbarian", {
    intimidatingPresenceUsed: r.intimidatingPresenceUsed,
    rageCharges: resourceCount(r.rageCharges),
  });
}

export function brutalStrikeUpdate(c: DndContext): Partial<DndContext> {
  const bs = b(c);
  assert(
    !isIncapacitated(c) &&
      canUseBrutalStrike(bs.recklessThisTurn, bs.level, true) &&
      !bs.brutalStrikeUsedThisTurn,
    "guard: canBrutalStrike should have prevented this",
  );
  return updateClass(c, "barbarian", { brutalStrikeUsedThisTurn: true });
}

export function relentlessRageUpdate(
  c: DndContext,
  conSaveSucceeded: boolean,
): Partial<DndContext> {
  const bs = b(c);
  assert(
    c.pendingResolution?.kind === "relentlessRage" &&
      canUseRelentlessRage(bs.level, bs.raging),
    "guard: canRelentlessRage should have prevented this",
  );
  const result = relentlessRageResult(conSaveSucceeded, bs.level);
  return {
    ...updateClass(c, "barbarian", {
      relentlessRageTimesUsed: bs.relentlessRageTimesUsed + 1,
    }),
    ...(result.survived ? { hp: hp(result.newHp) } : {}),
  };
}

/** Start-of-turn: check maintenance (uses LAST turn's flags), reset per-turn flags, decrement turns. */
export function barbarianStartTurnUpdate(c: DndContext): Partial<DndContext> {
  const bs = c.classStates.barbarian;
  if (!bs || bs.level === 0) return {};
  const rs = tsCheckMaintenance(toRageState(c), bs.level);
  const turns =
    rs.raging && rs.rageTurnsRemaining > 0
      ? rs.rageTurnsRemaining - 1
      : rs.rageTurnsRemaining;
  return updateClass(c, "barbarian", {
    ...fromRageState(rs),
    rageTurnsRemaining: turns,
    recklessThisTurn: false,
    frenzyUsedThisTurn: false,
    brutalStrikeUsedThisTurn: false,
  });
}

export function barbarianShortRestUpdate(c: DndContext): Partial<DndContext> {
  const bs = c.classStates.barbarian;
  if (!bs || bs.level === 0) return {};
  return updateClass(c, "barbarian", {
    rageCharges: resourceCount(Math.min(bs.rageCharges + 1, bs.rageMaxCharges)),
    relentlessRageTimesUsed: 0,
  });
}

export function barbarianLongRestUpdate(c: DndContext): Partial<DndContext> {
  const bs = c.classStates.barbarian;
  if (!bs || bs.level === 0) return {};
  return updateClass(c, "barbarian", {
    ...fromRageState(tsPEndRage(toRageState(c))),
    rageCharges: bs.rageMaxCharges,
    relentlessRageTimesUsed: 0,
    intimidatingPresenceUsed: false,
    recklessThisTurn: false,
    frenzyUsedThisTurn: false,
    brutalStrikeUsedThisTurn: false,
  });
}

export function initialBarbarianState(
  barbarianLevel: ClassLevel,
): BarbarianClassState {
  const maxCharges = resourceCount(rageMaxCharges(barbarianLevel));
  return {
    level: barbarianLevel,
    raging: false,
    rageCharges: maxCharges,
    rageMaxCharges: maxCharges,
    rageTurnsRemaining: 0,
    attackedOrForcedSaveThisTurn: false,
    rageExtendedWithBA: false,
    recklessThisTurn: false,
    frenzyUsedThisTurn: false,
    intimidatingPresenceUsed: false,
    relentlessRageTimesUsed: 0,
    brutalStrikeUsedThisTurn: false,
  };
}

export { standardExtraAttacks as barbarianExtraAttacks } from "#/machine-helpers.ts";
