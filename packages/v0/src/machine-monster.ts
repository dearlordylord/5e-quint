/** Monster resource update helpers (Phase L: Legendary Actions, LR, Recharge, Daily). */

/** Set all boolean Record values to true (recharge ability refresh on rest). */
export function refreshBoolRecord(
  record: Readonly<Record<string, boolean>>,
): Record<string, boolean> {
  return Object.fromEntries(Object.keys(record).map((k) => [k, true]));
}

/** Compute monster resource updates for start of turn (LA refresh + recharge). */
export function monsterStartTurnUpdate(
  legendaryActionsMax: number,
  rechargeAvailable: Readonly<Record<string, boolean>>,
  rechargedAbilities: ReadonlyArray<string> | undefined,
): Record<string, unknown> {
  const updates: Record<string, unknown> = {
    legendaryActionsRemaining: legendaryActionsMax,
  };
  if (rechargedAbilities && rechargedAbilities.length > 0) {
    const newRecharge = { ...rechargeAvailable };
    for (const name of rechargedAbilities) {
      if (name in newRecharge) newRecharge[name] = true;
    }
    updates.rechargeAvailable = newRecharge;
  }
  return updates;
}

/** Apply Legendary Resistance: override first failed save to success, decrement LR. */
export function applyLegendaryResistance<S extends { saveSucceeded: boolean }>(
  saves: ReadonlyArray<S>,
  useLR: boolean | undefined,
  remaining: number,
): { effectiveSaves: ReadonlyArray<S>; lrUsed: boolean } {
  if (!useLR || remaining <= 0) return { effectiveSaves: saves, lrUsed: false };
  const hasFailed = saves.some((s) => !s.saveSucceeded);
  if (!hasFailed) return { effectiveSaves: saves, lrUsed: false };
  return {
    effectiveSaves: saves.map((s) =>
      !s.saveSucceeded ? { ...s, saveSucceeded: true } : s,
    ),
    lrUsed: true,
  };
}

/** Use a recharge ability: mark as unavailable. */
export function useRechargeAbilityUpdate(
  rechargeAvailable: Readonly<Record<string, boolean>>,
  name: string,
): Partial<{ rechargeAvailable: Record<string, boolean> }> {
  if (!rechargeAvailable[name]) return {};
  return { rechargeAvailable: { ...rechargeAvailable, [name]: false } };
}

/** Use a daily ability: decrement remaining. */
export function useDailyAbilityUpdate(
  dailyUsesRemaining: Readonly<Record<string, number>>,
  name: string,
): Partial<{ dailyUsesRemaining: Record<string, number> }> {
  const remaining = dailyUsesRemaining[name] ?? 0;
  if (remaining <= 0) return {};
  return {
    dailyUsesRemaining: { ...dailyUsesRemaining, [name]: remaining - 1 },
  };
}

/** Monster long rest: refresh recharge + daily + LR. */
export function monsterLongRestUpdate(ctx: {
  rechargeAvailable: Readonly<Record<string, boolean>>;
  dailyUsesMax: Readonly<Record<string, number>>;
  legendaryResistancesMax: number;
}): {
  rechargeAvailable: Record<string, boolean>;
  dailyUsesRemaining: Readonly<Record<string, number>>;
  legendaryResistancesRemaining: number;
} {
  return {
    rechargeAvailable: refreshBoolRecord(ctx.rechargeAvailable),
    dailyUsesRemaining: ctx.dailyUsesMax,
    legendaryResistancesRemaining: ctx.legendaryResistancesMax,
  };
}
