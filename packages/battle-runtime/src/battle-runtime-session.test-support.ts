import type {
  BattleRuntimeContext,
  BattleRuntimeSession,
  CharacterBattleRuntimeContext,
} from "./battle-runtime-context.ts";
import {
  battleRuntimeContextFromCharacterAdmission,
  battleRuntimeSessionFromAdmittedContext,
} from "./battle-runtime-context.ts";
import type { BattleState } from "./battle-reducer.ts";
import type { CombatantId } from "./identity.ts";

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
): BattleRuntimeContext {
  return battleRuntimeContextFromCharacterAdmission(characters);
}
