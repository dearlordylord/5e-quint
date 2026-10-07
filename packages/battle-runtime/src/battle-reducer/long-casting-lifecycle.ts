import { canSpendAction } from "@dnd/shared-algebras/action-economy-algebra";
import type { BattleInterruptTrigger } from "../battle-interrupt-triggers.ts";
import { Option, Result } from "effect";
import type { BattleSubject } from "../battle-subjects.ts";
import type {
  BattleActDiscoveryCandidate,
  BattleExecutableSpellInvocation,
  BattleResolutionInputForSubject,
  BattleResolutionResult,
  BattleState,
  BattleConcentration,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import {
  combatantCanTakeActions,
  currentActorId,
} from "./creature-state-leaves.ts";
import { startBattleConcentration } from "./concentration-procedures.ts";
import { supportedSpellActs } from "./supported-spell-acts.ts";
import { spellHasAvailableSpend } from "./spell-turn-resources.ts";
import { spendSpellCastAction } from "./spellcasting-action-cost.ts";
import { battleStateAfterTargetActionEarlyEndForActor } from "./targeting-save-interdiction.ts";
import {
  spellCastReactionFactsHole,
  spellCastInterruptFrame,
} from "./spell-cast-interrupt-frame.ts";
import {
  spellCastCanTriggerSpellCastInterruption,
  spellCastInterruptionReactionCapableReactors,
} from "./spell-cast-interruption-reaction-discovery.ts";
import { parseSpellCastReactionFactsFill } from "./spells-resolve-fill-set.ts";
import { maybeOpenInterruptWindow } from "./interrupt-execution.ts";
import { needsHolesResult } from "./needs-holes-result.ts";
import {
  combatantInsideActiveMagicSuppressionEmanation,
  spellInvocationActInterdictedByMagicSuppressionEmanation,
} from "./magic-suppression-action-interdiction.ts";
import { invalidResult, resolvedResult } from "./result-helpers.ts";
import {
  canContinueLongCasting,
  continueLongCastingProgress,
  startLongCastingProgress,
} from "./long-casting-progress.ts";

type LongCastingSubject = Extract<
  BattleSubject,
  {
    readonly tag: "runtimeCommand";
    readonly command: "startSpellCasting" | "continueSpellCasting";
  }
>;
type CastingConcentration = Extract<
  BattleConcentration,
  { readonly effectKind: "castingSpell" }
>;

import {
  sameInvocationRef,
  statBlockLongCastingTime,
  longCastingCompletionResource,
} from "./long-casting-completion.ts";
export {
  statBlockLongCastingTime,
  longCastingCompletionResource,
  completeLongCastingSpellState,
} from "./long-casting-completion.ts";

// undefined delegates immediate casting or completed casting to the existing
// target/procedure owners; [] means this long invocation has no available act.
export function discoverLongCastingSpellActs(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation;
}): readonly BattleActDiscoveryCandidate[] | undefined {
  const time = statBlockLongCastingTime(input.invocation);
  if (Option.isNone(time)) return undefined;
  if (
    Option.isSome(
      longCastingCompletionResource(
        input.state,
        input.actorId,
        input.invocation,
      ),
    )
  )
    return undefined;
  const source = input.invocation.spellRuleFacts.castingSource;
  if (source.tag !== "statBlock") return [];
  const actor = input.state.combatants.get(input.actorId);
  if (
    !combatantCanTakeActions(actor) ||
    currentActorId(input.state) !== input.actorId ||
    !canSpendAction(input.state.currentTurnResources, "magic")
  )
    return [];
  const concentration = actor.concentration;
  const sameCasting =
    concentration?.effectKind === "castingSpell" &&
    sameInvocationRef(concentration.invocationRef, source.invocationRef);
  if (
    sameCasting &&
    !canContinueLongCasting(
      concentration.progress,
      input.state.initiative.round,
    )
  )
    return [];
  return [
    {
      subject: {
        tag: "runtimeCommand",
        actorId: input.actorId,
        command: sameCasting ? "continueSpellCasting" : "startSpellCasting",
        procedureRef: input.invocation.sourceProcedureRef,
        invocationRef: source.invocationRef,
      },
      initialHoles: longCastingInterruptionHoles(
        input.state,
        input.actorId,
        input.invocation,
      ),
    },
  ];
}

function longCastingInterruptionHoles(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation,
) {
  return spellCastCanTriggerSpellCastInterruption({
    casterId: actorId,
    invocation,
    reactors: spellCastInterruptionReactionCapableReactors(state),
  })
    ? ([spellCastReactionFactsHole({ casterId: actorId, invocation })] as const)
    : ([] as const);
}

export function resolveLongCastingCommand(
  input: BattleResolutionInputForSubject<LongCastingSubject>,
  handledInterruptTrigger?: BattleInterruptTrigger,
): BattleResolutionResult {
  const actor = input.state.combatants.get(input.subject.actorId);
  if (
    !combatantCanTakeActions(actor) ||
    currentActorId(input.state) !== input.subject.actorId
  )
    return invalidResult(
      input.state,
      "staleSubject",
      "The caster cannot take the required Magic action.",
    );
  const invocation = supportedSpellActs(input.state, actor).find(
    (candidate) => {
      const source = candidate.spellRuleFacts.castingSource;
      return (
        candidate.sourceProcedureRef === input.subject.procedureRef &&
        source.tag === "statBlock" &&
        sameInvocationRef(source.invocationRef, input.subject.invocationRef)
      );
    },
  );
  if (invocation === undefined || !spellHasAvailableSpend(actor, invocation))
    return invalidResult(
      input.state,
      "staleSubject",
      "The selected long spell invocation is unavailable.",
    );
  if (
    combatantInsideActiveMagicSuppressionEmanation(
      input.state,
      input.subject.actorId,
    ) &&
    spellInvocationActInterdictedByMagicSuppressionEmanation(invocation)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Magic suppression prevents casting this spell.",
    );
  }
  if (input.fills.length > 1)
    return invalidResult(
      input.state,
      "invalidFill",
      "Casting progress accepts only one spell-cast Reaction facts fill.",
    );
  const reactionFill = input.fills[0];
  const reactionFacts =
    reactionFill === undefined
      ? { tag: "ok" as const, facts: [] }
      : parseSpellCastReactionFactsFill(reactionFill);
  if (reactionFacts.tag !== "ok")
    return invalidResult(
      input.state,
      "invalidFill",
      "Casting progress accepts only spell-cast Reaction facts.",
    );
  const interruptionHoles = longCastingInterruptionHoles(
    input.state,
    input.subject.actorId,
    invocation,
  );
  const interruptionHole = interruptionHoles[0];
  if (interruptionHole !== undefined && reactionFill === undefined)
    return needsHolesResult(input.state, input.subject, [interruptionHole]);
  const time = statBlockLongCastingTime(invocation);
  if (Option.isNone(time))
    return invalidResult(
      input.state,
      "staleSubject",
      "The selected spell does not require multiple turns of casting.",
    );
  const prior = actor.concentration;
  if (
    input.subject.command === "startSpellCasting" &&
    prior?.effectKind === "castingSpell" &&
    sameInvocationRef(prior.invocationRef, input.subject.invocationRef)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "The selected spell is already being cast.",
    );
  }
  const continuation = input.subject.command === "continueSpellCasting";
  if (
    continuation &&
    (prior?.effectKind !== "castingSpell" ||
      !sameInvocationRef(prior.invocationRef, input.subject.invocationRef) ||
      !canContinueLongCasting(prior.progress, input.state.initiative.round))
  )
    return invalidResult(
      input.state,
      "staleSubject",
      "Casting cannot advance twice on one turn or after a missed Magic action.",
    );
  const spent = spendSpellCastAction(
    input.state.currentTurnResources,
    "magicAction",
  );
  if (Result.isFailure(spent))
    return invalidResult(input.state, "staleSubject", spent.failure);
  const progress =
    continuation &&
    prior?.effectKind === "castingSpell" &&
    prior.progress.kind === "casting"
      ? continueLongCastingProgress(
          prior.progress,
          input.state.initiative.round,
        )
      : startLongCastingProgress(time.value, input.state.initiative.round);
  const concentration: CastingConcentration = {
    sourceProcedureRef: invocation.sourceProcedureRef,
    effectKind: "castingSpell",
    invocationRef: input.subject.invocationRef,
    progress,
  };
  const resourced = battleStateAfterTargetActionEarlyEndForActor(
    { ...input.state, currentTurnResources: spent.success },
    input.subject.actorId,
  );
  const declaringActor = resourced.combatants.get(input.subject.actorId);
  if (declaringActor === undefined)
    return invalidResult(
      input.state,
      "staleSubject",
      "The caster no longer exists.",
    );
  const started = continuation
    ? Result.succeed({
        ...resourced,
        combatants: new Map(resourced.combatants).set(input.subject.actorId, {
          ...declaringActor,
          concentration,
        }),
      })
    : startBattleConcentration(resourced, input.subject.actorId, concentration);
  if (Result.isFailure(started))
    return invalidResult(
      input.state,
      "staleSubject",
      "The caster no longer exists.",
    );
  const interruption = maybeOpenInterruptWindow(
    started.success,
    {
      ...spellCastInterruptFrame({
        casterId: input.subject.actorId,
        invocation,
        targetIds: [],
        reactionSpellTargetFacts: reactionFacts.facts,
        castingResource: { kind: "alreadySpent" },
        continuation: { kind: "resolved", subject: input.subject },
      }),
      concentrationCommitment: { kind: "none" },
      paymentCommitment: { kind: "none" },
    },
    handledInterruptTrigger,
  );
  return interruption ?? resolvedResult(started.success);
}
