import { optionalProperty } from "../../optional-property.ts";
import { Schema } from "effect";
import {
  isSpellProcedureCastingFacts,
  isSpellInvocationCastingFacts,
  type SpellProcedureCastingFacts,
  type SpellInvocationCastingFacts,
} from "../../procedure-execution/spell-invocation-casting-facts.ts";
import type {
  BattleActDiscoveryCandidate,
  BattleResolutionResult,
  BattleState,
} from "../../battle-state-execution.ts";
import type {
  BattleSpellProcedureExecution,
  BattleSpellProcedureKey,
  SpellProcedureInput,
  SpellProcedureExecutionByProcedure,
} from "../../character-execution.ts";
import type { CombatantId } from "../../identity.ts";
import type { SpellFillSet } from "../spells-resolve-fill-set.ts";
import type { SpellProcedureExecutionRegistry } from "./execution-registry.ts";
import type { SpellProcedureExecutionCodec } from "./execution-schema-contract.ts";
import type { SpellProcedureDeclarationResolution } from "./resolution-contract.ts";
export type { SpellProcedureExecutionCodec } from "./execution-schema-contract.ts";

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
  I extends SpellProcedureInput<BattleSpellProcedureKey>,
> =
  SpellProcedureDeclarationResolution<I["procedure"]> extends infer Resolution
    ? Resolution extends { readonly invocation: unknown }
      ? Omit<Resolution, "invocation"> & {
          readonly invocation: BattleSpellProcedureExecution<I>;
        }
      : never
    : never;

export type SpellProcedureExecutionDeclaration<
  P extends BattleSpellProcedureKey,
> = {
  readonly procedure: P;
  readonly discoverCastAct: (
    state: BattleState,
    actorId: CombatantId,
    invocation: BattleSpellProcedureExecution<
      SpellProcedureExecutionByProcedure[P]
    >,
  ) => readonly BattleActDiscoveryCandidate[];
  readonly executionSchema: SpellProcedureExecutionCodec<P>;
  readonly resolve: (
    input: SpellProcedureDeclarationResolution<P>,
    executionRegistry: SpellProcedureExecutionRegistry,
  ) => BattleResolutionResult;
};

type StatBlockInitialCastingFacts = Extract<
  SpellInvocationCastingFacts,
  {
    readonly access: { readonly tag: "statBlockCantrip" | "statBlockLeveled" };
  }
>;
type CharacterInitialCastingFacts = Exclude<
  SpellInvocationCastingFacts,
  | StatBlockInitialCastingFacts
  | { readonly access: { readonly tag: "spellEffect" } }
>;

export function spellProcedureExecutionSchema<
  const F extends Schema.Struct.Fields,
>(schema: Schema.Struct<F>) {
  const character = Schema.refine(
    (
      value: Schema.Struct<F>["Type"],
    ): value is Schema.Struct<F>["Type"] & CharacterInitialCastingFacts =>
      isSpellInvocationCastingFacts(value) &&
      value.spellRuleFacts.castingSource.tag !== "statBlock" &&
      value.access.tag !== "spellEffect",
  )(schema);
  const statBlockSchema = Schema.Struct({
    ...schema.fields,
    actionCost: Schema.Literals(["magicAction", "bonusAction"]),
  });
  const statBlock = Schema.refine(
    (
      value: typeof statBlockSchema.Type,
    ): value is typeof statBlockSchema.Type & StatBlockInitialCastingFacts => {
      const currentActionCost = value.actionCost;
      if (!isSpellInvocationCastingFacts(value)) return false;
      const source = value.spellRuleFacts.castingSource;
      if (source.tag !== "statBlock" || value.access.tag === "spellEffect")
        return false;
      const actionCost =
        source.castingTime.kind === "minutes" ||
        source.castingTime.kind === "hours"
          ? "magicAction"
          : source.actionCost;
      return currentActionCost === actionCost;
    },
  )(statBlockSchema);
  return Schema.Union([character, statBlock]);
}

/** Effect procedures retain their declared action cost and do not cast again. */
export function spellEffectProcedureExecutionSchema<
  S extends Schema.ConstraintCodec<unknown, unknown, never, never>,
>(schema: S) {
  return Schema.refine(
    (value: S["Type"]): value is S["Type"] & SpellProcedureCastingFacts =>
      isSpellProcedureCastingFacts(value),
  )(schema);
}
