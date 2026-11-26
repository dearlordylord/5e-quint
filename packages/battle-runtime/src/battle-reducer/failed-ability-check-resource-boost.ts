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

import type { DamageDieSize } from "@dnd/shared/types";
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
} from "../battle-state-execution.ts";
import {
  d20TestAddedDieDecisionIssue,
  type D20TestAddedDieMessages,
} from "./d20-test-added-die.ts";
import {
  battleStateWithD20TestSourcePaid,
  d20TestSourcePaidOnRoll,
  d20TestSpendAvailability,
  type D20TestSpendAvailability,
  type D20TestSpendRecord,
  type D20TestSpendScope,
} from "./d20-test-source-spend.ts";

const FAILED_ABILITY_CHECK_RESOURCE_BOOST_SPEND_RECORD =
  "acceptedFailedAbilityCheckResourceBoosts" satisfies D20TestSpendRecord;

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

/** Where the roller's failed ability check resource boost stands for one roll, and its die. */
export type FailedAbilityCheckResourceBoostForRoll = {
  readonly availability: D20TestSpendAvailability;
  readonly dieSize: DamageDieSize | undefined;
};

/**
 * The roller's failed ability check resource boost for this roll: the feature
 * it can pay for, or on a replay of the roll that paid, the feature it has.
 */
export function failedAbilityCheckResourceBoostForRoll(
  state: BattleState,
  scope: D20TestSpendScope,
  roll: BattleD20TestRollKey,
): FailedAbilityCheckResourceBoostForRoll {
  const actor = state.combatants.get(roll.rollerId);
  const payable = payableFailedAbilityCheckResourceBoost(actor);
  const execution = payable ?? rollerFailedAbilityCheckResourceBoosts(actor)[0];
  return {
    availability: d20TestSpendAvailability({
      state,
      scope,
      record: FAILED_ABILITY_CHECK_RESOURCE_BOOST_SPEND_RECORD,
      roll,
      rollerCanPay: payable !== undefined,
    }),
    dieSize: execution?.abilityCheck.bonus.dieSize,
  };
}

/** Whether the boost is offered on the check as it stands: it fails and the roller can pay. */
export function failedAbilityCheckResourceBoostOffered(input: {
  readonly boost: FailedAbilityCheckResourceBoostForRoll;
  readonly standsFailed: boolean;
}): boolean {
  return input.boost.availability === "available" && input.standsFailed;
}

/** The option an ability check hole is asked again with for this roller. */
export function failedAbilityCheckResourceBoostOption(
  boost: FailedAbilityCheckResourceBoostForRoll,
  roll: BattleD20TestRollKey,
): BattleFailedAbilityCheckResourceBoostOption | undefined {
  if (boost.dieSize === undefined) return undefined;
  return {
    effectKind: FAILED_ABILITY_CHECK_RESOURCE_BOOST_EFFECT_KIND,
    label: "Failed ability check resource boost",
    rollerId: roll.rollerId,
    dieSize: boost.dieSize,
  };
}

/** The issue with a boost decision on an ability check as it stands, if any. */
export function failedAbilityCheckResourceBoostDecisionIssue(input: {
  readonly boost: FailedAbilityCheckResourceBoostForRoll;
  readonly standsFailed: boolean;
  readonly decision:
    | { readonly kind: "decline" }
    | { readonly kind: "addDie"; readonly dieRoll: number };
}): string | null {
  return d20TestAddedDieDecisionIssue({
    availability: input.boost.availability,
    standsFailed: input.standsFailed,
    dieSize: input.boost.dieSize,
    decision: input.decision,
    messages: FAILED_ABILITY_CHECK_RESOURCE_BOOST_MESSAGES,
  });
}

/**
 * Whether an admitted check spends a use of its roller's failed ability
 * check resource boost. Only {@link failedAbilityCheckResourceBoostUseForRoll}
 * makes one, so the spend follows a checked decision.
 */
export type FailedAbilityCheckResourceBoostUse = Brand.Branded<
  | { readonly spends: false }
  | {
      readonly spends: true;
      readonly scope: D20TestSpendScope;
      readonly roll: BattleD20TestRollKey;
    },
  "FailedAbilityCheckResourceBoostUse"
>;
const FailedAbilityCheckResourceBoostUse =
  Brand.nominal<FailedAbilityCheckResourceBoostUse>();

/** A check that doesn't spend a failed ability check resource boost. */
export const NO_FAILED_ABILITY_CHECK_RESOURCE_BOOST_USE: FailedAbilityCheckResourceBoostUse =
  FailedAbilityCheckResourceBoostUse({ spends: false });

/**
 * The boost's use of a check whose added-die decisions were checked: it
 * spends when the boost added its die and the check succeeds with every added
 * die, unless an earlier pass of the subject already paid on this check. A
 * check that still fails keeps the use.
 */
export function failedAbilityCheckResourceBoostUseForRoll(input: {
  readonly state: BattleState;
  readonly scope: D20TestSpendScope;
  readonly roll: BattleD20TestRollKey;
  readonly added: boolean;
  readonly succeeded: boolean;
}): FailedAbilityCheckResourceBoostUse {
  return input.added &&
    input.succeeded &&
    !d20TestSourcePaidOnRoll({
      ...input,
      record: FAILED_ABILITY_CHECK_RESOURCE_BOOST_SPEND_RECORD,
    })
    ? FailedAbilityCheckResourceBoostUse({
        spends: true,
        scope: input.scope,
        roll: input.roll,
      })
    : NO_FAILED_ABILITY_CHECK_RESOURCE_BOOST_USE;
}

/**
 * Spends one use of the roller's failed ability check resource boost for an
 * admitted check that succeeded with it, and records the check for the rest
 * of the subject. On a replay of the subject the same check finds it already
 * paid and changes nothing.
 */
export function battleStateAfterFailedAbilityCheckResourceBoost(
  state: BattleState,
  use: FailedAbilityCheckResourceBoostUse,
): BattleState {
  if (
    !use.spends ||
    d20TestSourcePaidOnRoll({
      state,
      scope: use.scope,
      record: FAILED_ABILITY_CHECK_RESOURCE_BOOST_SPEND_RECORD,
      roll: use.roll,
    })
  )
    return state;
  const actor = state.combatants.get(use.roll.rollerId);
  const execution = payableFailedAbilityCheckResourceBoost(actor);
  /* v8 ignore next -- @preserve -- A validated boost belongs to a character who could pay for it. */
  if (actor?.origin.kind !== "character" || execution === undefined)
    return state;
  const resourcePoolRef = execution.abilityCheck.spends.resourcePoolRef;
  const spent: BattleState = {
    ...state,
    combatants: new Map(state.combatants).set(use.roll.rollerId, {
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
  return battleStateWithD20TestSourcePaid({
    state: spent,
    scope: use.scope,
    record: FAILED_ABILITY_CHECK_RESOURCE_BOOST_SPEND_RECORD,
    paid: use.roll,
  });
}
