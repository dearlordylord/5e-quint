import type { BattleUnitRef } from "./battle-init.ts";
import type {
  CharacterBattleResourceOwnership,
  CharacterBattleSpellcastingState,
} from "./character-battle-resources.ts";
import type {
  AuthoredSelectedSpellInvocation,
  CharacterUnitProcedureOwnership,
} from "./character-execution-admission.ts";
import type {
  BattleProcedureExecutionRef,
  BattleStatBlockExecutionScopeRef,
  BattleStatBlockProcedureExecutionRef,
  CombatantId,
} from "./identity.ts";
import type { WeaponId } from "@dnd/shared/game-facts";
import type { WeaponRecord } from "@dnd/surface/surface/types";
import type { StatBlockTextOnlyReason } from "@dnd/surface/surface/types";
import type { StatBlockCommunication } from "@dnd/surface/surface/types";
import * as Either from "effect/Either";
import type {
  FindFamiliarFormSelection,
  PactOfTheChainFindFamiliarFormSelection,
} from "@dnd/surface/surface/find-familiar-forms";
export type RetainedCompanionBattleSelection =
  | {
      readonly formAccess: "findFamiliar";
      readonly selectedForm: FindFamiliarFormSelection;
    }
  | {
      readonly formAccess: "pactOfTheChain";
      readonly selectedForm: PactOfTheChainFindFamiliarFormSelection;
    };

export type CharacterSpellPresentationSource = {
  readonly procedureRef: BattleProcedureExecutionRef;
  readonly invocation: AuthoredSelectedSpellInvocation;
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
  readonly retainedCompanionSelection?: RetainedCompanionBattleSelection;
  /** Authored Wild Shape presentation joined only at the presentation boundary. */
  readonly druidWildShapeFormPresentations?: ReadonlyMap<
    BattleStatBlockExecutionScopeRef,
    BattleStatBlockPresentationSource
  >;
};

export type CharacterWeaponPresentationSourceIssue = {
  readonly tag: "characterWeaponPresentationSourceIssue";
  readonly reason: "missing" | "ambiguous";
  readonly weaponUnitId: WeaponId;
};

export type BattleStatBlockProcedurePresentation =
  | {
      readonly procedureRef: BattleStatBlockProcedureExecutionRef;
      readonly kind: "attack";
      readonly name: string;
    }
  | {
      readonly procedureRef: BattleStatBlockProcedureExecutionRef;
      readonly kind: "multiattack" | "bonusActionOption";
      readonly label: string;
    }
  | {
      readonly procedureRef: BattleStatBlockProcedureExecutionRef;
      readonly kind: "unsupported";
      readonly label: string;
      readonly reason: "unsupportedMultiattackDispatch";
    };

type BattleStatBlockProcedurePresentationBase = {
  readonly section:
    | "actions"
    | "bonusActions"
    | "reactions"
    | "legendaryActions";
  readonly procedureOrdinal: number;
  readonly name: string;
  readonly resourceRefs: readonly number[];
};

export type BattleStatBlockAuthoredProcedurePresentation =
  | (BattleStatBlockProcedurePresentationBase & {
      readonly kind:
        | "attack"
        | "multiattack"
        | "bonusActionOption"
        | "save"
        | "support"
        | "spellcasting";
      readonly description?: string;
    })
  | (BattleStatBlockProcedurePresentationBase & {
      readonly kind: "textOnly";
      readonly description: string;
      readonly reason: StatBlockTextOnlyReason;
    });

export type BattleStatBlockPresentationSource = {
  readonly displayName: string;
  /** Authored communication is presentation data; absence is explicit. */
  readonly communication?: StatBlockCommunication;
  readonly orderedProcedures: readonly BattleStatBlockAuthoredProcedurePresentation[];
};

export function characterWeaponPresentationSource(
  context: CharacterBattleRuntimeContext,
  weaponUnitId: WeaponId,
): Either.Either<WeaponRecord, CharacterWeaponPresentationSourceIssue> {
  const matches = context.unitPresentationSources.flatMap(({ unit }) =>
    unit.kind === "weapon" && unit.id === weaponUnitId ? [unit] : [],
  );
  return matches.length === 1
    ? Either.right(matches[0]!)
    : Either.left({
        tag: "characterWeaponPresentationSourceIssue",
        reason: matches.length === 0 ? "missing" : "ambiguous",
        weaponUnitId,
      });
}

class RuntimeContext {
  readonly #contextIdentity = undefined;

  constructor(
    readonly characters: ReadonlyMap<
      CombatantId,
      CharacterBattleRuntimeContext
    >,
    readonly statBlocks: ReadonlyMap<
      CombatantId,
      BattleStatBlockPresentationSource
    > = new Map(),
  ) {
    void this.#contextIdentity;
  }
}

const runtimeSessionPredecessors = new WeakMap<object, object>();

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
    predecessor?: RuntimeSession,
  ): RuntimeSession {
    const session = new RuntimeSession(state, context);
    if (predecessor !== undefined) {
      runtimeSessionPredecessors.set(session, predecessor);
    }
    return session;
  }
}

/**
 * A battle state paired with the authored context admitted for that battle.
 * The nominal type prevents callers from pairing arbitrary state and context.
 */
export type BattleRuntimeSession = RuntimeSession;

/** Recognize the nominal session value constructed by this package. */
export function isBattleRuntimeSession(
  value: unknown,
): value is BattleRuntimeSession {
  return value instanceof RuntimeSession;
}

/**
 * True only for the same runtime session or for a session produced by one
 * direct reducer/presentation transition from it.  Scenario controllers use
 * this to reject an unrelated same-battle session that happens to reuse the
 * admitted context and battle id.
 */
export function battleRuntimeSessionFollows(
  candidate: BattleRuntimeSession,
  predecessor: BattleRuntimeSession,
): boolean {
  return (
    candidate === predecessor ||
    runtimeSessionPredecessors.get(candidate) === predecessor
  );
}

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
  return RuntimeSession.fromAdmittedContext(
    state,
    battleRuntimeContextForState(session.context, state),
    session,
  );
}

/**
 * Keep authored presentation context aligned with the source-free combatant
 * roster. Reducer transitions may remove a combatant (for example when a
 * familiar dies); retaining its presentation would leave a stale authored
 * lookup reachable from a later session.
 */
function battleRuntimeContextForState(
  context: BattleRuntimeContext,
  state: import("./battle-state-execution.ts").BattleState,
): BattleRuntimeContext {
  const rosterStillOwnsContext = [
    ...context.characters.keys(),
    ...context.statBlocks.keys(),
  ].every((combatantId) => state.combatants.has(combatantId));
  if (rosterStillOwnsContext) return context;
  const characters = new Map(
    [...context.characters].filter(([combatantId]) =>
      state.combatants.has(combatantId),
    ),
  );
  const statBlocks = new Map(
    [...context.statBlocks].filter(([combatantId]) =>
      state.combatants.has(combatantId),
    ),
  );
  return new RuntimeContext(characters, statBlocks);
}

export function battleRuntimeSessionWithRetainedCompanionTransition(
  session: BattleRuntimeSession,
  ownerId: CombatantId,
  state: import("./battle-state-execution.ts").BattleState,
  selection: RetainedCompanionBattleSelection,
  statBlockPresentation?: {
    readonly combatantId: CombatantId;
    readonly source: BattleStatBlockPresentationSource;
  },
): BattleRuntimeSession | undefined {
  const ownerContext = session.context.characters.get(ownerId);
  if (ownerContext === undefined) return undefined;
  const retainedContext = battleRuntimeContextForState(session.context, state);
  const characters = new Map(retainedContext.characters);
  characters.set(ownerId, {
    ...ownerContext,
    retainedCompanionSelection: selection,
  });
  const statBlocks = new Map(retainedContext.statBlocks);
  if (statBlockPresentation !== undefined) {
    statBlocks.set(
      statBlockPresentation.combatantId,
      statBlockPresentation.source,
    );
  }
  return RuntimeSession.fromAdmittedContext(
    state,
    new RuntimeContext(characters, statBlocks),
    session,
  );
}

export function emptyBattleRuntimeContext(): BattleRuntimeContext {
  return new RuntimeContext(new Map());
}

/** Package-internal boundary for context produced by combatant admission. */
export function battleRuntimeContextFromCharacterAdmission(
  characters: ReadonlyMap<CombatantId, CharacterBattleRuntimeContext>,
  statBlocks: ReadonlyMap<
    CombatantId,
    BattleStatBlockPresentationSource
  > = new Map(),
): BattleRuntimeContext {
  return new RuntimeContext(characters, statBlocks);
}

export function battleRuntimeSessionWithStatBlockPresentation(
  session: BattleRuntimeSession,
  state: import("./battle-state-execution.ts").BattleState,
  combatantId: CombatantId,
  presentation: BattleStatBlockPresentationSource,
): BattleRuntimeSession {
  const retainedContext = battleRuntimeContextForState(session.context, state);
  const statBlocks = new Map(retainedContext.statBlocks);
  statBlocks.set(combatantId, presentation);
  return RuntimeSession.fromAdmittedContext(
    state,
    new RuntimeContext(retainedContext.characters, statBlocks),
    session,
  );
}
