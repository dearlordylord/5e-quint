import type { SupportedAttackActionOption } from "../battle-action-options.ts";
import type { BattleInterruptTrigger } from "../battle-interrupt-triggers.ts";
import type {
  AdmittedMonkFocusFlurryOfBlowsStrikeBattleResolutionInput,
  AttackBattleResolutionInput,
  BattleInterruptRouteOptions,
  BattleAttackHostSubject,
  BattleFill,
  BattleResolutionResult,
  BattleResolutionInputForSubject,
  BattleState,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import {
  HUNTERS_PREY_HORDE_BREAKER_DAMAGE_HOLE_ID,
  WEAPON_MASTERY_CLEAVE_DAMAGE_HOLE_ID,
} from "./domain-constants.ts";
import { sourceDamageRollPenaltyRollFillMatchesDamageRoll } from "./damage-helpers.ts";

export type BattleAttackContinuationResolutionInput = {
  readonly state: BattleState;
  readonly subject: BattleAttackHostSubject;
  readonly firstTargetId: CombatantId;
  readonly attack: SupportedAttackActionOption;
  readonly fills: readonly BattleFill[];
  readonly handledInterruptTrigger: BattleInterruptTrigger | undefined;
};

export type BattleAttackResolvers = {
  readonly resolveAttack: (
    input: AttackBattleResolutionInput,
  ) => BattleResolutionResult;
  readonly resolveWeaponMasteryCleaveContinuation: (
    input: BattleAttackContinuationResolutionInput,
  ) => BattleResolutionResult;
  readonly resolveHuntersPreyHordeBreakerContinuation: (
    input: BattleAttackContinuationResolutionInput,
  ) => BattleResolutionResult;
};

export type BattleAttackRouteResolvers = BattleAttackResolvers & {
  readonly resolveMonkFocusFlurryOfBlowsStrike: (
    input: AdmittedMonkFocusFlurryOfBlowsStrikeBattleResolutionInput,
  ) => BattleResolutionResult;
  readonly resolvePactOfTheChainFamiliarReactionAttack: (
    input: BattleResolutionInputForSubject<
      Extract<
        import("../battle-subjects.ts").BattleSubject,
        { readonly tag: "companionAttack" }
      >
    > &
      BattleInterruptRouteOptions,
  ) => BattleResolutionResult;
};

export function resolveAttackFollowUpContinuations(
  attackResolvers: Pick<
    BattleAttackResolvers,
    | "resolveWeaponMasteryCleaveContinuation"
    | "resolveHuntersPreyHordeBreakerContinuation"
  >,
  input: BattleAttackContinuationResolutionInput,
): BattleResolutionResult {
  const cleave = attackResolvers.resolveWeaponMasteryCleaveContinuation({
    ...input,
    fills: input.fills.filter(
      (fill) =>
        fill.kind !== "rolledDice" ||
        !sourceDamageRollPenaltyRollFillMatchesDamageRoll(
          fill,
          HUNTERS_PREY_HORDE_BREAKER_DAMAGE_HOLE_ID,
        ),
    ),
  });
  if (cleave.tag !== "resolved") {
    return cleave;
  }
  return attackResolvers.resolveHuntersPreyHordeBreakerContinuation({
    ...input,
    state: cleave.state,
    fills: input.fills.filter(
      (fill) =>
        fill.kind !== "rolledDice" ||
        !sourceDamageRollPenaltyRollFillMatchesDamageRoll(
          fill,
          WEAPON_MASTERY_CLEAVE_DAMAGE_HOLE_ID,
        ),
    ),
  });
}
