import type {
  BattleRuntimeContext,
  BattleRuntimeSession,
  BattleStatBlockPresentationSource,
  CharacterBattleRuntimeContext,
} from "./battle-runtime-context.ts";
import {
  battleRuntimeContextFromCharacterAdmission,
  battleRuntimeSessionFromAdmittedContext,
} from "./battle-runtime-context.ts";
import type { BattleState } from "./battle-state-execution.ts";
import type { CombatantId } from "./identity.ts";

export {
  battleStateWithAllocatedEffectForTest,
  battleStateWithAllocatedEffectOccurrencesForTest,
} from "./battle-effect-occurrence-allocation.test-support.ts";

/**
 * Test-only construction for reducer-state fixtures that bypass battle
 * admission. The main package API omits these constructors, and the quality
 * gate rejects this test-support subpath from production owners.
 */
export function battleRuntimeSessionForTest(input: {
  readonly state: BattleState;
  readonly context: BattleRuntimeContext;
}): BattleRuntimeSession {
  return battleRuntimeSessionFromAdmittedContext(input.state, input.context);
}

export function battleRuntimeContextForTest(
  characters: ReadonlyMap<CombatantId, CharacterBattleRuntimeContext>,
  statBlocks: ReadonlyMap<
    CombatantId,
    BattleStatBlockPresentationSource
  > = new Map(),
): BattleRuntimeContext {
  return battleRuntimeContextFromCharacterAdmission(characters, statBlocks);
}
