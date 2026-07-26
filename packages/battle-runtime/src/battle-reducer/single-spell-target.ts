import type { BattleSubject } from "../battle-subjects.ts";
import type {
  BattleExecutableSpellInvocation,
  BattleResolutionResult,
  BattleState,
  BattleTargetSpatialFact,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import { needsHolesResult } from "./needs-holes-result.ts";
import { invalidResult } from "./result-helpers.ts";
import { spellTargetHole, spellTargetIsLegal } from "./spells-targeting.ts";

export function selectSingleSpellTarget(input: {
  readonly state: BattleState;
  readonly subject: BattleSubject;
  readonly actorId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation;
  readonly targetId: CombatantId | undefined;
  readonly targetSpatialFacts: readonly BattleTargetSpatialFact[];
  readonly invalidTargetMessage: string;
}):
  | {
      readonly tag: "selected";
      readonly targetId: CombatantId;
      readonly target: NonNullable<
        ReturnType<BattleState["combatants"]["get"]>
      >;
    }
  | BattleResolutionResult {
  if (input.targetId === undefined) {
    return needsHolesResult(input.state, input.subject, [
      spellTargetHole(input.state, input.actorId, input.invocation),
    ]);
  }
  const target = input.state.combatants.get(input.targetId);
  if (
    target === undefined ||
    !spellTargetIsLegal(
      input.state,
      input.actorId,
      input.targetId,
      input.invocation,
      input.targetSpatialFacts,
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      input.invalidTargetMessage,
    );
  }
  return { tag: "selected", targetId: input.targetId, target };
}
