import type {
  BattleActDiscoveryCandidate,
  AdmittedBattleResolutionInput,
  BattleFill,
  BattleInterruptedProcedure,
  BattleResolutionInput,
  BattleResolutionResult,
  BattleSnapshot,
  BattleState,
} from "./battle-state-execution.ts";
import type { BattleSubject } from "./battle-subjects.ts";
import {
  deliverTouchSpellThroughFindFamiliar as deliverTouchSpellThroughFindFamiliarWithRegistry,
  endTurn as endTurnWithRegistry,
  openCreatureFallsInterruptWindow as openCreatureFallsInterruptWindowStateOnly,
  resolveAdmittedBattleSubject as resolveAdmittedBattleSubjectWithRegistry,
  resolveAdmittedFindFamiliarReappearanceSubject as resolveAdmittedFindFamiliarReappearanceSubjectStateOnly,
  resolveBattleInterrupt as resolveBattleInterruptWithRegistry,
  resolveFallDamageLanding as resolveFallDamageLandingStateOnly,
  resolveFeatherFallLanding as resolveFeatherFallLandingStateOnly,
  resolveFlySpeedGrantEndFallCleanup as resolveFlySpeedGrantEndFallCleanupStateOnly,
  resolveAdmittedReplayContinuationSubject,
  shareFindFamiliarSenses as shareFindFamiliarSensesStateOnly,
} from "./battle-reducer/dispatcher.ts";
import {
  ReplayContinuationExecution,
  resolveReplayContinuationFromState as resolveReplayContinuationFromStateWithRegistry,
} from "./battle-reducer/replay-continuation.ts";
import type { BattleInterruptTrigger } from "./battle-interrupt-triggers.ts";
import { spellProcedureExecutionRegistry } from "./battle-reducer/spell-procedure-profiles/execution-composition.ts";
import { discoverBattleActCandidatesWithExecutionRegistry } from "./battle-reducer/battle-discovery.ts";
import {
  battleSnapshotProjectionWithExecutionRegistry,
  snapshotBattleWithExecutionRegistry,
} from "./battle-reducer/battle-snapshot.ts";
import type { FindFamiliarWithin100FeetFact } from "./find-familiar-telepathy.ts";
import type { CombatantId } from "./identity.ts";
import { ATTACK_RESOLVERS } from "./battle-reducer/attack-main.ts";
import { resolveMonkFocusFlurryOfBlowsStrike } from "./battle-reducer/monk-flurry-attack.ts";
import { resolvePactOfTheChainFamiliarReactionAttack } from "./find-familiar-pact-chain.ts";
import type { BattleAttackRouteResolvers } from "./battle-reducer/attack-resolvers.ts";

const BATTLE_ATTACK_ROUTE_RESOLVERS = {
  ...ATTACK_RESOLVERS,
  resolveMonkFocusFlurryOfBlowsStrike,
  resolvePactOfTheChainFamiliarReactionAttack,
} satisfies BattleAttackRouteResolvers;

export function resolveAdmittedBattleSubject(
  input: AdmittedBattleResolutionInput,
): BattleResolutionResult {
  const executionRegistry = spellProcedureExecutionRegistry();
  return battleResolutionWithExecutionSnapshot(
    input.state,
    resolveAdmittedBattleSubjectWithRegistry(
      input,
      executionRegistry,
      BATTLE_ATTACK_ROUTE_RESOLVERS,
    ),
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
    resolveBattleInterruptWithRegistry(
      input,
      executionRegistry,
      BATTLE_ATTACK_ROUTE_RESOLVERS,
    ),
    executionRegistry,
  );
}

export function resolveAdmittedFindFamiliarReappearanceSubject(
  input: Parameters<
    typeof resolveAdmittedFindFamiliarReappearanceSubjectStateOnly
  >[0],
): BattleResolutionResult {
  const executionRegistry = spellProcedureExecutionRegistry();
  return battleResolutionWithExecutionSnapshot(
    input.state,
    resolveAdmittedFindFamiliarReappearanceSubjectStateOnly(input),
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
    endTurnWithRegistry(
      input,
      executionRegistry,
      BATTLE_ATTACK_ROUTE_RESOLVERS,
    ),
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
    deliverTouchSpellThroughFindFamiliarWithRegistry(
      input,
      executionRegistry,
      BATTLE_ATTACK_ROUTE_RESOLVERS,
    ),
    executionRegistry,
  );
}

export function shareFindFamiliarSenses(
  input: Parameters<typeof shareFindFamiliarSensesStateOnly>[0],
): BattleResolutionResult {
  const executionRegistry = spellProcedureExecutionRegistry();
  return battleResolutionWithExecutionSnapshot(
    input.state,
    shareFindFamiliarSensesStateOnly(input),
    executionRegistry,
  );
}

export function openCreatureFallsInterruptWindow(
  input: Parameters<typeof openCreatureFallsInterruptWindowStateOnly>[0],
): BattleResolutionResult {
  const executionRegistry = spellProcedureExecutionRegistry();
  return battleResolutionWithExecutionSnapshot(
    input.state,
    openCreatureFallsInterruptWindowStateOnly(input),
    executionRegistry,
  );
}

export function resolveFeatherFallLanding(
  input: Parameters<typeof resolveFeatherFallLandingStateOnly>[0],
): ReturnType<typeof resolveFeatherFallLandingStateOnly> {
  const executionRegistry = spellProcedureExecutionRegistry();
  return resultWithExecutionSnapshot(
    resolveFeatherFallLandingStateOnly(input),
    executionRegistry,
  );
}

export function resolveFallDamageLanding(
  input: Parameters<typeof resolveFallDamageLandingStateOnly>[0],
): ReturnType<typeof resolveFallDamageLandingStateOnly> {
  const executionRegistry = spellProcedureExecutionRegistry();
  return resultWithExecutionSnapshot(
    resolveFallDamageLandingStateOnly(input),
    executionRegistry,
  );
}

export function resolveFlySpeedGrantEndFallCleanup(
  input: Parameters<typeof resolveFlySpeedGrantEndFallCleanupStateOnly>[0],
): ReturnType<typeof resolveFlySpeedGrantEndFallCleanupStateOnly> {
  const executionRegistry = spellProcedureExecutionRegistry();
  return resultWithExecutionSnapshot(
    resolveFlySpeedGrantEndFallCleanupStateOnly(input),
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
    resolveReplayContinuationFromStateWithRegistry({
      state,
      continuation,
      handledInterruptTrigger,
      fills,
      execution: replayContinuationExecution(executionRegistry),
    }),
    executionRegistry,
  );
}

function replayContinuationExecution(
  executionRegistry: ReturnType<typeof spellProcedureExecutionRegistry>,
): ReplayContinuationExecution {
  return ReplayContinuationExecution.fromExecutionRegistry(
    executionRegistry,
    (admitted, boundExecutionRegistry) =>
      resolveAdmittedReplayContinuationSubject(
        admitted,
        boundExecutionRegistry,
        BATTLE_ATTACK_ROUTE_RESOLVERS,
      ),
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

function resultWithExecutionSnapshot<
  Result extends {
    readonly state: BattleState;
    readonly snapshot: BattleSnapshot;
  },
>(
  result: Result,
  executionRegistry: ReturnType<typeof spellProcedureExecutionRegistry>,
): Result {
  return {
    ...result,
    snapshot: snapshotBattleWithExecutionRegistry(
      result.state,
      executionRegistry,
    ),
  };
}
