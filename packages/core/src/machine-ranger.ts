import { assert } from "#/assert.ts";
import {
  canUseNaturesVeil,
  canUseTireless,
  favoredEnemyFreeUses,
  naturesVeilMaxCharges,
  tirelessMaxCharges,
  tirelessTempHp,
} from "#/features/class-ranger.ts";
import { updateClass } from "#/machine-helpers.ts";
import { isIncapacitated } from "#/machine-queries.ts";
import type { DndContext, RangerClassState } from "#/machine-types.ts";
import type { AbilityModifier, ClassLevel } from "#/types.ts";
import { resourceCount, tempHp } from "#/types.ts";

export { standardExtraAttacks as rangerExtraAttacks } from "#/machine-helpers.ts";

function r(c: DndContext) {
  return c.classStates.ranger!;
}

// -- Action Updates --

export function useFreeHuntersMarkUpdate(c: DndContext): Partial<DndContext> {
  const rs = r(c);
  assert(
    !isIncapacitated(c) && rs.level >= 1 && rs.huntersMarkFreeUses > 0,
    "guard: canFreeHuntersMark should have prevented this",
  );
  return updateClass(c, "ranger", {
    huntersMarkFreeUses: resourceCount(rs.huntersMarkFreeUses - 1),
  });
}

export function useTirelessUpdate(
  c: DndContext,
  d8Roll: number,
): Partial<DndContext> {
  const rs = r(c);
  assert(
    !isIncapacitated(c) &&
      canUseTireless(rs.level, rs.tirelessCharges) &&
      c.actionsRemaining > 0,
    "guard: canTireless should have prevented this",
  );
  const thp = tirelessTempHp(d8Roll, rs.tirelessMax);
  return {
    actionsRemaining: c.actionsRemaining - 1,
    tempHp: tempHp(thp),
    ...updateClass(c, "ranger", {
      tirelessCharges: resourceCount(rs.tirelessCharges - 1),
    }),
  };
}

export function useNaturesVeilUpdate(c: DndContext): Partial<DndContext> {
  const rs = r(c);
  assert(
    !isIncapacitated(c) &&
      canUseNaturesVeil(rs.level, rs.naturesVeilCharges, !c.bonusActionUsed),
    "guard: canNaturesVeil should have prevented this",
  );
  return {
    bonusActionUsed: true,
    invisible: true,
    ...updateClass(c, "ranger", {
      naturesVeilCharges: resourceCount(rs.naturesVeilCharges - 1),
    }),
  };
}

// -- Lifecycle --

export function rangerStartTurnUpdate(c: DndContext): Partial<DndContext> {
  const rs = c.classStates.ranger;
  if (!rs || rs.level === 0) return {};
  return {};
}

export function rangerShortRestUpdate(c: DndContext): Partial<DndContext> {
  const rs = c.classStates.ranger;
  if (!rs || rs.level === 0) return {};
  return {};
}

export function rangerLongRestUpdate(c: DndContext): Partial<DndContext> {
  const rs = c.classStates.ranger;
  if (!rs || rs.level === 0) return {};
  return updateClass(c, "ranger", {
    huntersMarkFreeUses: resourceCount(favoredEnemyFreeUses(rs.level)),
    tirelessCharges: rs.tirelessMax,
    naturesVeilCharges: rs.naturesVeilMax,
  });
}

// -- Init --

export function initialRangerState(
  rangerLevel: ClassLevel,
  wisMod?: AbilityModifier,
): RangerClassState {
  const wm = wisMod ?? 0;
  const tMax = resourceCount(rangerLevel >= 10 ? tirelessMaxCharges(wm) : 0);
  const nvMax = resourceCount(
    rangerLevel >= 14 ? naturesVeilMaxCharges(wm) : 0,
  );
  return {
    level: rangerLevel,
    huntersMarkFreeUses: resourceCount(favoredEnemyFreeUses(rangerLevel)),
    tirelessCharges: tMax,
    tirelessMax: tMax,
    naturesVeilCharges: nvMax,
    naturesVeilMax: nvMax,
  };
}
