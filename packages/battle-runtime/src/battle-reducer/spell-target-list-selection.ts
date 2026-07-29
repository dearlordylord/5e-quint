import type { BattleSubject } from "../battle-subjects.ts";
import type {
  BattleFill,
  BattleHoleId,
  BattleResolutionResult,
  BattleState,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import { fillsBelongToSpellCastHoles } from "./fill-hole-protocol.ts";
import { needsHolesResult } from "./needs-holes-result.ts";
import { invalidResult } from "./result-helpers.ts";
import type { OkSpellFillSet } from "./spell-procedure-profiles/execution-profile.ts";
import {
  spellTargetListHole,
  spellTargetListHoleId,
  validateSpellTargetList,
} from "./spells-targeting.ts";

type TargetListSpellInvocation = Parameters<typeof validateSpellTargetList>[2];

export function selectSpellTargetList(input: {
  readonly state: BattleState;
  readonly subject: BattleSubject;
  readonly fills: readonly BattleFill[];
  readonly fillSet: Pick<OkSpellFillSet, "targetList">;
  readonly actorId: CombatantId;
  readonly invocation: TargetListSpellInvocation;
  readonly additionalHoleIds?: readonly BattleHoleId[];
  readonly invalidFillMessage: string;
}):
  | {
      readonly tag: "selected";
      readonly targetIds: readonly CombatantId[];
    }
  | BattleResolutionResult {
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !fillsBelongToSpellCastHoles(input.fills, [
      spellTargetListHoleId(input.invocation),
      ...(input.additionalHoleIds ?? []),
    ])
  ) {
    return invalidResult(input.state, "invalidFill", input.invalidFillMessage);
  }
  /* v8 ignore stop */
  const targetList = input.fillSet.targetList;
  if (targetList === undefined) {
    return needsHolesResult(input.state, input.subject, [
      spellTargetListHole(input.state, input.actorId, input.invocation),
    ]);
  }
  const validation = validateSpellTargetList(
    input.state,
    input.actorId,
    input.invocation,
    targetList.targetIds,
    targetList.spatialFacts,
  );
  return validation === null
    ? { tag: "selected", targetIds: targetList.targetIds }
    : invalidResult(input.state, "invalidFill", validation);
}
