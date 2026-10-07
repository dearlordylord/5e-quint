import { isSpellInvocationCastingFacts } from "../../procedure-execution/spell-invocation-casting-facts.ts";
import type { SpellCasterRequirements } from "./spell-caster-requirements.ts";
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

import { Option } from "effect";
import { attackBonus, type AttackBonus } from "@dnd/shared/types";
import { currentActing } from "@dnd/shared-algebras/initiative-algebra";
import type { CharacterLevel } from "@dnd/shared/types";
import { spellSlotLevel } from "@dnd/shared/types";
import type { SpellLevel } from "@dnd/surface/surface/types";
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
  SpellAccess,
  SpellInvocationResource,
  CantripSpellAccess,
  LeveledSpellInvocationResource,
  LeveledSpellAccess,
  SpellAccessFreeCastInvocationResource,
  SpellSlotInvocationResource,
  StatBlockSpellInvocationResource,
} from "../../procedure-execution/spell-invocation-vocabulary.ts";
import type { BattleSpellProcedureKey } from "../../character-execution.ts";
import {
  leveledSpellAccessForCastingSource,
  cantripSpellAccessForCastingSource,
} from "../../procedure-execution/spell-invocation-vocabulary.ts";
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
export type CharacterSpellAdmissionActor = BattleCreatureState & {
  readonly origin: Extract<
    BattleCreatureState["origin"],
    { readonly kind: "character" }
  > & {
    readonly spellcasting: CharacterBattleSpellcastingExecutionState & {
      readonly canCastSpells: true;
    };
  };
};
export type StatBlockSpellAdmissionActor = BattleCreatureState & {
  readonly origin: Extract<
    BattleCreatureState["origin"],
    { readonly kind: "statBlock" }
  >;
};
export type SpellAdmissionActor =
  | CharacterSpellAdmissionActor
  | StatBlockSpellAdmissionActor;
export type SpellAdmissionBattleTurn = {
  readonly currentActorId: CombatantId;
  readonly round: BattleState["initiative"]["round"];
};

export type SpellAdmissionBattleProjection = {
  readonly turn: SpellAdmissionBattleTurn;
  readonly suppressedOngoingSpellEffectKeys: ReadonlySet<string>;
};

type SpellAdmissionBattleContext = {
  readonly battle: SpellAdmissionBattleProjection | undefined;
};
export type CharacterSpellAdmissionContext = SpellAdmissionBattleContext & {
  readonly kind: "character";
  readonly spellCastOptions: readonly CharacterSpellAdmissionCastOption[];
  readonly actor: CharacterSpellAdmissionActor;
  readonly castingSource: import("../../procedure-execution/spell-rule-facts.ts").CharacterSpellCastingSource;
};
export type StatBlockSpellAdmissionContext = SpellAdmissionBattleContext & {
  readonly kind: "statBlock";
  readonly actor: StatBlockSpellAdmissionActor;
  readonly castingSource: import("../../procedure-execution/spell-rule-facts.ts").StatBlockSpellCastingSource;
  readonly payment:
    | { readonly kind: "atWill"; readonly castLevel: SpellLevel }
    | {
        readonly kind: "limited";
        readonly castLevel: SpellLevel;
        readonly resourcePoolRef: BattleResourcePoolExecutionRef;
      };
};
export type SpellAdmissionContext =
  | CharacterSpellAdmissionContext
  | StatBlockSpellAdmissionContext;

export type AuthoredCantripCastingFacts<S> = Extract<
  import("../../procedure-execution/spell-invocation-casting-facts.ts").AuthoredSpellInvocationCastingFacts<S>,
  {
    readonly access: {
      readonly tag: "classCantrip" | "spellAccessCantrip" | "statBlockCantrip";
    };
  }
>;
export function admittedSpellInvocationCastingFacts<
  S extends Pick<
    BattleSpellAdmissionSource,
    "castingSource" | "spellDefinitionRuleFacts"
  >,
>(candidate: {
  readonly spell: S;
  readonly access: SpellAccess;
  readonly resource: SpellInvocationResource;
}): candidate is typeof candidate &
  import("../../procedure-execution/spell-invocation-casting-facts.ts").AuthoredSpellInvocationCastingFacts<S> {
  return isSpellInvocationCastingFacts({
    spellRuleFacts: {
      ...candidate.spell.spellDefinitionRuleFacts,
      castingSource: candidate.spell.castingSource,
    },
    access: candidate.access,
    resource: candidate.resource,
  });
}
export function admittedCantripCastingFacts<
  S extends Pick<
    BattleSpellAdmissionSource,
    "castingSource" | "spellDefinitionRuleFacts"
  >,
>(candidate: {
  readonly spell: S;
  readonly access: CantripSpellAccess;
  readonly resource: import("../../procedure-execution/spell-invocation-vocabulary.ts").CantripSpellInvocationResource;
}): candidate is typeof candidate & AuthoredCantripCastingFacts<S> {
  return isSpellInvocationCastingFacts({
    spellRuleFacts: {
      ...candidate.spell.spellDefinitionRuleFacts,
      castingSource: candidate.spell.castingSource,
    },
    access: candidate.access,
    resource: candidate.resource,
  });
}
export function admittedLeveledCastingFacts<
  S extends Pick<
    BattleSpellAdmissionSource,
    "castingSource" | "spellDefinitionRuleFacts"
  >,
>(candidate: {
  readonly spell: S;
  readonly access: LeveledSpellAccess;
  readonly resource: LeveledSpellInvocationResource;
}): candidate is typeof candidate & AuthoredLeveledCastingFacts<S> {
  return isSpellInvocationCastingFacts({
    spellRuleFacts: {
      ...candidate.spell.spellDefinitionRuleFacts,
      castingSource: candidate.spell.castingSource,
    },
    access: candidate.access,
    resource: candidate.resource,
  });
}
export function cantripSpellInvocationFacts<
  S extends Pick<
    BattleSpellAdmissionSource,
    "castingSource" | "spellDefinitionRuleFacts"
  >,
>(spell: S, ctx: SpellAdmissionContext): AuthoredCantripCastingFacts<S> | null {
  const candidate = {
    spell: { ...spell, castingSource: ctx.castingSource },
    access: cantripSpellAccessForCastingSource(ctx.castingSource),
    resource: cantripSpellInvocationResource(ctx),
  };
  return admittedCantripCastingFacts(candidate) ? candidate : null;
}
export type AuthoredLeveledCastingFacts<S> = Extract<
  import("../../procedure-execution/spell-invocation-casting-facts.ts").AuthoredSpellInvocationCastingFacts<S>,
  { readonly access: { readonly tag: "prepared" | "statBlockLeveled" } }
>;
export function leveledSpellInvocationOptions<
  S extends Pick<
    BattleSpellAdmissionSource,
    "castingSource" | "spellDefinitionRuleFacts"
  >,
>(
  spell: S,
  ctx: SpellAdmissionContext,
): readonly {
  readonly spellLevel: SpellSlotLevel;
  readonly facts: AuthoredLeveledCastingFacts<S>;
}[] {
  return spellAdmissionCastOptions(ctx).flatMap(
    (
      option,
    ): readonly {
      readonly spellLevel: SpellSlotLevel;
      readonly facts: AuthoredLeveledCastingFacts<S>;
    }[] => {
      const resource = spellInvocationResourceForCastOption(option);
      const candidate = {
        spell: { ...spell, castingSource: ctx.castingSource },
        access: leveledSpellAccessForCastingSource(ctx.castingSource),
        resource,
      };
      return admittedLeveledCastingFacts(candidate)
        ? [{ spellLevel: option.spellLevel, facts: candidate }]
        : [];
    },
  );
}

export function cantripSpellInvocationResource(
  ctx: SpellAdmissionContext,
): import("../../procedure-execution/spell-invocation-vocabulary.ts").CantripSpellInvocationResource {
  if (ctx.kind === "character") return { tag: "none" };
  return ctx.payment.kind === "atWill"
    ? { tag: "statBlockAtWill", castLevel: 0 }
    : {
        tag: "statBlockLimited",
        castLevel: 0,
        resourcePoolRef: ctx.payment.resourcePoolRef,
      };
}

export type CharacterSpellAdmissionCastOption = {
  readonly spellLevel: SpellSlotLevel;
  readonly payment:
    | { readonly tag: "slot" }
    | {
        readonly tag: "spellAccessFreeCast";
        readonly resourcePoolRef: BattleResourcePoolExecutionRef;
      };
};
export type SpellAdmissionCastOption =
  | CharacterSpellAdmissionCastOption
  | {
      readonly spellLevel: SpellSlotLevel;
      readonly payment:
        | { readonly tag: "statBlockAtWill" }
        | {
            readonly tag: "statBlockLimited";
            readonly resourcePoolRef: BattleResourcePoolExecutionRef;
          };
    };
export function spellAdmissionCastOptions(
  ctx: SpellAdmissionContext,
): readonly SpellAdmissionCastOption[] {
  if (ctx.kind === "character") return ctx.spellCastOptions;
  if (ctx.payment.castLevel === 0) return [];
  return [
    {
      spellLevel: spellSlotLevel(ctx.payment.castLevel),
      payment:
        ctx.payment.kind === "atWill"
          ? { tag: "statBlockAtWill" }
          : {
              tag: "statBlockLimited",
              resourcePoolRef: ctx.payment.resourcePoolRef,
            },
    },
  ];
}

export function cantripSpellAccessFor(
  castingSource: BattleSpellAdmissionSource["castingSource"],
): CantripSpellAccess {
  return cantripSpellAccessForCastingSource(castingSource);
}

export function spellInvocationResourceForCastOption(
  option: SpellAdmissionCastOption,
):
  | SpellSlotInvocationResource
  | SpellAccessFreeCastInvocationResource
  | StatBlockSpellInvocationResource<SpellSlotLevel> {
  if (option.payment.tag === "statBlockAtWill")
    return { tag: "statBlockAtWill", castLevel: option.spellLevel };
  if (option.payment.tag === "statBlockLimited")
    return {
      tag: "statBlockLimited",
      castLevel: option.spellLevel,
      resourcePoolRef: option.payment.resourcePoolRef,
    };
  return option.payment.tag === "slot"
    ? { tag: "spellSlot", slotLevel: option.spellLevel }
    : {
        tag: "spellAccessFreeCast",
        castLevel: option.spellLevel,
        resourcePoolRef: option.payment.resourcePoolRef,
      };
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
): CharacterLevel | null {
  return ctx.kind === "character"
    ? characterBattleLevel(ctx.actor.origin.classLevels)
    : null;
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
export type AdmittedSpellFacts<
  Admission extends (
    source: import("./spell-mechanics-admission.ts").SpellMechanicsAdmissionSource,
  ) => import("./spell-mechanics-admission.ts").SpellMechanicsInspectionView,
> = Extract<
  ReturnType<Admission>,
  { readonly tag: "supported" }
>["admitted"]["facts"];

export type SpellProcedureAdmissionDeclaration<
  P extends BattleSpellProcedureKey,
  I extends SpellInvocationAdmittedByRegisteredProcedure<P>,
  Facts extends object = SpellProcedureMechanicsFacts,
  Issue extends SpellProcedureAdmissionIssue<P> =
    SpellProcedureAdmissionIssue<P>,
> = {
  readonly casterRequirements: (facts: Facts) => SpellCasterRequirements;
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
  Facts extends object = SpellProcedureMechanicsFacts,
  Issue extends SpellProcedureAdmissionIssue<P> =
    SpellProcedureAdmissionIssue<P>,
> = SpellProcedureAdmissionDeclaration<P, I, Facts, Issue> &
  SpellProcedureExecutionDeclaration<P>;

export type SynthesizedSpellProcedureDeclaration<
  P extends BattleSpellProcedureKey,
> = {
  readonly admission: "synthesized";
} & SpellProcedureExecutionDeclaration<P>;

export function spellAdmissionAttackBonus(
  ctx: SpellAdmissionContext,
): AttackBonus | null {
  if (ctx.kind === "statBlock")
    return Option.getOrNull(ctx.castingSource.spellAttackBonus);
  return ctx.actor.origin.kind === "character" &&
    ctx.actor.origin.spellcasting !== undefined
    ? attackBonus(
        Number(ctx.castingSource.abilityModifier) +
          Number(ctx.actor.origin.spellcasting.proficiencyBonus),
      )
    : null;
}

export function spellAdmissionActionCost<
  Cost extends "magicAction" | "bonusAction",
>(ctx: CharacterSpellAdmissionContext, nativeCost: Cost): Cost;
export function spellAdmissionActionCost(
  ctx: SpellAdmissionContext,
  nativeCost: "magicAction" | "bonusAction",
): "magicAction" | "bonusAction";
export function spellAdmissionActionCost(
  ctx: SpellAdmissionContext,
  nativeCost: "magicAction" | "bonusAction",
): "magicAction" | "bonusAction" {
  if (ctx.kind === "character") return nativeCost;
  return ctx.castingSource.castingTime.kind === "minutes" ||
    ctx.castingSource.castingTime.kind === "hours"
    ? "magicAction"
    : ctx.castingSource.actionCost;
}
