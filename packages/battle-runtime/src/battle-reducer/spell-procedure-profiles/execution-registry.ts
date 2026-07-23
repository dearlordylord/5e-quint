import type {
  BattleActDiscoveryCandidate,
  BattleResolutionResult,
  BattleState,
} from "../../battle-state-execution.ts";
import type {
  BattleSpellProcedureExecution,
  SpellProcedureExecutionByProcedure,
  SpellProcedureKey,
} from "../../character-execution.ts";
import type { CombatantId } from "../../identity.ts";
import type {
  SpellProcedureExecutionResolution,
  StoredGlyphSpellProcedureResolution,
} from "./resolution-contract.ts";
export type { SpellProcedureExecutionResolution } from "./resolution-contract.ts";

export type SpellProcedureMetamagicCompatibility =
  | "actionSpellResolverNotRewritten"
  | "bonusActionRewrite"
  | "notActionSpellCasting";

export type RegisteredSpellProcedure = SpellProcedureKey;

export type RegisteredSpellProcedureClassification = {
  readonly metamagicCompatibility: SpellProcedureMetamagicCompatibility;
};

export type RegisteredSpellProcedureExecution<
  Procedure extends RegisteredSpellProcedure,
> = RegisteredSpellProcedureClassification & {
  readonly procedure: Procedure;
  readonly executionSchema: {
    readonly Type: SpellProcedureExecutionByProcedure[Procedure];
  };
  readonly discoverCastAct: (
    state: BattleState,
    actorId: CombatantId,
    invocation: BattleSpellProcedureExecution<
      SpellProcedureExecutionByProcedure[Procedure]
    >,
  ) => readonly BattleActDiscoveryCandidate[];
  readonly resolve: (
    resolution: SpellProcedureExecutionResolution<Procedure>,
  ) => BattleResolutionResult;
};

// Execution consumers depend on this authored-free port. The composition
// boundary projects each execution entry from the canonical declarations;
// callers never traverse the authored admission view or its mixed contract.
export type SpellProcedureExecutionRegistry = {
  readonly executionFor: <Procedure extends RegisteredSpellProcedure>(
    procedure: Procedure,
  ) => RegisteredSpellProcedureExecution<Procedure>;
  readonly resolveStoredGlyph: (
    resolution: StoredGlyphSpellProcedureResolution,
  ) => BattleResolutionResult;
};

export function spellProcedureExecutionFor<
  Procedure extends RegisteredSpellProcedure,
>(
  registry: SpellProcedureExecutionRegistry,
  procedure: Procedure,
): RegisteredSpellProcedureExecution<Procedure> {
  return registry.executionFor(procedure);
}

export function registeredSpellProcedureClassification(
  registry: SpellProcedureExecutionRegistry,
  procedure: RegisteredSpellProcedure,
): RegisteredSpellProcedureClassification {
  return registry.executionFor(procedure);
}

export function resolveStoredGlyphSpellProcedure(
  registry: SpellProcedureExecutionRegistry,
  resolution: StoredGlyphSpellProcedureResolution,
): BattleResolutionResult {
  return registry.resolveStoredGlyph(resolution);
}
