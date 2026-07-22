import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
// A Spell Procedure Declaration bundles every layer the runtime needs to handle
// one class of spell behavior — admission, discovery, dispatch, codec, and
// classification — into a single procedure-keyed source. Registry views narrow
// that declaration for authored admission traversal or authored-free execution.
// Today each declaration is
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
import type { CharacterLevel } from "@dnd/shared/types";
import type { UnitId } from "@dnd/shared/game-facts";
import type {
  BattleAntimagicFieldOngoingSpellEffectRef,
  BattleCreatureState,
  BattleState,
  SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
export { SpellRuleExecutionFactsSchema } from "../../procedure-execution/spell-rule-facts.ts";
import type { CombatantId } from "../../identity.ts";
import type { CharacterBattleSpellcastingExecutionState } from "../../character-battle-resource-execution.ts";
import type { BattleResourcePoolExecutionRef } from "../../identity.ts";
import {
  antimagicFieldSuppressedOngoingSpellEffectKeys,
  ongoingSpellEffectRefKey,
} from "../antimagic-field-suppression.ts";
import { characterBattleLevel } from "../../character-class-level.ts";
import type { SpellProcedureExecutionDeclaration } from "./execution-profile.ts";
export * from "./execution-profile.ts";

// Context handed to admit() at discovery time. Profiles use only what they
// need, with character actor facts kept canonical on `actor`.
export type SpellAdmissionActor = BattleCreatureState & {
  readonly origin: Extract<
    BattleCreatureState["origin"],
    { readonly kind: "character" }
  > & {
    readonly spellcasting: CharacterBattleSpellcastingExecutionState & {
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
  readonly availableClassFeatureFreeCastResourcePoolRefsForSpell: (
    spellId: UnitId,
  ) => readonly BattleResourcePoolExecutionRef[];
};

// Registry admission is existential over each profile's concrete invocation.
// This common view preserves the shared input contract while projecting each
// concrete result to the supported-invocation union covariantly.
export type AnySpellProcedureAdmission = {
  readonly admit: (
    spell: BattleSpellAdmissionSource,
    ctx: SpellAdmissionContext,
  ) => readonly SupportedSpellInvocation[];
};

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

export function spellAdmissionBattleProjection(
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
): CharacterLevel {
  return characterBattleLevel(ctx.actor.origin.classLevels);
}

export type SpellInvocationAdmittedByRegisteredProcedure<
  P extends SupportedSpellInvocation["procedure"],
> = {
  readonly [I in SupportedSpellInvocation as I["procedure"]]: P extends I["procedure"]
    ? I
    : never;
}[SupportedSpellInvocation["procedure"]];

// One profile per spell-procedure registration. Generic in the registered
// procedure literal and the narrowed invocation/input types so admit/resolve
// stay type-checked against the right shape. Most profiles register the same
// literal their invocation carries; a combined profile may register one literal
// while accepting an invocation whose procedure field admits that literal.
export type SpellProcedureAdmissionDeclaration<
  P extends SupportedSpellInvocation["procedure"],
  I extends SpellInvocationAdmittedByRegisteredProcedure<P>,
> = {
  // Discovery: enumerate every currently-admissible invocation of this
  // procedure for the given actor + spell. Returns [] if the spell does not
  // fit this procedure's shape.
  readonly admit: (
    spell: BattleSpellAdmissionSource,
    ctx: SpellAdmissionContext,
  ) => readonly I[];
};

export type SpellProcedureDeclaration<
  P extends SupportedSpellInvocation["procedure"],
  I extends SpellInvocationAdmittedByRegisteredProcedure<P>,
> = SpellProcedureAdmissionDeclaration<P, I> &
  SpellProcedureExecutionDeclaration<P>;
