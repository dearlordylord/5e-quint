import type {
  BattleActDiscoveryCandidate,
  AdmittedBattleResolutionInput,
  BattleFill,
  BattleInterruptedProcedure,
  BattleResolutionInput,
  BattleResolutionResult,
  BattleState,
} from "./battle-state-execution.ts";
import type { BattleSubject } from "./battle-subjects.ts";
import {
  deliverTouchSpellThroughFindFamiliar as deliverTouchSpellThroughFindFamiliarWithRegistry,
  endTurn as endTurnWithRegistry,
  resolveAdmittedBattleSubject as resolveAdmittedBattleSubjectWithRegistry,
  resolveBattleInterrupt as resolveBattleInterruptWithRegistry,
  resolveReplayContinuationFromState as resolveReplayContinuationFromStateWithRegistry,
} from "./battle-reducer/dispatcher.ts";
import type { BattleInterruptTrigger } from "./battle-interrupt-triggers.ts";
import { spellProcedureExecutionRegistry } from "./battle-reducer/spell-procedure-profiles/execution-composition.ts";
import { discoverBattleActCandidatesWithExecutionRegistry } from "./battle-reducer/battle-discovery.ts";
import {
  battleSnapshotProjectionWithExecutionRegistry,
  snapshotBattleWithExecutionRegistry,
} from "./battle-reducer/battle-snapshot.ts";
import type { FindFamiliarWithin100FeetFact } from "./find-familiar-telepathy.ts";
import type { CombatantId } from "./identity.ts";

export function resolveAdmittedBattleSubject(
  input: AdmittedBattleResolutionInput,
): BattleResolutionResult {
  const executionRegistry = spellProcedureExecutionRegistry();
  return battleResolutionWithExecutionSnapshot(
    input.state,
    resolveAdmittedBattleSubjectWithRegistry(input, executionRegistry),
    executionRegistry,
  );
}

export function resolveBattleInterrupt(input: {
  readonly state: BattleState;
  readonly fill: Extract<BattleFill, { readonly kind: "interruptDecision" }>;
}): BattleResolutionResult {
  const executionRegistry = spellProcedureExecutionRegistry();
  return battleResolutionWithExecutionSnapshot(
    input.state,
    resolveBattleInterruptWithRegistry(input, executionRegistry),
    executionRegistry,
  );
}

export function endTurn(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly fills?: readonly BattleFill[];
}): BattleResolutionResult {
  const executionRegistry = spellProcedureExecutionRegistry();
  return battleResolutionWithExecutionSnapshot(
    input.state,
    endTurnWithRegistry(input, executionRegistry),
    executionRegistry,
  );
}

export function deliverTouchSpellThroughFindFamiliar(input: {
  readonly state: BattleState;
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "actionSpell" | "bonusActionSpell" }
  >;
  readonly fills: BattleResolutionInput["fills"];
  readonly fact: FindFamiliarWithin100FeetFact;
}): BattleResolutionResult {
  const executionRegistry = spellProcedureExecutionRegistry();
  return battleResolutionWithExecutionSnapshot(
    input.state,
    deliverTouchSpellThroughFindFamiliarWithRegistry(input, executionRegistry),
    executionRegistry,
  );
}

export function resolveReplayContinuationFromState(
  state: BattleState,
  continuation: Extract<
    BattleInterruptedProcedure,
    { readonly kind: "replay" }
  >,
  handledInterruptTrigger: BattleInterruptTrigger,
  fills: readonly BattleFill[],
): BattleResolutionResult {
  const executionRegistry = spellProcedureExecutionRegistry();
  return battleResolutionWithExecutionSnapshot(
    state,
    resolveReplayContinuationFromStateWithRegistry(
      state,
      continuation,
      handledInterruptTrigger,
      fills,
      executionRegistry,
    ),
    executionRegistry,
  );
}

export function discoverBattleActCandidates(
  state: BattleState,
): readonly BattleActDiscoveryCandidate[] {
  const executionRegistry = spellProcedureExecutionRegistry();
  return discoverBattleActCandidatesWithExecutionRegistry(
    state,
    executionRegistry,
  );
}

export function battleSnapshotProjection(state: BattleState): {
  readonly snapshot: ReturnType<typeof snapshotBattleWithExecutionRegistry>;
} {
  const executionRegistry = spellProcedureExecutionRegistry();
  return battleSnapshotProjectionWithExecutionRegistry(
    state,
    executionRegistry,
  );
}

export function snapshotBattle(
  state: BattleState,
): ReturnType<typeof snapshotBattleWithExecutionRegistry> {
  const executionRegistry = spellProcedureExecutionRegistry();
  return snapshotBattleWithExecutionRegistry(state, executionRegistry);
}

function battleResolutionWithExecutionSnapshot(
  inputState: BattleState,
  result: BattleResolutionResult,
  executionRegistry: ReturnType<typeof spellProcedureExecutionRegistry>,
): BattleResolutionResult {
  const snapshotState = result.tag === "invalid" ? inputState : result.state;
  return {
    ...result,
    snapshot: snapshotBattleWithExecutionRegistry(
      snapshotState,
      executionRegistry,
    ),
  };
}
