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
import type { SpellSlotLevel } from "@dnd/shared/types";
import type {
  BattleMagicSuppressionOngoingSpellEffectRef,
  BattleCreatureState,
  BattleState,
  SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
export { SpellRuleExecutionFactsSchema } from "../../procedure-execution/spell-rule-facts.ts";
import type {
  BattleResourcePoolExecutionRef,
  CombatantId,
} from "../../identity.ts";
import type { CharacterBattleSpellcastingExecutionState } from "../../character-battle-resource-execution.ts";
import type {
  CantripSpellAccess,
  LeveledSpellInvocationResource,
  PreparedSpellAccess,
  SpellAccessFreeCastInvocationResource,
  SpellSlotInvocationResource,
} from "../../procedure-execution/spell-invocation-vocabulary.ts";
import type { BattleSpellProcedureKey } from "../../character-execution.ts";
import { cantripSpellAccessForCastingSource } from "../../procedure-execution/spell-invocation-vocabulary.ts";
import {
  magicSuppressionOngoingSpellEffectKeys,
  ongoingSpellEffectRefKey,
} from "../magic-suppression-ongoing-effect.ts";
import { characterBattleLevel } from "../../character-class-level.ts";
import type { SpellProcedureExecutionDeclaration } from "./execution-profile.ts";
import type {
  SpellProcedureAdmissionIssue,
  SpellProcedureMechanicsFacts,
  SpellProcedureMechanicsAdmissionDeclaration,
} from "./spell-mechanics-admission.ts";
export * from "./execution-profile.ts";
export * from "./spell-mechanics-admission.ts";

// Context handed to a supported static admission's bound closure at discovery
// time. Profiles use only what they need, with character actor facts kept
// canonical on `actor`.
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
  readonly castingSource: BattleSpellAdmissionSource["castingSource"];
  readonly battle: SpellAdmissionBattleProjection | undefined;
  readonly spellCastOptions: readonly SpellAdmissionCastOption[];
};

export type SpellAdmissionCastOption = {
  readonly spellLevel: SpellSlotLevel;
  readonly payment:
    | { readonly tag: "slot" }
    | {
        readonly tag: "spellAccessFreeCast";
        readonly resourcePoolRef: BattleResourcePoolExecutionRef;
      };
};

export function cantripSpellAccessFor(
  castingSource: BattleSpellAdmissionSource["castingSource"],
): CantripSpellAccess {
  return cantripSpellAccessForCastingSource(castingSource);
}

export type PreparedSpellSlotInvocationBase<
  S extends Pick<BattleSpellAdmissionSource, "mechanics"> =
    BattleSpellAdmissionSource,
> = {
  readonly access: PreparedSpellAccess;
  readonly resource: LeveledSpellInvocationResource;
  readonly spell: S;
};

export function spellInvocationResourceForCastOption(
  option: SpellAdmissionCastOption,
): SpellSlotInvocationResource | SpellAccessFreeCastInvocationResource {
  return option.payment.tag === "slot"
    ? { tag: "spellSlot", slotLevel: option.spellLevel }
    : {
        tag: "spellAccessFreeCast",
        castLevel: option.spellLevel,
        resourcePoolRef: option.payment.resourcePoolRef,
      };
}
type PreparedSpellCastOptions = SpellAdmissionContext["spellCastOptions"];

export function preparedSpellSlotInvocations<
  S extends Pick<BattleSpellAdmissionSource, "mechanics">,
  I,
>(
  spell: S,
  ctx: SpellAdmissionContext,
  complete: (
    base: PreparedSpellSlotInvocationBase<S>,
    slotLevel: SpellSlotLevel,
  ) => I | null,
): readonly I[] {
  return preparedSpellSlotInvocationsFrom(
    spell,
    ctx.spellCastOptions,
    complete,
  );
}

export function preparedSpellSlotInvocationsFrom<
  S extends Pick<BattleSpellAdmissionSource, "mechanics">,
  I,
>(
  spell: S,
  castOptions: PreparedSpellCastOptions,
  complete: (
    base: PreparedSpellSlotInvocationBase<S>,
    slotLevel: SpellSlotLevel,
  ) => I | null,
): readonly I[] {
  return castOptions.flatMap((castOption): readonly I[] => {
    if (Number(castOption.spellLevel) < spell.mechanics.level) {
      return [];
    }
    const invocation = complete(
      {
        access: { tag: "prepared" },
        resource: spellInvocationResourceForCastOption(castOption),
        spell,
      },
      castOption.spellLevel,
    );
    return invocation === null ? [] : [invocation];
  });
}

export function spellAdmissionBattleTurn(
  ctx: SpellAdmissionContext,
): SpellAdmissionBattleTurn | undefined {
  return ctx.battle?.turn;
}

export function spellAdmissionOngoingSpellEffectSuppressed(
  ctx: SpellAdmissionContext,
  effect: BattleMagicSuppressionOngoingSpellEffectRef,
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
          magicSuppressionOngoingSpellEffectKeys(state),
      };
}

export function spellAdmissionCharacterLevel(
  ctx: SpellAdmissionContext,
): CharacterLevel {
  return characterBattleLevel(ctx.actor.origin.classLevels);
}

export type SpellInvocationAdmittedByRegisteredProcedure<
  P extends BattleSpellProcedureKey,
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
  P extends BattleSpellProcedureKey,
  I extends SpellInvocationAdmittedByRegisteredProcedure<P>,
  Facts extends SpellProcedureMechanicsFacts = SpellProcedureMechanicsFacts,
  Issue extends SpellProcedureAdmissionIssue<P> =
    SpellProcedureAdmissionIssue<P>,
> = {
  /**
   * Static authored-mechanics admission.  This is required at the declaration
   * boundary so every authored profile must migrate before the canonical
   * static view can claim complete/partial roots. Contextual admission is
   * bound by the supported result and therefore consumes correlated facts and
   * a mechanics-free execution source.
   */
  readonly admitMechanics: SpellProcedureMechanicsAdmissionDeclaration<
    P,
    Facts,
    I,
    Issue
  >["admitMechanics"];
};

export type SpellProcedureDeclaration<
  P extends BattleSpellProcedureKey,
  I extends SpellInvocationAdmittedByRegisteredProcedure<P>,
  Facts extends SpellProcedureMechanicsFacts = SpellProcedureMechanicsFacts,
  Issue extends SpellProcedureAdmissionIssue<P> =
    SpellProcedureAdmissionIssue<P>,
> = SpellProcedureAdmissionDeclaration<P, I, Facts, Issue> &
  SpellProcedureExecutionDeclaration<P>;

export type SynthesizedSpellProcedureDeclaration<
  P extends BattleSpellProcedureKey,
> = {
  readonly admission: "synthesized";
} & SpellProcedureExecutionDeclaration<P>;
