import { canSpendAction } from "@dnd/shared-algebras/action-economy-algebra";
import { Option } from "effect";
import type {
  BattleActDiscoveryCandidate,
  BattleExecutableSpellInvocation,
  BattleState,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import {
  combatantCanTakeActions,
  currentActorId,
} from "./creature-state-leaves.ts";
import { canContinueLongCasting } from "./long-casting-progress.ts";
import {
  longCastingConcentrationForInvocation,
  statBlockLongCastingTime,
  longCastingCompletionResource,
} from "./long-casting-readiness.ts";
import { longCastingInterruptionHoles } from "./long-casting-interruption-holes.ts";
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
  if (!casterCanProgress(input.state, input.actorId)) return [];
  const sameCasting = longCastingConcentrationForInvocation(
    input.state,
    input.actorId,
    input.invocation,
  );
  if (
    sameCasting &&
    !canContinueLongCasting(sameCasting.progress, input.state.initiative.round)
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

function casterCanProgress(state: BattleState, actorId: CombatantId): boolean {
  return (
    combatantCanTakeActions(state.combatants.get(actorId)) &&
    currentActorId(state) === actorId &&
    canSpendAction(state.currentTurnResources, "magic")
  );
}
