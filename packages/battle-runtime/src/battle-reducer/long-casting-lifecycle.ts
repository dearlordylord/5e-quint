// RAW-COVERAGE: runtime-owner RAW-STAT-BLOCK-SPELLCASTING-LONG-CASTING-TIME-001
// KERNEL-COVERAGE: runtime-owner BATTLE.STAT_BLOCK.SPELLCASTING_LONG_CASTING_TIME
// KERNEL-COVERAGE: runtime-owner BATTLE.STAT_BLOCK.SPELL_INVOCATION_UNRESTRICTED
// UNIT-PROFILE-COVERAGE: runtime-owner stat-block.spell-invocation.unrestricted
import type { BattleInterruptTrigger } from "../battle-interrupt-triggers.ts";
import { Match, Option, Result } from "effect";
import type { BattleSubject } from "../battle-subjects.ts";
import type {
  BattleExecutableSpellInvocation,
  BattleResolutionInputForSubject,
  BattleResolutionResult,
  BattleState,
  BattleConcentration,
  BattleLongCastingProgress,
} from "../battle-state-execution.ts";
import {
  combatantCanTakeActions,
  currentActorId,
} from "./creature-state-leaves.ts";
import { startBattleConcentration } from "./concentration-procedures.ts";
import { supportedSpellActs } from "./supported-spell-acts.ts";
import { spellHasAvailableSpend } from "./spell-turn-resources.ts";
import { spendSpellCastAction } from "./spellcasting-action-cost.ts";
import { battleStateAfterTargetActionEarlyEndForActor } from "./targeting-save-interdiction.ts";
import { spellCastInterruptFrame } from "./spell-cast-interrupt-frame.ts";
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
  longCastingConcentrationForInvocation,
  statBlockLongCastingTime,
} from "./long-casting-readiness.ts";
export {
  statBlockLongCastingTime,
  longCastingCompletionResource,
  completeLongCastingSpellState,
} from "./long-casting-completion.ts";

import { longCastingInterruptionHoles } from "./long-casting-interruption-holes.ts";
type LongCastingInput = BattleResolutionInputForSubject<LongCastingSubject>;
export function resolveLongCastingCommand(
  input: LongCastingInput,
  handledInterruptTrigger?: BattleInterruptTrigger,
): BattleResolutionResult {
  const admitted = admitLongCastingCommand(input);
  if (Result.isFailure(admitted)) return admitted.failure;
  const invocation = admitted.success;
  const reactionFacts = admitLongCastingReactionFacts(input, invocation);
  if (Result.isFailure(reactionFacts)) return reactionFacts.failure;
  const phase = admitLongCastingPhase(input, invocation);
  if (Result.isFailure(phase)) return phase.failure;
  const started = commitLongCastingProgress(input, invocation, phase.success);
  if (Result.isFailure(started)) return started.failure;
  const interruption = maybeOpenInterruptWindow(
    started.success,
    {
      ...spellCastInterruptFrame({
        casterId: input.subject.actorId,
        invocation,
        targetIds: [],
        reactionSpellTargetFacts: reactionFacts.success.facts,
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

function matchesLongCastingCommand(
  candidate: BattleExecutableSpellInvocation,
  subject: LongCastingSubject,
): boolean {
  const source = candidate.spellRuleFacts.castingSource;
  return (
    candidate.sourceProcedureRef === subject.procedureRef &&
    source.tag === "statBlock" &&
    sameInvocationRef(source.invocationRef, subject.invocationRef)
  );
}
function admitLongCastingCommand(
  input: LongCastingInput,
): Result.Result<BattleExecutableSpellInvocation, BattleResolutionResult> {
  const actor = input.state.combatants.get(input.subject.actorId);
  if (
    !combatantCanTakeActions(actor) ||
    currentActorId(input.state) !== input.subject.actorId
  )
    return Result.fail(
      invalidResult(
        input.state,
        "staleSubject",
        "The caster cannot take the required Magic action.",
      ),
    );
  const invocation = supportedSpellActs(input.state, actor).find((candidate) =>
    matchesLongCastingCommand(candidate, input.subject),
  );
  if (invocation === undefined || !spellHasAvailableSpend(actor, invocation))
    return Result.fail(
      invalidResult(
        input.state,
        "staleSubject",
        "The selected long spell invocation is unavailable.",
      ),
    );
  if (
    combatantInsideActiveMagicSuppressionEmanation(
      input.state,
      input.subject.actorId,
    ) &&
    spellInvocationActInterdictedByMagicSuppressionEmanation(invocation)
  ) {
    return Result.fail(
      invalidResult(
        input.state,
        "staleSubject",
        "Magic suppression prevents casting this spell.",
      ),
    );
  }
  return Result.succeed(invocation);
}
function admitLongCastingReactionFacts(
  input: LongCastingInput,
  invocation: BattleExecutableSpellInvocation,
): Result.Result<
  Extract<
    ReturnType<typeof parseSpellCastReactionFactsFill>,
    { readonly tag: "ok" }
  >,
  BattleResolutionResult
> {
  if (input.fills.length > 1)
    return Result.fail(
      invalidResult(
        input.state,
        "invalidFill",
        "Casting progress accepts only one spell-cast Reaction facts fill.",
      ),
    );
  const reactionFill = input.fills[0];
  const reactionFacts =
    reactionFill === undefined
      ? { tag: "ok" as const, facts: [] }
      : parseSpellCastReactionFactsFill(reactionFill);
  if (reactionFacts.tag !== "ok")
    return Result.fail(
      invalidResult(
        input.state,
        "invalidFill",
        "Casting progress accepts only spell-cast Reaction facts.",
      ),
    );
  const interruptionHoles = longCastingInterruptionHoles(
    input.state,
    input.subject.actorId,
    invocation,
  );
  const interruptionHole = interruptionHoles[0];
  if (interruptionHole !== undefined && reactionFill === undefined)
    return Result.fail(
      needsHolesResult(input.state, input.subject, [interruptionHole]),
    );
  return Result.succeed(reactionFacts);
}
type AdmittedLongCastingPhase =
  | {
      readonly kind: "start";
      readonly progress: Extract<
        BattleLongCastingProgress,
        { readonly kind: "casting" }
      >;
    }
  | { readonly kind: "continue"; readonly progress: BattleLongCastingProgress };
function admitLongCastingPhase(
  input: LongCastingInput,
  invocation: BattleExecutableSpellInvocation,
): Result.Result<AdmittedLongCastingPhase, BattleResolutionResult> {
  const time = statBlockLongCastingTime(invocation);
  if (Option.isNone(time))
    return Result.fail(
      invalidResult(
        input.state,
        "staleSubject",
        "The selected spell does not require multiple turns of casting.",
      ),
    );
  const prior = longCastingConcentrationForInvocation(
    input.state,
    input.subject.actorId,
    invocation,
  );
  return Match.value(input.subject.command).pipe(
    Match.when("startSpellCasting", () =>
      admitLongCastingStart(input, prior, time.value),
    ),
    Match.when("continueSpellCasting", () =>
      admitLongCastingContinuation(input, prior),
    ),
    Match.exhaustive,
  );
}
function admitLongCastingStart(
  input: LongCastingInput,
  prior: CastingConcentration | undefined,
  time: import("./long-casting-progress.ts").LongCastingTime,
): Result.Result<
  Extract<AdmittedLongCastingPhase, { readonly kind: "start" }>,
  BattleResolutionResult
> {
  if (prior !== undefined)
    return Result.fail(
      invalidResult(
        input.state,
        "staleSubject",
        "The selected spell is already being cast.",
      ),
    );
  return Result.succeed({
    kind: "start",
    progress: startLongCastingProgress(time, input.state.initiative.round),
  });
}
function admitLongCastingContinuation(
  input: LongCastingInput,
  prior: CastingConcentration | undefined,
): Result.Result<
  Extract<AdmittedLongCastingPhase, { readonly kind: "continue" }>,
  BattleResolutionResult
> {
  if (
    prior === undefined ||
    prior.progress.kind !== "casting" ||
    !canContinueLongCasting(prior.progress, input.state.initiative.round)
  )
    return Result.fail(
      invalidResult(
        input.state,
        "staleSubject",
        "Casting cannot advance twice on one turn or after a missed Magic action.",
      ),
    );
  return Result.succeed({
    kind: "continue",
    progress: continueLongCastingProgress(
      prior.progress,
      input.state.initiative.round,
    ),
  });
}
function commitLongCastingProgress(
  input: LongCastingInput,
  invocation: BattleExecutableSpellInvocation,
  phase: AdmittedLongCastingPhase,
): Result.Result<BattleState, BattleResolutionResult> {
  const spent = spendSpellCastAction(
    input.state.currentTurnResources,
    "magicAction",
  );
  if (Result.isFailure(spent))
    return Result.fail(
      invalidResult(input.state, "staleSubject", spent.failure),
    );
  const concentration: CastingConcentration = {
    sourceProcedureRef: invocation.sourceProcedureRef,
    effectKind: "castingSpell",
    invocationRef: input.subject.invocationRef,
    progress: phase.progress,
  };
  const resourced = battleStateAfterTargetActionEarlyEndForActor(
    { ...input.state, currentTurnResources: spent.success },
    input.subject.actorId,
  );
  const declaringActor = resourced.combatants.get(input.subject.actorId);
  if (declaringActor === undefined)
    return Result.fail(
      invalidResult(
        input.state,
        "staleSubject",
        "The caster no longer exists.",
      ),
    );
  const started =
    phase.kind === "continue"
      ? Result.succeed({
          ...resourced,
          combatants: new Map(resourced.combatants).set(input.subject.actorId, {
            ...declaringActor,
            concentration,
          }),
        })
      : startBattleConcentration(
          resourced,
          input.subject.actorId,
          concentration,
        );
  if (Result.isFailure(started))
    return Result.fail(
      invalidResult(
        input.state,
        "staleSubject",
        "The caster no longer exists.",
      ),
    );
  return Result.succeed(started.success);
}
