// A Spell Procedure Profile bundles every layer the runtime needs to handle
// one class of spell behavior — admission, discovery, dispatch, codec, and
// classification — into a single typed declaration. Today each profile is
// scattered across ~11 modules (predicates in spells-profiles-support.ts,
// resolvers in spells-resolve-support-effects.ts, applyEffect in
// spells-active-effects.ts, codec in battle-codecs.ts, discovery branches in
// spells-discovery.ts, classification in spells-invocation-guards.ts,
// metamagic flags in metamagic.ts, ref builder in spells-invocation-ref.ts,
// etc). Consolidating each profile behind this type localises change: adding
// a new profile is one file; changing how an existing profile behaves opens
// exactly that file.

import type { SpellRecord } from "@dnd/surface/surface/types";
import type {
  ActionSpellBattleResolutionInput,
  AvailableBattleAct,
  BattleResolutionResult,
  BattleState,
  SupportedSpellInvocation,
} from "../../battle-reducer.ts";
import type { SpellInvocationRef } from "../../battle-subjects.ts";
import type { CombatantId } from "../../identity.ts";
import type { CharacterBattleSpellcastingState } from "../../character-battle-resources.ts";
import type { SpellFillSet } from "../spells-resolve-fill-set.ts";

// Context handed to admit() at discovery time. Profiles use only what they
// need; future profiles that key off other actor facts may widen this.
export type SpellAdmissionContext = {
  readonly actorId: CombatantId;
  readonly spellcasting: CharacterBattleSpellcastingState;
  readonly characterLevel: number;
};

// Currently lives as a string literal table in metamagic.ts. Mirrored here so
// each profile carries its own metamagic classification.
export type SpellProcedureMetamagicCompatibility =
  | "actionSpellResolverNotRewritten"
  | "bonusActionRewrite"
  | "notActionSpellCasting";

export type OkSpellFillSet = Extract<SpellFillSet, { readonly tag: "ok" }>;

export type SpellProcedureProfileResolveInput<I> = {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: I;
  readonly fillSet: OkSpellFillSet;
};

// One profile per spell-procedure variant. Generic in the procedure literal
// and the narrowed invocation type so admit/resolve/codec stay type-checked
// against the right shape.
export type SpellProcedureProfile<
  P extends SupportedSpellInvocation["procedure"],
  I extends Extract<SupportedSpellInvocation, { readonly procedure: P }>,
> = {
  readonly procedure: P;

  // Static classification that used to live as scattered negative-list
  // membership checks across several modules.
  readonly metamagicCompatibility: SpellProcedureMetamagicCompatibility;
  readonly isTargetListInvocation: boolean;
  readonly isReadiedSpellCompatible: boolean;
  readonly knownWillingTargetSpellIds: ReadonlyArray<SpellRecord["id"]>;

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
    invocation: I,
  ) => readonly AvailableBattleAct[];

  // Discovery: short human-readable label for the cast act.
  readonly castSummary: (invocation: I) => string;

  // Reference projection used to address an invocation across snapshots and
  // continuations.
  readonly invocationRef: (invocation: I) => SpellInvocationRef;

  // Dispatch entry: consume a fill set, produce a resolution result.
  readonly resolve: (
    input: SpellProcedureProfileResolveInput<I>,
  ) => BattleResolutionResult;

  // TODO(spell-procedure-profile-registry): own the invocation Schema here too,
  // and have battle-codecs.ts compose the union from registered profiles. That
  // requires first exporting the shared building-block schemas
  // (ClassCantripSpellAccessSchema, NoSpellInvocationResourceSchema, etc) from
  // battle-codecs.ts, which is a separate move.
};

// Existential wrapper for a heterogeneous registry. Distributes over the
// procedure literal so the registry holds a UNION of profile instantiations
// rather than collapsing into a single contravariant profile that would
// require all methods to accept any invocation. Each member of the union
// has its own narrowed methods.
export type AnySpellProcedureProfile = {
  readonly [P in SupportedSpellInvocation["procedure"]]: SpellProcedureProfile<
    P,
    Extract<SupportedSpellInvocation, { readonly procedure: P }>
  >;
}[SupportedSpellInvocation["procedure"]];
