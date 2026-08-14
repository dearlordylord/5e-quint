import { AbilityModifier, AttackBonus } from "@dnd/shared/types";
import { DamageTypeSchema, DiceExprSchema } from "@dnd/surface/surface/schema";
import { Match, Schema } from "effect";
import { DurationBattleActiveEffectExpirationSchema } from "../active-effect/expiration-codecs.ts";
import type { BattleActiveEffectIdentity } from "../active-effect/source.ts";
import {
  HELD_WEAPON_LOADOUT_SLOTS,
  type HeldWeaponLoadoutSlot,
} from "../character-creature-execution-facts.ts";
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
  CantripSpellAccessSchema,
  NoSpellInvocationResourceSchema,
} from "./spell-invocation-codecs.ts";
import {
  SpellRuleExecutionFactsSchema,
  type SpellRuleExecutionFacts,
} from "./spell-rule-facts.ts";

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
  readonly combatantId: CombatantId;
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

type WeaponAttackOverrideFillInput<ReactionFact> = {
  readonly reactionFacts: readonly ReactionFact[];
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
  readonly reason: "unsupportedSubject" | "missingCombatant";
  readonly message: string;
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

type WeaponAttackOverrideOpenedInterruptResult<State, Snapshot> = {
  readonly tag: "needsHoles";
  readonly state: State;
  readonly subject: unknown;
  readonly snapshot: Snapshot;
  readonly holes: readonly [unknown, ...unknown[]];
};

type WeaponAttackOverrideInterruptProgress<InvalidResult, OpenedResult> =
  | {
      readonly tag: "checkpointPreparationFailed";
      readonly result: InvalidResult;
    }
  | { readonly tag: "interruptionsCleared" }
  | { readonly tag: "windowOpened"; readonly result: OpenedResult };

type WeaponAttackOverrideUsabilityRuntime<
  Actor,
  SelectedLoadout,
  ActiveDruidWildShape,
  State,
> = {
  readonly activeDruidWildShapeEffect: (actor: Actor) => ActiveDruidWildShape;
  readonly battleObjectIsOnGround: (
    state: State,
    actorId: CombatantId,
    objectId: BattleObjectId,
  ) => boolean;
  readonly loadoutHeldWeaponSlotIsUsable: (input: {
    readonly loadout: SelectedLoadout;
    readonly activeWildShape: ActiveDruidWildShape;
    readonly objectKind: HeldWeaponLoadoutSlot;
    readonly itemId: BattleObjectId;
  }) => boolean;
};

function weaponAttackOverrideWeaponIsUsable<
  ActiveEffect extends BattleActiveEffectIdentity,
  SelectedLoadout,
  Actor extends WeaponAttackOverrideActor<ActiveEffect, SelectedLoadout>,
  Invocation extends Pick<
    WeaponAttackOverrideExecutableInvocation,
    "activeEffect" | "attachedWeaponSlot"
  >,
  ActiveDruidWildShape,
  State,
>(
  state: State,
  actor: Actor,
  invocation: Invocation,
  runtime: WeaponAttackOverrideUsabilityRuntime<
    Actor,
    SelectedLoadout,
    ActiveDruidWildShape,
    State
  >,
): boolean {
  return (
    actor.origin.kind === "character" &&
    !runtime.battleObjectIsOnGround(
      state,
      actor.combatantId,
      invocation.activeEffect.weaponItemId,
    ) &&
    runtime.loadoutHeldWeaponSlotIsUsable({
      loadout: actor.origin.selectedLoadout,
      activeWildShape: runtime.activeDruidWildShapeEffect(actor),
      objectKind: invocation.attachedWeaponSlot,
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
    ActiveDruidWildShape,
    State
  >,
): readonly WeaponAttackOverrideDiscoveryCandidate[] {
  const actor = state.combatants.get(actorId);
  if (
    actor === undefined ||
    !weaponAttackOverrideWeaponIsUsable(state, actor, invocation, runtime)
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

export function weaponAttackOverrideExecutor<
  InterruptResult,
  ResourceInvalidResult,
>() {
  return function resolveWeaponAttackOverride<
    SelectedLoadout,
    Actor extends WeaponAttackOverrideActor<
      BattleActiveEffectIdentity,
      SelectedLoadout
    >,
    State extends WeaponAttackOverrideBattleState<Actor>,
    Invocation extends WeaponAttackOverrideExecutableInvocation,
    ReactionFact,
    FillInput extends WeaponAttackOverrideFillInput<ReactionFact>,
    Continuation,
    HandledInterruptTrigger,
    InterruptFrame,
    Snapshot,
    ActiveDruidWildShape,
  >(
    input: {
      readonly input: {
        readonly state: State & WeaponAttackOverrideBattleState<Actor>;
        readonly subject: WeaponAttackOverrideSubject;
        readonly handledInterruptTrigger?: HandledInterruptTrigger | undefined;
      };
      readonly invocation: Invocation;
      readonly fillInput: FillInput;
      readonly continuation: Continuation;
    },
    runtime: {
      readonly snapshot: (state: State) => Snapshot;
      readonly activeDruidWildShapeEffect: (
        actor: Actor,
      ) => ActiveDruidWildShape;
      readonly battleObjectIsOnGround: (
        state: State,
        actorId: CombatantId,
        objectId: BattleObjectId,
      ) => boolean;
      readonly loadoutHeldWeaponSlotIsUsable: (input: {
        readonly loadout: SelectedLoadout;
        readonly activeWildShape: ActiveDruidWildShape;
        readonly objectKind: HeldWeaponLoadoutSlot;
        readonly itemId: BattleObjectId;
      }) => boolean;
      readonly spellCastInterruptFrame: (input: {
        readonly casterId: CombatantId;
        readonly invocation: Invocation;
        readonly targetIds: readonly CombatantId[];
        readonly reactionSpellTargetFacts: readonly ReactionFact[];
        readonly castingResource: { readonly kind: "bonusAction" };
        readonly continuation: Continuation;
      }) => InterruptFrame;
      readonly interruptWindowProgress: (
        state: State,
        frame: InterruptFrame,
        handledInterruptTrigger: HandledInterruptTrigger | undefined,
      ) => WeaponAttackOverrideInterruptProgress<
        ResourceInvalidResult &
          WeaponAttackOverrideSharedInvalidResult<Snapshot>,
        InterruptResult &
          WeaponAttackOverrideOpenedInterruptResult<State, Snapshot>
      >;
      readonly commitWeaponAttackOverrideEffect: (plan: {
        readonly authorization: {
          readonly tag: "interruptionsCleared";
          readonly execution: {
            readonly state: State;
            readonly subject: WeaponAttackOverrideSubject;
            readonly caster: Actor;
            readonly invocation: Invocation;
            readonly continuation: Continuation;
          };
        };
        readonly activeEffects: readonly (
          | Actor["activeEffects"][number]
          | SpellWeaponAttackOverrideEffect
        )[];
      }) => State;
      readonly spendSpellCastResources: (input: {
        readonly state: State;
        readonly execution: {
          readonly subject: WeaponAttackOverrideSubject;
          readonly caster: Actor;
          readonly invocation: Invocation;
        };
        readonly errorState: State;
      }) => WeaponAttackOverrideResourceSpendResult<
        State,
        ResourceInvalidResult &
          WeaponAttackOverrideSharedInvalidResult<Snapshot>
      >;
    },
  ):
    | WeaponAttackOverrideInvalidResult<Snapshot>
    | ResourceInvalidResult
    | InterruptResult
    | {
        readonly tag: "resolved";
        readonly state: State;
        readonly snapshot: Snapshot;
      } {
    const invalid = (
      reason: WeaponAttackOverrideInvalidResult<Snapshot>["reason"],
      message: string,
    ): WeaponAttackOverrideInvalidResult<Snapshot> => ({
      tag: "invalid",
      reason,
      message,
      snapshot: runtime.snapshot(input.input.state),
    });

    if (
      input.input.subject.procedureRef !==
        input.invocation.sourceProcedureRef ||
      input.invocation.activeEffect.sourceCombatantId !==
        input.input.subject.actorId
    ) {
      return invalid(
        "unsupportedSubject",
        "Weapon attack override subject, caster, and procedure identity do not match.",
      );
    }
    const actor = input.input.state.combatants.get(input.input.subject.actorId);
    if (actor === undefined) {
      return invalid(
        "missingCombatant",
        "Weapon attack override caster is not in this battle.",
      );
    }
    if (actor.combatantId !== input.input.subject.actorId) {
      return invalid(
        "unsupportedSubject",
        "Weapon attack override caster identity does not match its battle-state key.",
      );
    }
    if (
      !weaponAttackOverrideWeaponIsUsable(
        input.input.state,
        actor,
        input.invocation,
        runtime,
      )
    ) {
      return invalid(
        "unsupportedSubject",
        "Weapon attack override requires its attached weapon to remain usable.",
      );
    }
    const execution = {
      state: input.input.state,
      subject: input.input.subject,
      caster: actor,
      invocation: input.invocation,
      continuation: input.continuation,
    };
    const interruptProgress = runtime.interruptWindowProgress(
      input.input.state,
      runtime.spellCastInterruptFrame({
        casterId: execution.caster.combatantId,
        invocation: input.invocation,
        targetIds: [execution.caster.combatantId],
        reactionSpellTargetFacts: input.fillInput.reactionFacts,
        castingResource: { kind: "bonusAction" },
        continuation: input.continuation,
      }),
      input.input.handledInterruptTrigger,
    );
    if (interruptProgress.tag === "checkpointPreparationFailed") {
      return interruptProgress.result;
    }
    if (interruptProgress.tag === "windowOpened") {
      return interruptProgress.result;
    }
    const clearedProgress = Match.value(interruptProgress).pipe(
      Match.discriminatorsExhaustive("tag")({
        interruptionsCleared: (progress) => progress,
      }),
    );
    const authorization = {
      tag: clearedProgress.tag,
      execution,
    } as const;
    const activeEffects = activeEffectsAfterWeaponAttackOverride(
      authorization.execution.caster.activeEffects,
      authorization.execution.invocation.sourceProcedureRef,
      authorization.execution.invocation.activeEffect,
    );
    const effected = runtime.commitWeaponAttackOverrideEffect({
      authorization,
      activeEffects,
    });
    const resourced = runtime.spendSpellCastResources({
      state: effected,
      execution: authorization.execution,
      errorState: authorization.execution.state,
    });
    return resourced.tag === "invalid"
      ? resourced
      : {
          tag: "resolved" as const,
          state: resourced.state,
          snapshot: runtime.snapshot(resourced.state),
        };
  };
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
      access: CantripSpellAccessSchema,
      resource: NoSpellInvocationResourceSchema,
      procedure: Schema.Literal("weaponAttackOverride"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      actionCost: Schema.Literal("bonusAction"),
      activeEffect: SpellWeaponAttackOverrideTemplateSchema,
      attachedWeaponSlot: Schema.Literal(...HELD_WEAPON_LOADOUT_SLOTS),
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
