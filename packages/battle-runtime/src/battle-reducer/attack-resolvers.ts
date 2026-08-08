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
        { readonly tag: "pactOfTheChainFamiliarAttack" }
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
  const cleave = attackResolvers.resolveWeaponMasteryCleaveContinuation(input);
  if (cleave.tag !== "resolved") {
    return cleave;
  }
  return attackResolvers.resolveHuntersPreyHordeBreakerContinuation({
    ...input,
    state: cleave.state,
  });
}
