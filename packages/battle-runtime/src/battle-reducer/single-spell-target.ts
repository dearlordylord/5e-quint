import type { BattleSubject } from "../battle-subjects.ts";
import type {
  BattleExecutableSpellInvocation,
  BattleResolutionResult,
  BattleState,
  BattleTargetSpatialFact,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import type { DamageType } from "@dnd/surface/surface/types";
import { needsHolesResult } from "./needs-holes-result.ts";
import { invalidResult } from "./result-helpers.ts";
import { spellDamageTypeChoiceHole } from "./spells-damage-fills.ts";
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
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
  /* v8 ignore stop */
  return { tag: "selected", targetId: input.targetId, target };
}

export function selectSingleSpellTargetAndDamageType(input: {
  readonly state: BattleState;
  readonly subject: BattleSubject;
  readonly actorId: CombatantId;
  readonly invocation: Parameters<typeof spellDamageTypeChoiceHole>[0] & {
    readonly damageTypeChoices: readonly DamageType[];
  };
  readonly targetId: CombatantId | undefined;
  readonly targetSpatialFacts: readonly BattleTargetSpatialFact[];
  readonly damageType: DamageType | undefined;
  readonly invalidTargetMessage: string;
  readonly invalidDamageTypeMessage: string;
}):
  | {
      readonly tag: "selected";
      readonly targetId: CombatantId;
      readonly damageType: DamageType;
    }
  | BattleResolutionResult {
  const targetSelection = selectSingleSpellTarget(input);
  if (targetSelection.tag !== "selected") {
    return targetSelection;
  }
  if (input.damageType === undefined) {
    return needsHolesResult(input.state, input.subject, [
      spellDamageTypeChoiceHole(input.invocation),
    ]);
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!input.invocation.damageTypeChoices.includes(input.damageType)) {
    return invalidResult(
      input.state,
      "invalidFill",
      input.invalidDamageTypeMessage,
    );
  }
  /* v8 ignore stop */
  return {
    tag: "selected",
    targetId: targetSelection.targetId,
    damageType: input.damageType,
  };
}
