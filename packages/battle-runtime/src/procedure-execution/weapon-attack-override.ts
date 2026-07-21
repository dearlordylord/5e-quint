import { AbilityModifier, AttackBonus } from "@dnd/shared/types";
import type { HoleId } from "@dnd/shared-algebras/runtime-hole-algebra";
import { DamageTypeSchema, DiceExprSchema } from "@dnd/surface/surface/schema";
import { Schema } from "effect";
import { DurationBattleActiveEffectExpirationSchema } from "../active-effect/expiration-codecs.ts";
import type { BattleActiveEffectIdentity } from "../active-effect/source.ts";
import {
  BattleObjectId,
  BattleProcedureExecutionRef,
  CombatantId,
} from "../identity.ts";
import type {
  SpellWeaponAttackOverrideTemplate,
  WeaponAttackOverrideProcedureFacts,
} from "../procedure-facts/weapon-attack-override.ts";
import {
  ClassCantripSpellAccessSchema,
  NoSpellInvocationResourceSchema,
} from "./spell-invocation-codecs.ts";
import {
  SpellRuleExecutionFactsSchema,
  type SpellRuleExecutionFacts,
} from "./spell-rule-facts.ts";
import { SPELL_CAST_REACTION_FACTS_HOLE_ID } from "./spell-cast-reaction-protocol.ts";

/** Authored-identity-free facts consumed by weapon-attack-override execution. */
export type WeaponAttackOverrideSpellProcedureExecution =
  WeaponAttackOverrideProcedureFacts & {
    readonly spellRuleFacts: SpellRuleExecutionFacts;
  };

export type SpellWeaponAttackOverrideEffect =
  SpellWeaponAttackOverrideTemplate & {
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
  };

type WeaponAttackOverrideActor<ActiveEffect, SelectedLoadout> = {
  readonly origin:
    | {
        readonly kind: "character";
        readonly selectedLoadout: SelectedLoadout;
      }
    | { readonly kind: "statBlock" };
  readonly activeEffects: readonly ActiveEffect[];
};

type WeaponAttackOverrideBattleState<Actor> = {
  readonly combatants: ReadonlyMap<CombatantId, Actor>;
};

type WeaponAttackOverrideExecutableInvocation =
  WeaponAttackOverrideSpellProcedureExecution & {
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
  };

type WeaponAttackOverrideFillSet<ReactionSpellTargetFact> = {
  readonly reactionSpellTargetFacts: readonly ReactionSpellTargetFact[];
};

type WeaponAttackOverrideFill = {
  readonly kind: string;
  readonly holeId: HoleId;
};

type WeaponAttackOverrideSubject = {
  readonly tag: "bonusActionSpell";
  readonly actorId: CombatantId;
  readonly procedureRef: BattleProcedureExecutionRef;
  readonly mode: { readonly tag: "cast" };
};

type WeaponAttackOverrideDiscoveryCandidate = {
  readonly subject: WeaponAttackOverrideSubject;
  readonly initialHoles: readonly [];
};

type WeaponAttackOverrideInvalidResult<Snapshot> = {
  readonly tag: "invalid";
  readonly reason: "invalidFill" | "unsupportedSubject" | "missingCombatant";
  readonly message: string;
  readonly snapshot: Snapshot;
};

type WeaponAttackOverrideResolvedResult<State, Snapshot> = {
  readonly tag: "resolved";
  readonly state: State;
  readonly snapshot: Snapshot;
};

type WeaponAttackOverrideResourceSpendResult<State, InvalidResult> =
  | { readonly tag: "resolved"; readonly state: State }
  | InvalidResult;

type WeaponAttackOverrideSharedInvalidResult<Snapshot> = {
  readonly tag: "invalid";
  readonly reason: string;
  readonly message: string;
  readonly snapshot: Snapshot;
};

type WeaponAttackOverrideInterruptResult<State, Snapshot> = {
  readonly tag: "needsHoles";
  readonly state: State;
  readonly snapshot: Snapshot;
};

type WeaponAttackOverrideUsabilityRuntime<
  Actor,
  SelectedLoadout,
  ActiveDruidWildShape,
> = {
  readonly activeDruidWildShapeEffect: (actor: Actor) => ActiveDruidWildShape;
  readonly loadoutWeaponItemIsUsableDuringWildShape: (input: {
    readonly loadout: SelectedLoadout;
    readonly activeWildShape: ActiveDruidWildShape;
    readonly itemId: BattleObjectId;
  }) => boolean;
};

function weaponAttackOverrideWeaponIsUsable<
  ActiveEffect extends BattleActiveEffectIdentity,
  SelectedLoadout,
  Actor extends WeaponAttackOverrideActor<ActiveEffect, SelectedLoadout>,
  Invocation extends Pick<
    WeaponAttackOverrideExecutableInvocation,
    "activeEffect"
  >,
  ActiveDruidWildShape,
>(
  actor: Actor,
  invocation: Invocation,
  runtime: WeaponAttackOverrideUsabilityRuntime<
    Actor,
    SelectedLoadout,
    ActiveDruidWildShape
  >,
): boolean {
  return (
    actor.origin.kind === "character" &&
    runtime.loadoutWeaponItemIsUsableDuringWildShape({
      loadout: actor.origin.selectedLoadout,
      activeWildShape: runtime.activeDruidWildShapeEffect(actor),
      itemId: invocation.activeEffect.weaponItemId,
    })
  );
}

export function discoverWeaponAttackOverrideCastAct<
  SelectedLoadout,
  Actor extends WeaponAttackOverrideActor<
    BattleActiveEffectIdentity,
    SelectedLoadout
  >,
  State extends WeaponAttackOverrideBattleState<Actor>,
  Invocation extends WeaponAttackOverrideExecutableInvocation,
  ActiveDruidWildShape,
>(
  state: State & WeaponAttackOverrideBattleState<Actor>,
  actorId: CombatantId,
  invocation: Invocation,
  runtime: WeaponAttackOverrideUsabilityRuntime<
    Actor,
    SelectedLoadout,
    ActiveDruidWildShape
  >,
): readonly WeaponAttackOverrideDiscoveryCandidate[] {
  const actor = state.combatants.get(actorId);
  if (
    actor === undefined ||
    !weaponAttackOverrideWeaponIsUsable(actor, invocation, runtime)
  ) {
    return [];
  }
  return [
    {
      subject: {
        tag: "bonusActionSpell",
        actorId,
        procedureRef: invocation.sourceProcedureRef,
        mode: { tag: "cast" },
      },
      initialHoles: [],
    },
  ];
}

export function resolveWeaponAttackOverride<
  SelectedLoadout,
  Actor extends WeaponAttackOverrideActor<
    BattleActiveEffectIdentity,
    SelectedLoadout
  >,
  State extends WeaponAttackOverrideBattleState<Actor>,
  Invocation extends WeaponAttackOverrideExecutableInvocation,
  Fill extends WeaponAttackOverrideFill,
  ReactionSpellTargetFact,
  FillSet extends WeaponAttackOverrideFillSet<ReactionSpellTargetFact>,
  HandledInterruptTrigger,
  InterruptFrame,
  Snapshot,
  InterruptResult extends WeaponAttackOverrideInterruptResult<State, Snapshot>,
  ResourceInvalidResult extends
    WeaponAttackOverrideSharedInvalidResult<Snapshot>,
  ActiveDruidWildShape,
>(
  input: {
    readonly input: {
      readonly state: State & WeaponAttackOverrideBattleState<Actor>;
      readonly subject: WeaponAttackOverrideSubject;
      readonly fills: readonly Fill[];
      readonly handledInterruptTrigger?: HandledInterruptTrigger | undefined;
    };
    readonly actorId: CombatantId;
    readonly invocation: Invocation;
    readonly fillSet: FillSet;
  },
  runtime: {
    readonly snapshot: (state: State) => Snapshot;
    readonly activeDruidWildShapeEffect: (actor: Actor) => ActiveDruidWildShape;
    readonly loadoutWeaponItemIsUsableDuringWildShape: (input: {
      readonly loadout: SelectedLoadout;
      readonly activeWildShape: ActiveDruidWildShape;
      readonly itemId: BattleObjectId;
    }) => boolean;
    readonly spellCastInterruptFrame: (input: {
      readonly casterId: CombatantId;
      readonly invocation: Invocation;
      readonly targetIds: readonly CombatantId[];
      readonly reactionSpellTargetFacts: readonly ReactionSpellTargetFact[];
      readonly castingResource: { readonly kind: "bonusAction" };
      readonly continuation: {
        readonly kind: "replay";
        readonly subject: WeaponAttackOverrideSubject;
        readonly fills: readonly Fill[];
      };
    }) => InterruptFrame;
    readonly maybeOpenInterruptWindow: (
      state: State,
      frame: InterruptFrame,
      handledInterruptTrigger: HandledInterruptTrigger | undefined,
    ) => InterruptResult | null;
    readonly replaceActorActiveEffects: (
      state: State,
      actorId: CombatantId,
      actor: Actor,
      activeEffects: readonly (
        | Actor["activeEffects"][number]
        | SpellWeaponAttackOverrideEffect
      )[],
    ) => State;
    readonly spendSpellCastResources: (input: {
      readonly state: State;
      readonly actorId: CombatantId;
      readonly invocation: Invocation;
      readonly errorState: State;
    }) => WeaponAttackOverrideResourceSpendResult<State, ResourceInvalidResult>;
  },
):
  | WeaponAttackOverrideInvalidResult<Snapshot>
  | WeaponAttackOverrideResolvedResult<State, Snapshot>
  | ResourceInvalidResult
  | InterruptResult {
  const invalid = (
    reason: WeaponAttackOverrideInvalidResult<Snapshot>["reason"],
    message: string,
  ): WeaponAttackOverrideInvalidResult<Snapshot> => ({
    tag: "invalid",
    reason,
    message,
    snapshot: runtime.snapshot(input.input.state),
  });

  if (weaponAttackOverrideFillsHaveDisallowedFill(input.input.fills)) {
    return invalid(
      "invalidFill",
      "Weapon attack override spells do not use target, roll, damage, or save fills.",
    );
  }
  if (input.invocation.activeEffect.sourceCombatantId !== input.actorId) {
    return invalid(
      "unsupportedSubject",
      "Weapon attack override source combatant does not match the caster.",
    );
  }
  const actor = input.input.state.combatants.get(input.actorId);
  if (actor === undefined) {
    return invalid(
      "missingCombatant",
      "Weapon attack override caster is not in this battle.",
    );
  }
  if (!weaponAttackOverrideWeaponIsUsable(actor, input.invocation, runtime)) {
    return invalid(
      "unsupportedSubject",
      "Weapon attack override requires its attached weapon to remain usable.",
    );
  }
  const spellCastReactionWindow = runtime.maybeOpenInterruptWindow(
    input.input.state,
    runtime.spellCastInterruptFrame({
      casterId: input.actorId,
      invocation: input.invocation,
      targetIds: [input.actorId],
      reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
      castingResource: { kind: "bonusAction" },
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    }),
    input.input.handledInterruptTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const activeEffects = activeEffectsAfterWeaponAttackOverride(
    actor.activeEffects,
    input.invocation.sourceProcedureRef,
    input.invocation.activeEffect,
  );
  const effected = runtime.replaceActorActiveEffects(
    input.input.state,
    input.actorId,
    actor,
    activeEffects,
  );
  const resourced = runtime.spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  return resourced.tag === "invalid"
    ? resourced
    : {
        tag: "resolved",
        state: resourced.state,
        snapshot: runtime.snapshot(resourced.state),
      };
}

function weaponAttackOverrideFillsHaveDisallowedFill(
  fills: readonly WeaponAttackOverrideFill[],
): boolean {
  return fills.some(
    (fill) =>
      fill.kind !== "targetSpatialFacts" ||
      fill.holeId !== SPELL_CAST_REACTION_FACTS_HOLE_ID,
  );
}

function exactSchema<Expected>() {
  return <Encoded, Context, Actual extends Expected>(
    schema: Schema.Schema<Actual, Encoded, Context> &
      ([Expected] extends [Actual] ? unknown : never),
  ): Schema.Schema<Actual, Encoded, Context> => schema;
}

export const SpellWeaponAttackOverrideTemplateSchema =
  exactSchema<SpellWeaponAttackOverrideTemplate>()(
    Schema.Struct({
      sourceCombatantId: CombatantId,
      kind: Schema.Literal("spellWeaponAttackOverride"),
      weaponItemId: BattleObjectId,
      spellcastingAbilityModifier: AbilityModifier,
      attackBonus: AttackBonus,
      damage: Schema.Struct({ expr: DiceExprSchema }),
      damageTypeChoices: Schema.Tuple(DamageTypeSchema, DamageTypeSchema),
      expiresAt: DurationBattleActiveEffectExpirationSchema,
    }),
  );

export const WeaponAttackOverrideExecutionSchema =
  exactSchema<WeaponAttackOverrideSpellProcedureExecution>()(
    Schema.Struct({
      access: ClassCantripSpellAccessSchema,
      resource: NoSpellInvocationResourceSchema,
      procedure: Schema.Literal("weaponAttackOverride"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      actionCost: Schema.Literal("bonusAction"),
      activeEffect: SpellWeaponAttackOverrideTemplateSchema,
    }),
  );

/** Replace a prior casting by the same combatant and procedure occurrence. */
export function activeEffectsAfterWeaponAttackOverride<
  Effect extends BattleActiveEffectIdentity,
>(
  activeEffects: readonly Effect[],
  sourceProcedureRef: BattleProcedureExecutionRef,
  activeEffect: SpellWeaponAttackOverrideTemplate,
): readonly (Effect | SpellWeaponAttackOverrideEffect)[] {
  return [
    ...activeEffects.filter(
      (effect) =>
        !(
          effect.kind === "spellWeaponAttackOverride" &&
          effect.sourceProcedureRef === sourceProcedureRef &&
          effect.sourceCombatantId === activeEffect.sourceCombatantId
        ),
    ),
    { ...activeEffect, sourceProcedureRef },
  ];
}
