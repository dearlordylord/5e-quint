import type { BattleUnitRef } from "./battle-init.ts";
import type {
  CharacterBattleResourceOwnership,
  CharacterBattleSpellcastingState,
} from "./character-battle-resources.ts";
import type { CharacterUnitProcedureOwnership } from "./character-execution-admission.ts";
import type { BattleSelectedSpellInvocation } from "./battle-state-execution.ts";
import type { BattleProcedureExecutionRef, CombatantId } from "./identity.ts";

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

class RuntimeContext {
  readonly #contextIdentity = undefined;

  constructor(
    readonly characters: ReadonlyMap<
      CombatantId,
      CharacterBattleRuntimeContext
    >,
  ) {
    void this.#contextIdentity;
  }
}

/** Authored context admitted alongside a battle's mechanical execution. */
export type BattleRuntimeContext = RuntimeContext;

class RuntimeSession {
  readonly #sessionIdentity = undefined;

  private constructor(
    readonly state: import("./battle-state-execution.ts").BattleState,
    readonly context: BattleRuntimeContext,
  ) {
    void this.#sessionIdentity;
  }

  static fromAdmittedContext(
    state: import("./battle-state-execution.ts").BattleState,
    context: BattleRuntimeContext,
  ): RuntimeSession {
    return new RuntimeSession(state, context);
  }
}

/**
 * A battle state paired with the authored context admitted for that battle.
 * The nominal type prevents callers from pairing arbitrary state and context.
 */
export type BattleRuntimeSession = RuntimeSession;

/** Package-internal construction after state/context admission. */
export function battleRuntimeSessionFromAdmittedContext(
  state: import("./battle-state-execution.ts").BattleState,
  context: BattleRuntimeContext,
): BattleRuntimeSession {
  return RuntimeSession.fromAdmittedContext(state, context);
}

/** Preserve the admitted context while advancing only the reducer state. */
export function battleRuntimeSessionWithState(
  session: BattleRuntimeSession,
  state: import("./battle-state-execution.ts").BattleState,
): BattleRuntimeSession {
  return RuntimeSession.fromAdmittedContext(state, session.context);
}

export function emptyBattleRuntimeContext(): BattleRuntimeContext {
  return new RuntimeContext(new Map());
}

/** Package-internal boundary for context produced by combatant admission. */
export function battleRuntimeContextFromCharacterAdmission(
  characters: ReadonlyMap<CombatantId, CharacterBattleRuntimeContext>,
): BattleRuntimeContext {
  return new RuntimeContext(characters);
}
