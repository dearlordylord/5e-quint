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
  BattleStatBlockProcedureExecutionRef,
  CombatantId,
} from "./identity.ts";
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import type { WeaponId } from "@dnd/shared/game-facts";
import type { WeaponRecord } from "@dnd/surface/surface/types";
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
    };

export type BattleStatBlockPresentationSource = {
  readonly displayName: string;
  readonly procedures: readonly BattleStatBlockProcedurePresentation[];
  readonly languages:
    | { readonly kind: "absentStatBlockLanguages" }
    | { readonly kind: "casterLanguagesReference" }
    | {
        readonly kind: "authoredStatBlockLanguageEntries";
        readonly entries: ReadonlyNonEmptyArray<string>;
      };
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
  const characters = new Map(session.context.characters);
  characters.set(ownerId, {
    ...ownerContext,
    retainedCompanionSelection: selection,
  });
  const statBlocks = new Map(session.context.statBlocks);
  if (statBlockPresentation !== undefined) {
    statBlocks.set(
      statBlockPresentation.combatantId,
      statBlockPresentation.source,
    );
  }
  return RuntimeSession.fromAdmittedContext(
    state,
    new RuntimeContext(characters, statBlocks),
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
  const statBlocks = new Map(session.context.statBlocks);
  statBlocks.set(combatantId, presentation);
  return RuntimeSession.fromAdmittedContext(
    state,
    new RuntimeContext(session.context.characters, statBlocks),
  );
}
