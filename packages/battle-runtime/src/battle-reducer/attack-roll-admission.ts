import type { AttackRollMode } from "@dnd/shared-algebras/runtime-hole-algebra";
import type {
  BattleAttackRollResult,
  BattleFill,
  BattleResolutionResult,
  BattleState,
} from "../battle-state-execution.ts";
import type { SpatialQualificationIssue } from "./ranged-attack-close-combat.ts";
import { invalidResult } from "./result-helpers.ts";

type AttackRollInput =
  | BattleAttackRollResult
  | Extract<BattleFill, { readonly kind: "attackRoll" }>;

/** A failed spatial calculation must be refused before requesting a roll. */
export function prepareAttackRollInput<Roll extends AttackRollInput>(input: {
  readonly errorState: BattleState;
  readonly requiredRollMode:
    | AttackRollMode
    | undefined
    | SpatialQualificationIssue;
  readonly attackRoll: Roll | undefined;
  readonly requestRoll: (
    mode: AttackRollMode | undefined,
  ) => Extract<BattleResolutionResult, { readonly tag: "needsHoles" }>;
}):
  | {
      readonly tag: "result";
      readonly result: Extract<
        BattleResolutionResult,
        { readonly tag: "invalid" | "needsHoles" }
      >;
    }
  | {
      readonly tag: "ready";
      readonly requiredRollMode: AttackRollMode | undefined;
      readonly attackRoll: Roll;
    } {
  const { requiredRollMode, attackRoll } = input;
  if (typeof requiredRollMode === "object")
    return {
      tag: "result",
      result: invalidResult(
        input.errorState,
        "invalidFill",
        requiredRollMode.message,
      ),
    };
  if (attackRoll === undefined)
    return { tag: "result", result: input.requestRoll(requiredRollMode) };
  return { tag: "ready", requiredRollMode, attackRoll };
}
