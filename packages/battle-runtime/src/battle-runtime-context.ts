import type { BattleUnitRef } from "./battle-init.ts";
import type {
  CharacterBattleResourceOwnership,
  CharacterBattleSpellcastingState,
} from "./character-battle-resources.ts";
import type { CharacterUnitProcedureOwnership } from "./character-execution.ts";
import type { BattleSelectedSpellInvocation } from "./battle-reducer.ts";
import type {
  BattleProcedureExecutionRef,
  CombatantId,
} from "./identity.ts";

export type CharacterSpellPresentationSource = {
  readonly procedureRef: BattleProcedureExecutionRef;
  readonly invocation: BattleSelectedSpellInvocation;
};

/**
 * Authored composition ownership used by presentation and cross-runtime
 * settlement. Reducer state and snapshots must never retain this value.
 */
export type CharacterBattleRuntimeContext = {
  readonly resourceOwnership: readonly CharacterBattleResourceOwnership[];
  readonly spellcastingPresentationSource?: CharacterBattleSpellcastingState;
  readonly spellPresentationSources: readonly CharacterSpellPresentationSource[];
  readonly unitProcedureOwnership: readonly CharacterUnitProcedureOwnership[];
  readonly unitPresentationSources: readonly BattleUnitRef[];
};

export type BattleRuntimeContext = {
  readonly characters: ReadonlyMap<CombatantId, CharacterBattleRuntimeContext>;
};

export type BattleRuntimeSession = {
  readonly state: import("./battle-reducer.ts").BattleState;
  readonly context: BattleRuntimeContext;
};

export function emptyBattleRuntimeContext(): BattleRuntimeContext {
  return { characters: new Map() };
}
