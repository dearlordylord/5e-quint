import { Schema } from "effect";
import type {
  BattleActDiscoveryCandidate,
  BattleResolutionResult,
  BattleState,
} from "../../battle-reducer.ts";
import type {
  BattleSpellProcedureExecution,
  SpellProcedureExecutionByProcedure,
  SpellProcedureKey,
} from "../../character-execution.ts";
import type { CombatantId } from "../../identity.ts";
import type { SpellFillSet } from "../spells-resolve-fill-set.ts";
import type {
  SpellProcedureExecutionRegistry,
  SpellProcedureMetamagicCompatibility,
} from "./execution-registry.ts";
import type { SpellProcedureExecutionResolution } from "./resolution-contract.ts";
export type { SpellProcedureMetamagicCompatibility } from "./execution-registry.ts";

export type OkSpellFillSet = Extract<SpellFillSet, { readonly tag: "ok" }>;

export type SpellProcedureProfileResolveInput<
  I extends { readonly procedure: SpellProcedureKey },
> = SpellProcedureExecutionResolution<I["procedure"]>;

export type SpellProcedureExecutionDeclaration<P extends SpellProcedureKey> = {
  readonly procedure: P;
  readonly metamagicCompatibility: SpellProcedureMetamagicCompatibility;
  readonly discoverCastAct: (
    state: BattleState,
    actorId: CombatantId,
    invocation: BattleSpellProcedureExecution<
      SpellProcedureExecutionByProcedure[P]
    >,
  ) => readonly BattleActDiscoveryCandidate[];
  readonly executionSchema: {
    readonly Type: SpellProcedureExecutionByProcedure[P];
  };
  readonly resolve: (
    input: SpellProcedureExecutionResolution<P>,
    executionRegistry: SpellProcedureExecutionRegistry,
  ) => BattleResolutionResult;
};

export function spellProcedureExecutionSchema<
  S extends Schema.Schema.AnyNoContext,
>(schema: S & (0 extends 1 & S["Type"] ? never : unknown)): S {
  return schema;
}
