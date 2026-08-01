import type {
  BattleAttackHitTriggerKind,
  BattleResolutionInputForSubject,
  BattleResolutionResult,
} from "../battle-state-execution.ts";
import type { BattleInterruptTrigger } from "../battle-interrupt-triggers.ts";
import { sameBattleSubject, type BattleSubject } from "../battle-subjects.ts";
import {
  characterSpellProcedure,
  type BattleSpellProcedureExecution,
} from "../character-execution-queries.ts";
import { currentInterruptCheckpoint } from "./battle-snapshot.ts";
import { currentActorId } from "./creature-state-leaves.ts";
import {
  combatantCanTakeActions,
  isCharacterBattleCreatureState,
} from "./creature-state-execution.ts";
import { fillsBelongToSpellCastHoles } from "./fill-hole-protocol.ts";
import { interruptedProcedureSupportsAttackDamageChanges } from "./interrupt-execution.ts";
import { invalidResult } from "./result-helpers.ts";
import { isAttackHitBonusActionSpellInvocation } from "./spell-interrupt-procedure-kinds.ts";
import {
  spellProcedureExecutionFor,
  type SpellProcedureExecutionRegistry,
} from "./spell-procedure-profiles/execution-registry.ts";
import {
  spellActTurnResourceAvailable,
  spellHasAvailableSpend,
} from "./spell-turn-resources.ts";
import { activeOngoingFeaturesPreventSpellInvocation } from "./spells-invocation-guards.ts";
import { spellFillSet } from "./spells-resolve-fill-set.ts";

type AttackHitBonusActionSpellCommandSubject = Extract<
  BattleSubject,
  {
    readonly tag: "runtimeCommand";
    readonly command: "castAttackHitBonusActionSpell";
  }
>;

type AttackHitBonusActionSpellCommandInput =
  BattleResolutionInputForSubject<AttackHitBonusActionSpellCommandSubject> & {
    readonly handledInterruptTrigger?: BattleInterruptTrigger;
  };

type AttackHitBonusActionSpellInvocation = Extract<
  BattleSpellProcedureExecution,
  {
    readonly procedure:
      | "afterHitDamage"
      | "afterHitSaveGatedCondition"
      | "afterHitTimedDamageAndSave"
      | "afterHitDamageAndIllumination";
  }
>;

function attackHitBonusActionSpellFillValidation(
  input: BattleResolutionInputForSubject<AttackHitBonusActionSpellCommandSubject>,
  invocation: AttackHitBonusActionSpellInvocation,
):
  | {
      readonly tag: "validNonSave";
      readonly fillSet: Extract<
        ReturnType<typeof spellFillSet>,
        { readonly tag: "ok" }
      >;
    }
  | {
      readonly tag: "invalid";
      readonly result: Extract<
        BattleResolutionResult,
        { readonly tag: "invalid" }
      >;
    } {
  const fillSet = spellFillSet(
    input.fills,
    invocation,
    invocation.sourceProcedureRef,
    input.subject.actorId,
    input.state,
  );
  if (fillSet.tag === "invalid") {
    return {
      tag: "invalid",
      result: invalidResult(input.state, "invalidFill", fillSet.message),
    };
  }
  return fillsBelongToSpellCastHoles(input.fills)
    ? { tag: "validNonSave", fillSet }
    : {
        tag: "invalid",
        result: invalidResult(
          input.state,
          "invalidFill",
          "Attack-hit Bonus Action spell accepts only spell-cast Reaction trigger facts.",
        ),
      };
}

function afterHitSpellMatchesAttackTrigger(
  invocation: Pick<AttackHitBonusActionSpellInvocation, "procedure">,
  triggerKind: BattleAttackHitTriggerKind,
): boolean {
  if (
    invocation.procedure === "afterHitDamage" ||
    invocation.procedure === "afterHitTimedDamageAndSave" ||
    invocation.procedure === "afterHitDamageAndIllumination"
  ) {
    return triggerKind === "meleeWeapon" || triggerKind === "unarmedStrike";
  }
  return triggerKind === "meleeWeapon" || triggerKind === "rangedWeapon";
}

export function resolveCastAttackHitBonusActionSpellCommand(
  input: AttackHitBonusActionSpellCommandInput,
  executionRegistry: SpellProcedureExecutionRegistry,
): BattleResolutionResult {
  const frame = currentInterruptCheckpoint(input.state);
  const activeInterrupt = frame?.activeInterrupt;
  const actor = input.state.combatants.get(input.subject.casterId);
  const target =
    frame?.trigger === "attackHit"
      ? input.state.combatants.get(frame.targetId)
      : undefined;
  const invocation =
    actor?.origin.kind === "character"
      ? characterSpellProcedure(
          actor.origin.execution,
          input.subject.procedureRef,
          actor,
        )
      : undefined;
  if (
    frame?.trigger !== "attackHit" ||
    frame.continuation.kind !== "replay" ||
    activeInterrupt === undefined ||
    activeInterrupt.responderId !== input.subject.casterId ||
    !sameBattleSubject(activeInterrupt.subject, input.subject)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Attack-hit Bonus Action spell casting requires an active matching attack-hit window.",
    );
  }
  if (
    !isCharacterBattleCreatureState(actor) ||
    invocation === undefined ||
    !isAttackHitBonusActionSpellInvocation(invocation)
  ) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Attack-hit Bonus Action spell command requires a supported prepared after-hit spell.",
    );
  }
  if (!combatantCanTakeActions(actor)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Attack-hit Bonus Action spell caster can no longer take actions.",
    );
  }
  if (target === undefined) {
    return invalidResult(
      input.state,
      "missingCombatant",
      "Attack-hit Bonus Action spell target is not in this battle.",
    );
  }
  if (
    frame.attackerId !== input.subject.casterId ||
    currentActorId(input.state) !== input.subject.casterId ||
    frame.continuation.subject.tag === "bonusAction" ||
    !afterHitSpellMatchesAttackTrigger(invocation, frame.attackHitTriggerKind)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Attack-hit Bonus Action spell is not available for this hit.",
    );
  }
  if (
    activeOngoingFeaturesPreventSpellInvocation(input.state, actor, invocation)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Attack-hit Bonus Action spell is unavailable while an active ongoing feature prevents spellcasting.",
    );
  }
  if (!spellHasAvailableSpend(actor, invocation)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Attack-hit Bonus Action spell no longer has its required runtime spell resource.",
    );
  }
  if (invocation.procedure === "afterHitSaveGatedCondition") {
    return spellProcedureExecutionFor(
      executionRegistry,
      invocation.procedure,
    ).resolve({
      input: { ...input, target },
      actorId: input.subject.casterId,
      invocation,
      fillSet: input.fills,
    });
  }
  if (!interruptedProcedureSupportsAttackDamageChanges(frame.continuation)) {
    return invalidResult(
      input.state,
      "unsupportedSubject",
      "After-hit damage cannot modify a stored-glyph replay continuation.",
    );
  }
  const attackDamageChangeFrame = {
    ...frame,
    continuation: frame.continuation,
  };
  const fillValidation = attackHitBonusActionSpellFillValidation(
    input,
    invocation,
  );
  if (fillValidation.tag === "invalid") {
    return fillValidation.result;
  }
  if (
    !spellActTurnResourceAvailable(
      input.state.currentTurnResources,
      input.subject.casterId,
      invocation,
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Attack-hit Bonus Action spell is no longer available for this turn.",
    );
  }
  if (invocation.procedure === "afterHitDamage") {
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (fillValidation.tag !== "validNonSave") {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.state,
        "invalidFill",
        "Attack-hit damage spell fills were not parsed.",
      );
    }
    /* v8 ignore stop */
    return spellProcedureExecutionFor(
      executionRegistry,
      invocation.procedure,
    ).resolve({
      input: { ...input, frame: attackDamageChangeFrame, target },
      actorId: input.subject.casterId,
      invocation,
      fillSet: fillValidation.fillSet,
    });
  }
  if (invocation.procedure === "afterHitDamageAndIllumination") {
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (fillValidation.tag !== "validNonSave") {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.state,
        "invalidFill",
        "Attack-hit damage and illumination spell fills were not parsed.",
      );
    }
    /* v8 ignore stop */
    return spellProcedureExecutionFor(
      executionRegistry,
      invocation.procedure,
    ).resolve({
      input: { ...input, frame: attackDamageChangeFrame, target },
      actorId: input.subject.casterId,
      invocation,
      fillSet: fillValidation.fillSet,
    });
  }
  if (invocation.procedure === "afterHitTimedDamageAndSave") {
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (fillValidation.tag !== "validNonSave") {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.state,
        "invalidFill",
        "Attack-hit timed damage and save spell fills were not parsed.",
      );
    }
    /* v8 ignore stop */
    return spellProcedureExecutionFor(
      executionRegistry,
      invocation.procedure,
    ).resolve({
      input: { ...input, frame: attackDamageChangeFrame, target },
      actorId: input.subject.casterId,
      invocation,
      fillSet: fillValidation.fillSet,
    });
  }
  return invalidResult(
    input.state,
    "unsupportedActOption",
    "Attack-hit Bonus Action spell command requires a supported prepared after-hit spell.",
  );
}
