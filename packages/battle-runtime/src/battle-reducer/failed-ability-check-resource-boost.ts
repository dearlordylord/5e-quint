// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.failed-ability-check-resource-boost
// KERNEL-COVERAGE: runtime-owner BATTLE.D20_TEST.FAILED_D20_TEST_ADDED_DIE
// A die added to a failed ability check, paid with a resource use that is
// spent only if the check then succeeds. SRD 5.2.1 classes.md, Fighter,
// Tactical Mind: "When you fail an ability check, you can expend a use of
// your Second Wind to push yourself toward success. Rather than regaining Hit
// Points, you roll 1d10 and add the number rolled to the ability check,
// potentially turning it into a success. If the check still fails, this use
// of Second Wind isn't expended." The ability check's added-die fold
// (d20-test-added-dice.ts) offers it while the check stands failed and the
// roller has a use left, and spends the use only when the check succeeds once
// every added die is in (ASSUMPTIONS.md A67).

import { Brand } from "effect";

import {
  resourceHasUsesRemaining,
  spendCharacterResourceUse,
} from "../character-battle-resource-execution.ts";
import type { UnitFeatureProcedureExecution } from "../character-execution-vocabulary.ts";
import { characterUnitProcedureBindings } from "../character-execution-queries.ts";
import {
  FAILED_ABILITY_CHECK_RESOURCE_BOOST_EFFECT_KIND,
  type BattleCreatureState,
  type BattleD20TestRollKey,
  type BattleFailedAbilityCheckResourceBoostOption,
  type BattleState,
  type BattleTakenFailedAbilityCheckResourceBoost,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import {
  d20TestAddedDieDecisionIssue,
  type D20TestAddedDieMessages,
  type D20TestAddedDieSourceForRoll,
} from "./d20-test-added-die.ts";
import {
  battleStateWithD20TestSourceTaken,
  d20TestSourceTakenOnRoll,
  d20TestSourceTakeOnRoll,
  d20TestSpendUnavailability,
  type D20TestSpendRecord,
  type D20TestSpendScope,
} from "./d20-test-source-spend.ts";

const FAILED_ABILITY_CHECK_RESOURCE_BOOST_SPEND_RECORD =
  "acceptedFailedAbilityCheckResourceBoosts" as const satisfies D20TestSpendRecord;

export const FAILED_ABILITY_CHECK_RESOURCE_BOOST_MESSAGES = {
  unavailable:
    "Failed ability check resource boost needs a roller with a use of its resource left.",
  notFailed:
    "Failed ability check resource boost decides only on an ability check that stands failed.",
  dieRoll:
    "Failed ability check resource boost roll must be a face of the feature's die.",
} as const satisfies D20TestAddedDieMessages;

type FailedAbilityCheckResourceBoostExecution = Extract<
  UnitFeatureProcedureExecution,
  { readonly kind: "failedAbilityCheckResourceBoost" }
>;

/** The roller's failed ability check resource boost features, in binding order. */
function rollerFailedAbilityCheckResourceBoosts(
  actor: BattleCreatureState | undefined,
): readonly FailedAbilityCheckResourceBoostExecution[] {
  if (actor?.origin.kind !== "character") return [];
  return characterUnitProcedureBindings(actor.origin.execution).flatMap(
    ({ procedure }) =>
      procedure.kind === "unitFeature" &&
      procedure.execution.kind === "failedAbilityCheckResourceBoost"
        ? [procedure.execution]
        : [],
  );
}

/** The roller's feature that can pay now, if any. */
function payableFailedAbilityCheckResourceBoost(
  actor: BattleCreatureState | undefined,
): FailedAbilityCheckResourceBoostExecution | undefined {
  return rollerFailedAbilityCheckResourceBoosts(actor).find(
    (execution) =>
      actor?.origin.kind === "character" &&
      actor.origin.resources.some(
        (resource) =>
          resource.resourcePoolRef ===
            execution.abilityCheck.spends.resourcePoolRef &&
          resourceHasUsesRemaining(resource),
      ),
  );
}

/**
 * The roller's failed ability check resource boost for this roll: the die of
 * the feature it can pay for, or on a replay of the roll that took the
 * boost, the die it added then, whether or not it spent a use.
 */
export function failedAbilityCheckResourceBoostForRoll(
  state: BattleState,
  scope: D20TestSpendScope,
  roll: BattleD20TestRollKey,
): D20TestAddedDieSourceForRoll {
  const spend = {
    state,
    scope,
    record: FAILED_ABILITY_CHECK_RESOURCE_BOOST_SPEND_RECORD,
    roll,
  };
  const dieSize =
    d20TestSourceTakeOnRoll(spend)?.dieSize ??
    payableFailedAbilityCheckResourceBoost(state.combatants.get(roll.rollerId))
      ?.abilityCheck.bonus.dieSize;
  return dieSize === undefined
    ? { availability: d20TestSpendUnavailability(spend) }
    : { availability: "available", dieSize };
}

/** The option an ability check hole is asked again with for this roller's boost. */
export function failedAbilityCheckResourceBoostOption(
  boost: Extract<
    D20TestAddedDieSourceForRoll,
    { readonly availability: "available" }
  >,
  roll: BattleD20TestRollKey,
): BattleFailedAbilityCheckResourceBoostOption {
  return {
    effectKind: FAILED_ABILITY_CHECK_RESOURCE_BOOST_EFFECT_KIND,
    label: "Failed ability check resource boost",
    rollerId: roll.rollerId,
    dieSize: boost.dieSize,
  };
}

/** The issue with a boost decision on an ability check as it stands, if any. */
export function failedAbilityCheckResourceBoostDecisionIssue(input: {
  readonly boost: D20TestAddedDieSourceForRoll;
  readonly standsFailed: boolean;
  readonly decision:
    | { readonly kind: "decline" }
    | { readonly kind: "addDie"; readonly dieRoll: number };
}): string | null {
  return d20TestAddedDieDecisionIssue({
    source: input.boost,
    standsFailed: input.standsFailed,
    decision: input.decision,
    messages: FAILED_ABILITY_CHECK_RESOURCE_BOOST_MESSAGES,
  });
}

/**
 * What an admitted check's failed ability check resource boost leaves to
 * record: nothing, or the roll that took the boost, its die, and whether the
 * check succeeded and so spends a use. Only
 * {@link failedAbilityCheckResourceBoostUseForRoll} makes one, so the record
 * follows a checked decision.
 */
export type FailedAbilityCheckResourceBoostUse = Brand.Branded<
  | { readonly taken: false }
  | {
      readonly taken: true;
      readonly scope: D20TestSpendScope;
      readonly roll: BattleTakenFailedAbilityCheckResourceBoost;
    },
  "FailedAbilityCheckResourceBoostUse"
>;
const FailedAbilityCheckResourceBoostUse =
  Brand.nominal<FailedAbilityCheckResourceBoostUse>();

/** A check that doesn't take a failed ability check resource boost. */
export const NO_FAILED_ABILITY_CHECK_RESOURCE_BOOST_USE: FailedAbilityCheckResourceBoostUse =
  FailedAbilityCheckResourceBoostUse({ taken: false });

/**
 * The boost's use of a check whose added-die decisions were checked: when the
 * boost added its die, the roll is recorded with that die, and it spends a use
 * only when the check succeeds with every added die. A check that still fails
 * keeps the use. An earlier pass of the subject that recorded the roll
 * already settled it.
 */
export function failedAbilityCheckResourceBoostUseForRoll(input: {
  readonly state: BattleState;
  readonly scope: D20TestSpendScope;
  readonly roll: BattleD20TestRollKey;
  readonly boost: D20TestAddedDieSourceForRoll;
  readonly added: boolean;
  readonly succeeded: boolean;
}): FailedAbilityCheckResourceBoostUse {
  const boost = input.boost;
  return input.added &&
    boost.availability === "available" &&
    !d20TestSourceTakenOnRoll({
      ...input,
      record: FAILED_ABILITY_CHECK_RESOURCE_BOOST_SPEND_RECORD,
    })
    ? FailedAbilityCheckResourceBoostUse({
        taken: true,
        scope: input.scope,
        roll: {
          ...input.roll,
          dieSize: boost.dieSize,
          useSpent: input.succeeded,
        },
      })
    : NO_FAILED_ABILITY_CHECK_RESOURCE_BOOST_USE;
}

/**
 * Records the roll that took the roller's failed ability check resource
 * boost for the rest of the subject, and spends one use when the check
 * succeeded with it. On a replay of the subject the same check finds it
 * recorded and changes nothing.
 */
export function battleStateAfterFailedAbilityCheckResourceBoost(
  state: BattleState,
  use: FailedAbilityCheckResourceBoostUse,
): BattleState {
  if (
    !use.taken ||
    d20TestSourceTakenOnRoll({
      state,
      scope: use.scope,
      record: FAILED_ABILITY_CHECK_RESOURCE_BOOST_SPEND_RECORD,
      roll: use.roll,
    })
  )
    return state;
  return battleStateWithD20TestSourceTaken({
    state: use.roll.useSpent
      ? battleStateWithResourceBoostUseSpent(state, use.roll.rollerId)
      : state,
    scope: use.scope,
    record: FAILED_ABILITY_CHECK_RESOURCE_BOOST_SPEND_RECORD,
    taken: use.roll,
  });
}

/** The state with one use of the roller's payable boost spent. */
function battleStateWithResourceBoostUseSpent(
  state: BattleState,
  rollerId: CombatantId,
): BattleState {
  const actor = state.combatants.get(rollerId);
  const execution = payableFailedAbilityCheckResourceBoost(actor);
  /* v8 ignore next -- @preserve -- A validated boost that succeeded belongs to a character who could pay for it. */
  if (actor?.origin.kind !== "character" || execution === undefined)
    return state;
  const resourcePoolRef = execution.abilityCheck.spends.resourcePoolRef;
  return {
    ...state,
    combatants: new Map(state.combatants).set(rollerId, {
      ...actor,
      origin: {
        ...actor.origin,
        resources: actor.origin.resources.map((resource) =>
          resource.resourcePoolRef === resourcePoolRef &&
          resourceHasUsesRemaining(resource)
            ? spendCharacterResourceUse(resource)
            : resource,
        ),
      },
    }),
  };
}
