// A Spell Procedure Profile bundles every layer the runtime needs to handle
// one class of spell behavior — admission, discovery, dispatch, codec, and
// classification — into a single typed declaration. Today each profile is
// scattered across ~11 modules (predicates in spells-profiles-support.ts,
// resolvers in spells-resolve-support-effects.ts, applyEffect in
// spells-active-effects.ts, codec in battle-codecs.ts, discovery branches in
// spells-discovery.ts, classification in spells-invocation-guards.ts,
// metamagic flags in metamagic.ts, etc). Invocation references deliberately
// stay in the outer presentation join because they retain authored spell
// identity. Consolidating each mechanical profile behind this type localises change: adding
// a new profile is one file; changing how an existing profile behaves opens
// exactly that file.

import { currentActing } from "@dnd/shared-algebras/initiative-algebra";
import {
  DurationSchema,
  RangeSchema,
  SpellLevelSchema,
} from "@dnd/surface/surface/schema";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Schema } from "effect";
import type {
  ActionSpellBattleResolutionInput,
  BattleActDiscoveryCandidate,
  BattleAntimagicFieldOngoingSpellEffectRef,
  BattleCreatureState,
  BattleResolutionResult,
  BattleState,
  ReadiedSpellInvocation,
  SupportedSpellInvocation,
  TargetListSpellInvocation,
  TargetListSpellInvocationOf,
} from "../../battle-reducer.ts";
import type {
  BattleSpellProcedureExecution,
  SpellProcedureExecution,
  SpellRuleExecutionFacts,
} from "../../character-execution.ts";
import type { CombatantId } from "../../identity.ts";
import type {
  CharacterBattleResourceOwnership,
  CharacterBattleSpellcastingState,
} from "../../character-battle-resources.ts";
import {
  antimagicFieldSuppressedOngoingSpellEffectKeys,
  ongoingSpellEffectRefKey,
} from "../antimagic-field-suppression.ts";
import type { SpellFillSet } from "../spells-resolve-fill-set.ts";

// Context handed to admit() at discovery time. Profiles use only what they
// need, with character actor facts kept canonical on `actor`.
export type SpellAdmissionActor = BattleCreatureState & {
  readonly origin: Extract<
    BattleCreatureState["origin"],
    { readonly kind: "character" }
  > & {
    readonly spellcasting: CharacterBattleSpellcastingState & {
      readonly canCastSpells: true;
    };
  };
};
export type SpellAdmissionBattleTurn = {
  readonly currentActorId: CombatantId;
  readonly round: BattleState["initiative"]["round"];
};

export type SpellAdmissionBattleProjection = {
  readonly turn: SpellAdmissionBattleTurn;
  readonly suppressedOngoingSpellEffectKeys: ReadonlySet<string>;
};

export type SpellAdmissionContext = {
  readonly actor: SpellAdmissionActor;
  readonly battle: SpellAdmissionBattleProjection | undefined;
  readonly resourceOwnership: readonly CharacterBattleResourceOwnership[];
};

// Registry admission is existential over each profile's concrete invocation.
// This common view preserves the shared input contract while projecting each
// concrete result to the supported-invocation union covariantly.
export type SpellProcedureAdmissionProfile = {
  readonly admit: (
    spell: SpellRecord,
    ctx: SpellAdmissionContext,
  ) => readonly SupportedSpellInvocation[];
};

function isSpellAdmissionActor(
  actor: BattleCreatureState,
): actor is SpellAdmissionActor {
  return (
    actor.origin.kind === "character" &&
    actor.origin.spellcasting !== undefined &&
    actor.origin.spellcasting.canCastSpells
  );
}

export function spellAdmissionContextFor(
  actor: BattleCreatureState,
  state: BattleState | undefined,
  resourceOwnership: readonly CharacterBattleResourceOwnership[],
): SpellAdmissionContext | null {
  if (!isSpellAdmissionActor(actor)) {
    return null;
  }
  return {
    actor,
    battle: spellAdmissionBattleProjection(state),
    resourceOwnership,
  };
}

export function spellAdmissionBattleTurn(
  ctx: SpellAdmissionContext,
): SpellAdmissionBattleTurn | undefined {
  return ctx.battle?.turn;
}

export function spellAdmissionOngoingSpellEffectSuppressed(
  ctx: SpellAdmissionContext,
  effect: BattleAntimagicFieldOngoingSpellEffectRef,
): boolean {
  return (
    ctx.battle?.suppressedOngoingSpellEffectKeys.has(
      ongoingSpellEffectRefKey(effect),
    ) ?? false
  );
}

function spellAdmissionBattleProjection(
  state: BattleState | undefined,
): SpellAdmissionBattleProjection | undefined {
  return state === undefined
    ? undefined
    : {
        turn: {
          currentActorId: currentActing(state.initiative),
          round: state.initiative.round,
        },
        suppressedOngoingSpellEffectKeys:
          antimagicFieldSuppressedOngoingSpellEffectKeys(state),
      };
}

export function spellAdmissionCharacterLevel(
  ctx: SpellAdmissionContext,
): number {
  return ctx.actor.origin.classLevels.reduce(
    (total, classLevel) => total + Number(classLevel.level),
    0,
  );
}

// Each profile carries its own metamagic classification so dispatch tables can
// project the compatibility from the registry instead of duplicating it.
export type SpellProcedureMetamagicCompatibility =
  | "actionSpellResolverNotRewritten"
  | "bonusActionRewrite"
  | "notActionSpellCasting";

export type OkSpellFillSet = Extract<SpellFillSet, { readonly tag: "ok" }>;

export const SpellRuleExecutionFactsSchema: Schema.Schema<SpellRuleExecutionFacts> =
  Schema.Struct({
    level: SpellLevelSchema,
    range: RangeSchema,
    duration: DurationSchema,
    components: Schema.Struct({
      verbal: Schema.Boolean,
      somatic: Schema.Boolean,
      hasMaterial: Schema.Boolean,
      hasPricedOrConsumedMaterial: Schema.Boolean,
    }),
    twinnedTargetCount: Schema.Union(
      Schema.Struct({
        base: Schema.Number,
        baseLevel: Schema.Number,
      }),
      Schema.Null,
    ),
  });

export type SpellProcedureProfileResolveInput<
  I extends SupportedSpellInvocation,
  Input = ActionSpellBattleResolutionInput,
  FillSet = OkSpellFillSet,
> = {
  readonly input: Input;
  readonly actorId: CombatantId;
  readonly invocation: BattleSpellProcedureExecution<I>;
  readonly fillSet: FillSet;
};

// Stored spell glyph releases reuse profile reducers after storage-time casting
// has already paid the normal spell costs. Omitted flags mean ordinary casting.
export type SpellProcedureStoredGlyphReleaseOptions = {
  readonly opensSpellCastReactionWindow?: false;
  readonly spendsCastResources?: false;
  readonly startsOrdinaryConcentration?: false;
};

export type SpellInvocationAdmittedByRegisteredProcedure<
  P extends SupportedSpellInvocation["procedure"],
> = {
  readonly [I in SupportedSpellInvocation as I["procedure"]]: P extends I["procedure"]
    ? I
    : never;
}[SupportedSpellInvocation["procedure"]];

export type SpellProcedureAnyTargetListInvocationClassifier =
  | { readonly kind: "always" }
  | { readonly kind: "none" }
  | { readonly kind: "byTargetingKind"; readonly targetingKind: "targetList" };

export type SpellProcedureTargetListInvocationClassifier<
  I extends SupportedSpellInvocation,
> = [I] extends [TargetListSpellInvocation]
  ? { readonly kind: "always" }
  : TargetListSpellInvocationOf<I> extends never
    ? { readonly kind: "none" }
    :
        | { readonly kind: "none" }
        | {
            readonly kind: "byTargetingKind";
            readonly targetingKind: "targetList";
          };

export type SpellProcedureReadiedSpellCompatibility<
  I extends SupportedSpellInvocation,
> =
  Extract<
    ReadiedSpellInvocation,
    { readonly procedure: I["procedure"] }
  > extends never
    ? false
    : boolean;

// One profile per spell-procedure registration. Generic in the registered
// procedure literal and the narrowed invocation/input types so admit/resolve
// stay type-checked against the right shape. Most profiles register the same
// literal their invocation carries; a combined profile may register one literal
// while accepting an invocation whose procedure field admits that literal.
export type SpellProcedureProfile<
  P extends SupportedSpellInvocation["procedure"],
  I extends SpellInvocationAdmittedByRegisteredProcedure<P>,
  Input = ActionSpellBattleResolutionInput,
  FillSet = OkSpellFillSet,
> = {
  readonly procedure: P;

  // Static classification that used to live as scattered negative-list
  // membership checks across several modules.
  readonly metamagicCompatibility: SpellProcedureMetamagicCompatibility;
  readonly targetListInvocation: SpellProcedureTargetListInvocationClassifier<I>;
  readonly isReadiedSpellCompatible: SpellProcedureReadiedSpellCompatibility<I>;

  // Discovery: enumerate every currently-admissible invocation of this
  // profile for the given actor + spell. Returns [] if the spell does not
  // fit this profile's shape.
  readonly admit: (
    spell: SpellRecord,
    ctx: SpellAdmissionContext,
  ) => readonly I[];

  // Discovery: build the cast act(s) and their initial holes.
  readonly discoverCastAct: (
    state: BattleState,
    actorId: CombatantId,
    invocation: BattleSpellProcedureExecution<I>,
  ) => readonly BattleActDiscoveryCandidate[];

  // Runtime codec for the exact mechanical execution shape owned by this
  // profile. Authored spell payloads are joined outside reducer execution.
  readonly executionSchema: {
    readonly Type: SpellProcedureExecution<I>;
  };

  // Dispatch entry: consume a fill set, produce a resolution result.
  readonly resolve: (
    input: SpellProcedureProfileResolveInput<I, Input, FillSet>,
  ) => BattleResolutionResult;
};

export function spellProcedureExecutionSchema<
  S extends Schema.Schema.AnyNoContext,
>(schema: S): S {
  return schema;
}

// Existential wrapper for a heterogeneous registry. Distributes over the
// procedure literal so the registry holds a UNION of profile instantiations
// rather than collapsing into a single contravariant profile that would
// require all methods to accept any invocation. Each member of the union
// has its own narrowed methods.
export type AnySpellProcedureProfile = {
  readonly [P in SupportedSpellInvocation["procedure"]]: SpellProcedureProfile<
    P,
    SpellInvocationAdmittedByRegisteredProcedure<P>,
    never,
    never
  >;
}[SupportedSpellInvocation["procedure"]];
