import { Match } from "effect";

import type {
  ProjectedAmount,
  ProjectedExecutableAction,
  ProjectedResourceCap,
  ProjectedResourcePool,
  ProjectedSource,
} from "#/projected-executable.ts";
import {
  type ProjectedExecutionRuntime,
  type ProjectedInterpretation,
  type ProjectedInterpreterActor,
} from "#/projected-mechanic-interpreter.ts";
import { resolveAmount } from "#/projected-mechanic-interpreter-helpers.ts";

export type ProjectedAvailabilityState = {
  readonly fighterLevel: number;
  readonly secondWindCharges: number;
  readonly actionSurgeCharges: number;
  readonly actionSurgeUsedThisTurn: boolean;
  readonly bonusActionUsed: boolean;
  readonly actionsRemaining: number;
};

export type ProjectedPoolCost = "actionSurge" | "secondWind";
export type ProjectedQuotaCost = "action" | "bonusAction";

function projectedActionSourceLabel(source: ProjectedSource): string {
  return Match.value(source.unitId).pipe(
    Match.when("acid_splash", () => "Acid Splash"),
    Match.when("fighter_second_wind", () => "Second Wind"),
    Match.when("fighter_action_surge_l2", () => "Action Surge"),
    Match.orElse(() => source.unitId),
  );
}

function resolveThresholdCap(
  cap: ProjectedResourceCap,
  fighterLevel: number,
): number {
  if (cap.tag !== "PRCThresholdTiers") {
    return 0;
  }
  return cap.value.tiers.reduce(
    (current, tier) => (fighterLevel >= tier.atLevel ? tier.value : current),
    cap.value.base,
  );
}

function projectedPoolLabel(pool: ProjectedResourcePool): string {
  return Match.value(pool).pipe(
    Match.when("PRPSecondWind", () => "Second Wind"),
    Match.when("PRPActionSurge", () => "Action Surge"),
    Match.exhaustive,
  );
}

function projectedPoolCost(pool: ProjectedResourcePool): ProjectedPoolCost {
  return Match.value(pool).pipe(
    Match.when("PRPSecondWind", () => "secondWind" as const),
    Match.when("PRPActionSurge", () => "actionSurge" as const),
    Match.exhaustive,
  );
}

function projectedActionResourceRemaining(
  state: ProjectedAvailabilityState,
  pool: ProjectedResourcePool,
): number {
  return Match.value(pool).pipe(
    Match.when("PRPSecondWind", () => state.secondWindCharges),
    Match.when("PRPActionSurge", () => state.actionSurgeCharges),
    Match.exhaustive,
  );
}

function projectedActivationQuota(
  action: ProjectedExecutableAction,
): ProjectedQuotaCost | null {
  return Match.value(action.activationCost).pipe(
    Match.when("PACAction", () => "action" as const),
    Match.when("PACBonusAction", () => "bonusAction" as const),
    Match.when("PACFree", () => null),
    Match.exhaustive,
  );
}

export function actionCostParts(
  action: ProjectedExecutableAction,
): ReadonlyArray<ProjectedPoolCost | ProjectedQuotaCost> {
  const parts: Array<ProjectedPoolCost | ProjectedQuotaCost> = [];
  const activationQuota = projectedActivationQuota(action);
  if (activationQuota != null) parts.push(activationQuota);
  if (action.resourceGate.tag === "PRGUseCount") {
    parts.push(projectedPoolCost(action.resourceGate.value.pool));
  }
  return parts;
}

function firstAmount(
  action: ProjectedExecutableAction,
): ProjectedAmount | null {
  const healNode = action.nodes.find((node) => node.tag === "PENHealHp");
  if (healNode?.tag === "PENHealHp") return healNode.value.amount;
  const damageNode = action.nodes.find((node) => node.tag === "PENDamage");
  return damageNode?.tag === "PENDamage" ? damageNode.value.amount : null;
}

function formatResolvedAmount(
  amount: ReturnType<typeof resolveAmount>,
): string {
  const dicePart = `${amount.dice}d${amount.dieSize}`;
  if (amount.flat === 0) return dicePart;
  return `${dicePart} + ${amount.flat}`;
}

export function canUseProjectedAction(
  action: ProjectedExecutableAction,
  state: ProjectedAvailabilityState,
): boolean {
  const activationQuota = projectedActivationQuota(action);
  if (
    (activationQuota === "action" && state.actionsRemaining <= 0) ||
    (activationQuota === "bonusAction" && state.bonusActionUsed)
  ) {
    return false;
  }
  if (action.resourceGate.tag === "PRGUseCount") {
    const cap = resolveThresholdCap(
      action.resourceGate.value.cap,
      state.fighterLevel,
    );
    if (cap <= 0) return false;
    if (
      projectedActionResourceRemaining(state, action.resourceGate.value.pool) <=
      0
    ) {
      return false;
    }
  }
  return Match.value(action.usageLimit).pipe(
    Match.when("PULNone", () => true),
    Match.when("PULOncePerTurn", () => !state.actionSurgeUsedThisTurn),
    Match.exhaustive,
  );
}

export function describeProjectedAction(
  action: ProjectedExecutableAction,
  actor: ProjectedInterpreterActor,
): string {
  const amount = firstAmount(action);
  if (amount != null && action.source.unitId === "fighter_second_wind") {
    return `Heal ${formatResolvedAmount(resolveAmount(actor, amount))} HP`;
  }
  const grantNode = action.nodes.find(
    (node) => node.tag === "PENGrantExtraAction",
  );
  if (grantNode?.tag === "PENGrantExtraAction") {
    const resourcePrefix =
      action.resourceGate.tag === "PRGUseCount"
        ? `Expend one ${projectedPoolLabel(action.resourceGate.value.pool)} use to `
        : "";
    const extraActionLabel = Match.value(grantNode.value.restriction).pipe(
      Match.when(
        "PGARExcludeMagicAction",
        () => "gain one additional non-Magic action this turn",
      ),
      Match.exhaustive,
    );
    return `${resourcePrefix}${extraActionLabel}`;
  }
  return `Cast ${projectedActionSourceLabel(action.source)}`;
}

export function selfOnlyRuntime(
  actorId: string,
  resolveAmounts: ProjectedExecutionRuntime["resolveAmount"],
): ProjectedExecutionRuntime {
  return {
    resolveAttachment: () => [actorId],
    resolveAttackRoll: () => [],
    resolveSaveGate: () => [],
    resolveAmount: resolveAmounts,
  };
}

export function interpretationHealOutcome(
  interpretation: ProjectedInterpretation,
): string {
  const heal = interpretation.transitions.find(
    (transition) => transition.tag === "PITHealHp",
  );
  if (heal?.tag !== "PITHealHp") {
    throw new Error(`${interpretation.source.unitId}: missing heal transition`);
  }
  const rolled = heal.value.rolledTotal;
  const flat = heal.value.amount.flat;
  const flatText = flat === 0 ? "" : ` + ${flat}`;
  const rolledText =
    rolled == null
      ? formatResolvedAmount(heal.value.amount)
      : `${heal.value.amount.dice}d${heal.value.amount.dieSize}(${rolled})${flatText}`;
  return `Healed ${rolledText} = ${heal.value.total} HP`;
}
