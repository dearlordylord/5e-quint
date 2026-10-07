import type { CorrelatedSpellExecution } from "../../procedure-execution/spell-procedure-execution.ts";
import { optionalProperty } from "../../optional-property.ts";
import { Schema } from "effect";
import {
  isSpellProcedureCastingFacts,
  isSpellInvocationCastingFacts,
  type SpellProcedureCastingFacts,
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

export type SpellProcedureExecutionFields<
  P extends BattleSpellProcedureKey,
  Codec,
  Discover,
  Resolve,
> = {
  readonly procedure: P;
  readonly executionSchema: Codec;
  readonly discoverCastAct: Discover;
  readonly resolve: Resolve;
};

export type SpellProcedureExecutionDeclaration<
  P extends BattleSpellProcedureKey,
> = SpellProcedureExecutionFields<
  P,
  SpellProcedureExecutionCodec<P>,
  (
    state: BattleState,
    actorId: CombatantId,
    invocation: BattleSpellProcedureExecution<
      SpellProcedureExecutionByProcedure[P]
    >,
  ) => readonly BattleActDiscoveryCandidate[],
  (
    input: SpellProcedureDeclarationResolution<P>,
    executionRegistry: SpellProcedureExecutionRegistry,
  ) => BattleResolutionResult
>;

type StatBlockSpellProcedureSchemaFields<F extends Schema.Struct.Fields> = Omit<
  F,
  "actionCost"
> & {
  readonly actionCost: Schema.Literals<readonly ["magicAction", "bonusAction"]>;
};
type StatBlockSpellProcedureSchema<F extends Schema.Struct.Fields> =
  Schema.Struct<StatBlockSpellProcedureSchemaFields<F>>;
type CharacterSpellProcedureSchemaType<F extends Schema.Struct.Fields> =
  Schema.Struct<F>["Type"] &
    Exclude<
      CorrelatedSpellExecution<Schema.Struct<F>["Type"]>,
      {
        readonly access: {
          readonly tag: "statBlockCantrip" | "statBlockLeveled" | "spellEffect";
        };
      }
    >;
type StatBlockSpellProcedureSchemaType<F extends Schema.Struct.Fields> =
  StatBlockSpellProcedureSchema<F>["Type"] &
    Extract<
      CorrelatedSpellExecution<StatBlockSpellProcedureSchema<F>["Type"]>,
      {
        readonly access: {
          readonly tag: "statBlockCantrip" | "statBlockLeveled";
        };
      }
    >;
export type SpellProcedureExecutionSchema<F extends Schema.Struct.Fields> =
  Schema.Union<
    readonly [
      Schema.refine<CharacterSpellProcedureSchemaType<F>, Schema.Struct<F>>,
      Schema.refine<
        StatBlockSpellProcedureSchemaType<F>,
        StatBlockSpellProcedureSchema<F>
      >,
    ]
  >;

export function spellProcedureExecutionSchema<
  const F extends Schema.Struct.Fields,
>(schema: Schema.Struct<F>): SpellProcedureExecutionSchema<F> {
  const character = Schema.refine<
    typeof schema,
    CharacterSpellProcedureSchemaType<F>
  >(
    (
      value: Schema.Struct<F>["Type"],
    ): value is CharacterSpellProcedureSchemaType<F> =>
      isSpellInvocationCastingFacts(value) &&
      value.spellRuleFacts.castingSource.tag !== "statBlock" &&
      value.access.tag !== "spellEffect",
  )(schema);
  const { actionCost: _declaredActionCost, ...retainedFields } = schema.fields;
  const statBlockFields: StatBlockSpellProcedureSchemaFields<F> = {
    ...retainedFields,
    actionCost: Schema.Literals(["magicAction", "bonusAction"]),
  };
  const statBlockSchema: StatBlockSpellProcedureSchema<F> =
    Schema.Struct(statBlockFields);
  const statBlock = Schema.refine<
    typeof statBlockSchema,
    StatBlockSpellProcedureSchemaType<F>
  >(
    (
      value: typeof statBlockSchema.Type,
    ): value is StatBlockSpellProcedureSchemaType<F> => {
      if (
        typeof value !== "object" ||
        value === null ||
        !("actionCost" in value)
      )
        return false;
      const currentActionCost = value.actionCost;
      if (!isSpellInvocationCastingFacts(value)) return false;
      const source = value.spellRuleFacts.castingSource;
      if (source.tag !== "statBlock" || value.access.tag === "spellEffect")
        return false;
      return currentActionCost === source.actionCost;
    },
  )(statBlockSchema);
  return Schema.Union([character, statBlock]);
}

/** Effect procedures retain their declared action cost and do not cast again. */
export function spellEffectProcedureExecutionSchema<
  S extends Schema.ConstraintCodec<unknown, unknown, never, never>,
>(schema: S) {
  return Schema.refine<S, S["Type"] & SpellProcedureCastingFacts>(
    (value: S["Type"]): value is S["Type"] & SpellProcedureCastingFacts =>
      isSpellProcedureCastingFacts(value),
  )(schema);
}
