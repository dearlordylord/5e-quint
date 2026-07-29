// Standalone Warding Bond state machine used by the focused MBT parity driver.

export type WardingBondDamageSharingState = {
  readonly sourceHitPoints: number;
  readonly wardHitPoints: number;
  readonly bondPresent: boolean;
  readonly sourceTookSharedDamage: boolean;
};

type WardingBondCleanupFills = {
  readonly separatedBeyondSixtyFeet: boolean;
  readonly recastOnConnectedCreature: boolean;
};

export function wardingBondDamageSharingInitialState(input: {
  readonly sourceHitPoints: number;
  readonly wardHitPoints: number;
  readonly bondPresent: boolean;
}): WardingBondDamageSharingState {
  const sourceHitPoints = nonnegativeInteger(input.sourceHitPoints);
  return {
    sourceHitPoints,
    wardHitPoints: nonnegativeInteger(input.wardHitPoints),
    bondPresent: input.bondPresent && sourceHitPoints > 0,
    sourceTookSharedDamage: false,
  };
}

function wardingBondDamageAfterResistance(incomingDamage: number): number {
  return Math.floor(nonnegativeInteger(incomingDamage) / 2);
}

export function resolveWardingBondSharedDamage(
  state: WardingBondDamageSharingState,
  fill: { readonly incomingDamage: number },
): WardingBondDamageSharingState {
  const targetDamage = state.bondPresent
    ? wardingBondDamageAfterResistance(fill.incomingDamage)
    : nonnegativeInteger(fill.incomingDamage);
  const sourceSharesDamage =
    state.bondPresent && state.sourceHitPoints > 0 && targetDamage > 0;
  const damaged: WardingBondDamageSharingState = {
    ...state,
    sourceHitPoints: sourceSharesDamage
      ? applyDamageToHitPoints(state.sourceHitPoints, targetDamage)
      : state.sourceHitPoints,
    wardHitPoints: applyDamageToHitPoints(state.wardHitPoints, targetDamage),
    sourceTookSharedDamage: sourceSharesDamage,
  };
  return wardingBondStateAfterCleanup(damaged, {
    separatedBeyondSixtyFeet: false,
    recastOnConnectedCreature: false,
  });
}

export function resolveWardingBondCleanup(
  state: WardingBondDamageSharingState,
  fills: WardingBondCleanupFills,
): WardingBondDamageSharingState {
  return wardingBondStateAfterCleanup(
    { ...state, sourceTookSharedDamage: false },
    fills,
  );
}

function wardingBondStateAfterCleanup(
  state: WardingBondDamageSharingState,
  fills: WardingBondCleanupFills,
): WardingBondDamageSharingState {
  return state.bondPresent &&
    (state.sourceHitPoints === 0 ||
      fills.separatedBeyondSixtyFeet ||
      fills.recastOnConnectedCreature)
    ? { ...state, bondPresent: false }
    : state;
}

function applyDamageToHitPoints(hitPoints: number, damage: number): number {
  return nonnegativeInteger(hitPoints - nonnegativeInteger(damage));
}

function nonnegativeInteger(value: number): number {
  return Math.max(0, Math.floor(value));
}
