import { optionalProperty } from "../../optional-property.ts";
import { Schema } from "effect";
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
import type { SpellFillSet } from "../spells-resolve-fill-set.ts";
import type { SpellProcedureExecutionRegistry } from "./execution-registry.ts";
import type { SpellProcedureDeclarationResolution } from "./resolution-contract.ts";

export type OkSpellFillSet = Extract<SpellFillSet, { readonly tag: "ok" }>;

export function spellProcedureResolutionContext<
  ResolutionInput,
  ActorId,
  Invocation,
  FillSet,
  ActionCostOverride,
  MetamagicApplications,
>(input: {
  readonly input: ResolutionInput;
  readonly actorId: ActorId;
  readonly invocation: Invocation;
  readonly fillSet: FillSet;
  readonly actionCostOverride?: ActionCostOverride;
  readonly metamagicApplications?: MetamagicApplications;
}) {
  return {
    input: input.input,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
    ...optionalProperty("actionCostOverride", input.actionCostOverride),
    ...optionalProperty("metamagicApplications", input.metamagicApplications),
  };
}

export type SpellProcedureProfileResolveInput<
  I extends { readonly procedure: SpellProcedureKey },
> = SpellProcedureDeclarationResolution<I["procedure"]>;

export type SpellProcedureExecutionDeclaration<P extends SpellProcedureKey> = {
  readonly procedure: P;
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
    input: SpellProcedureDeclarationResolution<P>,
    executionRegistry: SpellProcedureExecutionRegistry,
  ) => BattleResolutionResult;
};

export function spellProcedureExecutionSchema<
  S extends Schema.Schema.AnyNoContext,
>(schema: S & (0 extends 1 & S["Type"] ? never : unknown)): S {
  return schema;
}
