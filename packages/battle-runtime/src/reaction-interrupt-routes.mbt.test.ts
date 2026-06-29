// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

import { describe, expect, it } from "vitest";

import {
  MBT_TEST_TIMEOUT_MS,
  decodeReducerRoute,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  quintField,
  quintStateRecord,
  quintVariantMappedValue,
  quintVariantTag,
  quintVariantValue,
  run,
  stateCheck,
  type ReducerRouteEvent,
  type ReducerRouteFill,
  type ReducerRouteHole,
  type ReducerRouteOwnerGroup,
  type ReducerRouteSubjectFamily,
} from "./battle-runtime-mbt-driver-kit.ts";

type RouteState<Surface extends string> = {
  readonly surface: Surface;
  readonly route: readonly ReducerRouteEvent[];
};

const REACTION_CASTING_TIME_ROUTE_SURFACE_BY_TAG = {
  FreshRouteSurface: "fresh",
  CounterspellEndedSpellCastRouteSurface: "counterspellEndedSpellCast",
  CounterspellAllowedSpellCastResumeRouteSurface:
    "counterspellAllowedSpellCastResume",
  HellishRebukeAfterDamageRouteSurface: "hellishRebukeAfterDamage",
} as const satisfies Readonly<Record<string, string>>;
type ReactionCastingTimeRouteSurface =
  (typeof REACTION_CASTING_TIME_ROUTE_SURFACE_BY_TAG)[keyof typeof REACTION_CASTING_TIME_ROUTE_SURFACE_BY_TAG];

const INTERRUPT_STACK_RESUME_ROUTE_SURFACE_BY_TAG = {
  FreshRouteSurface: "fresh",
  NestedDeclineResumedOuterInterruptRouteSurface:
    "nestedDeclineResumedOuterInterrupt",
  ActiveEffectMutationResumedRouteSurface: "activeEffectMutationResumed",
  ProcedureContinuationResolvedRouteSurface: "procedureContinuationResolved",
} as const satisfies Readonly<Record<string, string>>;
type InterruptStackResumeRouteSurface =
  (typeof INTERRUPT_STACK_RESUME_ROUTE_SURFACE_BY_TAG)[keyof typeof INTERRUPT_STACK_RESUME_ROUTE_SURFACE_BY_TAG];

const REACTION_INTERRUPT_PAYLOAD_ROUTE_SURFACE_BY_TAG = {
  FreshRouteSurface: "fresh",
  ReactionArmorClassEffectRouteSurface: "reactionArmorClassEffect",
  AfterDamageSaveDamageRouteSurface: "afterDamageSaveDamage",
  SpellInterruptionEndedRouteSurface: "spellInterruptionEnded",
  SpellInterruptionResumedRouteSurface: "spellInterruptionResumed",
  FallMitigationRouteSurface: "fallMitigation",
} as const satisfies Readonly<Record<string, string>>;
type ReactionInterruptPayloadRouteSurface =
  (typeof REACTION_INTERRUPT_PAYLOAD_ROUTE_SURFACE_BY_TAG)[keyof typeof REACTION_INTERRUPT_PAYLOAD_ROUTE_SURFACE_BY_TAG];

const ARMOR_CLASS_REACTION_PROJECTION_FACTS = {
  trigger: "attackHit",
  procedure: "reactionArmorClassEffect",
  continuation: "attackDamage",
  reactionResource: "spent",
  reactionSpend: { kind: "spent", slotLevel: 1 },
} as const;

const AFTER_DAMAGE_REACTION_PROJECTION_FACTS = {
  trigger: "afterDamage",
  procedure: "afterDamageSpellReaction",
  continuation: "afterDamage",
  reactionResource: "spent",
  reactionSpend: { kind: "spent", slotLevel: 2 },
} as const;

const SPELL_INTERRUPTION_REACTION_PROJECTION_FACTS = {
  trigger: "spellCast",
  procedure: "spellInterruptionReaction",
  continuation: "spellCast",
  reactionResource: "spent",
  reactionSpend: { kind: "spent", slotLevel: 3 },
} as const;

const FALL_MITIGATION_REACTION_PROJECTION_FACTS = {
  trigger: "creatureFalls",
  procedure: "fallMitigationReaction",
  continuation: "fallDamage",
  reactionResource: "spent",
  reactionSpend: { kind: "spent", slotLevel: 1 },
} as const;

type ReactionInterruptPayloadFacts =
  | {
      readonly kind: "fresh";
    }
  | (typeof ARMOR_CLASS_REACTION_PROJECTION_FACTS & {
      readonly kind: "armorClass";
      readonly armorClass: ReactionArmorClassProjection;
    })
  | (typeof AFTER_DAMAGE_REACTION_PROJECTION_FACTS & {
      readonly kind: "afterDamageSaveDamage";
      readonly saveAbility: "dexterity";
      readonly damage: ReactionRolledDamageProjection;
      readonly saveDamagePolicy: "halfDamageOnSuccess";
    })
  | (typeof SPELL_INTERRUPTION_REACTION_PROJECTION_FACTS & {
      readonly kind: "spellInterruptionEnded";
      readonly saveAbility: "constitution";
      readonly interruptedEffect: "dissipatesWithoutEffect";
      readonly interruptedSlot: "preserved";
    })
  | (typeof SPELL_INTERRUPTION_REACTION_PROJECTION_FACTS & {
      readonly kind: "spellInterruptionResumed";
      readonly saveAbility: "constitution";
      readonly interruptedEffect: "resumesAfterReaction";
      readonly interruptedSlot: InterruptedSpellSlotSpentOnResume;
    })
  | (typeof FALL_MITIGATION_REACTION_PROJECTION_FACTS & {
      readonly kind: "fallMitigation";
    });
type ReactionArmorClassProjection = {
  readonly kind: "bonusUntilReactorNextTurnStart";
  readonly bonus: number;
};
type ReactionRolledDamageProjection = {
  readonly kind: "rolledDamage";
  readonly diceCount: number;
  readonly dieFaces: number;
  readonly damageType: "fire";
};
type InterruptedSpellSlotSpentOnResume = {
  readonly kind: "spentOnResume";
  readonly slotLevel: number;
};
type ReactionInterruptPayloadRouteState =
  RouteState<ReactionInterruptPayloadRouteSurface> & {
    readonly facts: ReactionInterruptPayloadFacts;
  };

const reactionCastingTimeRouteDriverSchema = {
  init: {},
  doCounterspellEndsSpellCast: {},
  doCounterspellAllowsSpellCastResume: {},
  doHellishRebukeAfterDamage: {},
  step: {},
} as const;

const interruptStackResumeRouteDriverSchema = {
  init: {},
  doNestedDeclineResumesOuterInterrupt: {},
  doShieldMutationResumesInterruptedAttack: {},
  doReplayRecordedProcedureFromRoot: {},
  step: {},
} as const;

const reactionInterruptPayloadRouteDriverSchema = {
  init: {},
  doRouteReactionArmorClassEffect: {},
  doRouteAfterDamageSaveDamage: {},
  doRouteSpellInterruptionEnded: {},
  doRouteSpellInterruptionResumed: {},
  doRouteFallMitigation: {},
  step: {},
} as const;

type ReactionCastingTimeRouteDriverAction = Exclude<
  keyof typeof reactionCastingTimeRouteDriverSchema,
  "init" | "step"
>;
type InterruptStackResumeRouteDriverAction = Exclude<
  keyof typeof interruptStackResumeRouteDriverSchema,
  "init" | "step"
>;
type ReactionInterruptPayloadRouteDriverAction = Exclude<
  keyof typeof reactionInterruptPayloadRouteDriverSchema,
  "init" | "step"
>;
type RouteReplaySequence<Surface extends string, Action extends string> = {
  readonly name: string;
  readonly action: Action;
  readonly expected: RouteState<Surface>;
};

const ROUTE_START_OWNER =
  "battleActionEconomy" satisfies ReducerRouteOwnerGroup;
const REACTION_SPELL_ROUTE_SUBJECT =
  "reactionSpell" satisfies ReducerRouteSubjectFamily;
const REACTION_ARMOR_CLASS_EFFECT_ROUTE_SUBJECT =
  "reactionArmorClassEffect" satisfies ReducerRouteSubjectFamily;
const REACTION_AFTER_DAMAGE_EFFECT_ROUTE_SUBJECT =
  "reactionAfterDamageEffect" satisfies ReducerRouteSubjectFamily;
const REACTION_SPELL_INTERRUPTION_ROUTE_SUBJECT =
  "reactionSpellInterruption" satisfies ReducerRouteSubjectFamily;
const REACTION_FALL_MITIGATION_ROUTE_SUBJECT =
  "reactionFallMitigation" satisfies ReducerRouteSubjectFamily;
const INTERRUPT_STACK_RESUME_ROUTE_SUBJECT =
  "interruptStackResume" satisfies ReducerRouteSubjectFamily;
const SLOT_SPELL_ROUTE_SUBJECT =
  "slotSpell" satisfies ReducerRouteSubjectFamily;
const SAVE_GATED_SPELL_ROUTE_SUBJECT =
  "saveGatedSpell" satisfies ReducerRouteSubjectFamily;
const WEAPON_ATTACK_ROUTE_SUBJECT =
  "weaponAttack" satisfies ReducerRouteSubjectFamily;

function routeState<const Surface extends string>(
  surface: Surface,
  route: readonly ReducerRouteEvent[],
): RouteState<Surface> {
  return { surface, route };
}

function routeHoles(
  ...values: ReducerRouteHole[]
): readonly ReducerRouteHole[] {
  return [...values].sort();
}

function routeDriverActionSet(
  schema: Readonly<Record<string, unknown>>,
): ReadonlySet<string> {
  return new Set(
    Object.keys(schema).filter(
      (action) => action !== "init" && action !== "step",
    ),
  );
}

function startRoute(): ReducerRouteEvent {
  return { kind: "startBattle", owner: ROUTE_START_OWNER };
}

function discoverRoute(input: {
  readonly subject: ReducerRouteSubjectFamily;
  readonly holes: readonly ReducerRouteHole[];
  readonly owner: ReducerRouteOwnerGroup;
}): ReducerRouteEvent {
  return {
    kind: "discoverBattleActs",
    subject: input.subject,
    holes: [...input.holes].sort(),
    owner: input.owner,
  };
}

function resolveRoute(input: {
  readonly subject: ReducerRouteSubjectFamily;
  readonly fill: ReducerRouteFill;
  readonly holes: readonly ReducerRouteHole[];
  readonly owner: ReducerRouteOwnerGroup;
}): ReducerRouteEvent {
  return {
    kind: "resolveBattleSubject",
    subject: input.subject,
    fill: input.fill,
    holes: [...input.holes].sort(),
    owner: input.owner,
  };
}

function resolveRouteWithoutFill(input: {
  readonly subject: ReducerRouteSubjectFamily;
  readonly holes: readonly ReducerRouteHole[];
  readonly owner: ReducerRouteOwnerGroup;
}): ReducerRouteEvent {
  return {
    kind: "resolveBattleSubjectWithoutFill",
    subject: input.subject,
    holes: [...input.holes].sort(),
    owner: input.owner,
  };
}

function resolveInterruptRoute(input: {
  readonly subject: ReducerRouteSubjectFamily;
  readonly fill: ReducerRouteFill;
  readonly holes: readonly ReducerRouteHole[];
  readonly owner: ReducerRouteOwnerGroup;
}): ReducerRouteEvent {
  return {
    kind: "resolveBattleInterrupt",
    subject: input.subject,
    fill: input.fill,
    holes: [...input.holes].sort(),
    owner: input.owner,
  };
}

function reactionSpellDiscover(
  holes: readonly ReducerRouteHole[],
  owner: ReducerRouteOwnerGroup,
): ReducerRouteEvent {
  return discoverRoute({
    subject: REACTION_SPELL_ROUTE_SUBJECT,
    holes,
    owner,
  });
}

function slotSpellResolve(
  fill: ReducerRouteFill,
  holes: readonly ReducerRouteHole[],
  owner: ReducerRouteOwnerGroup,
): ReducerRouteEvent {
  return resolveRoute({
    subject: SLOT_SPELL_ROUTE_SUBJECT,
    fill,
    holes,
    owner,
  });
}

function reactionSpellInterrupt(
  holes: readonly ReducerRouteHole[],
  owner: ReducerRouteOwnerGroup,
): ReducerRouteEvent {
  return resolveInterruptRoute({
    subject: REACTION_SPELL_ROUTE_SUBJECT,
    fill: "interruptDecision",
    holes,
    owner,
  });
}

function pendingReactionDecisionRoute(): readonly ReducerRouteEvent[] {
  return [
    startRoute(),
    reactionSpellDiscover(
      routeHoles("interruptDecision"),
      "battleInterruptStack",
    ),
  ];
}

function counterspellEndedSpellCastRouteState(): RouteState<"counterspellEndedSpellCast"> {
  return routeState("counterspellEndedSpellCast", [
    ...pendingReactionDecisionRoute(),
    reactionSpellInterrupt(routeHoles(), "battleInterruptStack"),
    reactionSpellInterrupt(routeHoles(), "battleSpellSlotAndActionEconomy"),
  ]);
}

function counterspellAllowedSpellCastResumeRouteState(): RouteState<"counterspellAllowedSpellCastResume"> {
  return routeState("counterspellAllowedSpellCastResume", [
    ...pendingReactionDecisionRoute(),
    reactionSpellInterrupt(routeHoles("rolledDice"), "battleInterruptStack"),
    reactionSpellInterrupt(
      routeHoles("rolledDice"),
      "battleSpellSlotAndActionEconomy",
    ),
    slotSpellResolve("rolledDice", routeHoles(), "battleHitPoint"),
    slotSpellResolve(
      "rolledDice",
      routeHoles(),
      "battleSpellSlotAndActionEconomy",
    ),
  ]);
}

function hellishRebukeAfterDamageRouteState(): RouteState<"hellishRebukeAfterDamage"> {
  return routeState("hellishRebukeAfterDamage", [
    ...pendingReactionDecisionRoute(),
    reactionSpellInterrupt(routeHoles(), "battleInterruptStack"),
    reactionSpellInterrupt(routeHoles(), "battleSpellSlotAndActionEconomy"),
    reactionSpellInterrupt(routeHoles(), "battleHitPoint"),
  ]);
}

function createReactionCastingTimeRouteDriver() {
  return defineDriver(reactionCastingTimeRouteDriverSchema, () => {
    let state = routeState<ReactionCastingTimeRouteSurface>("fresh", [
      startRoute(),
    ]);
    const reset = (): void => {
      state = routeState("fresh", [startRoute()]);
    };

    return {
      init: reset,
      doCounterspellEndsSpellCast: () => {
        state = counterspellEndedSpellCastRouteState();
      },
      doCounterspellAllowsSpellCastResume: () => {
        state = counterspellAllowedSpellCastResumeRouteState();
      },
      doHellishRebukeAfterDamage: () => {
        state = hellishRebukeAfterDamageRouteState();
      },
      step: () => {},
      getState: () => state,
    };
  });
}

function interruptResumeDiscover(
  holes: readonly ReducerRouteHole[],
  owner: ReducerRouteOwnerGroup,
): ReducerRouteEvent {
  return discoverRoute({
    subject: INTERRUPT_STACK_RESUME_ROUTE_SUBJECT,
    holes,
    owner,
  });
}

function saveGatedSpellResolve(
  fill: ReducerRouteFill,
  holes: readonly ReducerRouteHole[],
  owner: ReducerRouteOwnerGroup,
): ReducerRouteEvent {
  return resolveRoute({
    subject: SAVE_GATED_SPELL_ROUTE_SUBJECT,
    fill,
    holes,
    owner,
  });
}

function weaponAttackResolve(
  fill: ReducerRouteFill,
  holes: readonly ReducerRouteHole[],
  owner: ReducerRouteOwnerGroup,
): ReducerRouteEvent {
  return resolveRoute({
    subject: WEAPON_ATTACK_ROUTE_SUBJECT,
    fill,
    holes,
    owner,
  });
}

function interruptResumeResolveWithoutFill(
  holes: readonly ReducerRouteHole[],
  owner: ReducerRouteOwnerGroup,
): ReducerRouteEvent {
  return resolveRouteWithoutFill({
    subject: INTERRUPT_STACK_RESUME_ROUTE_SUBJECT,
    holes,
    owner,
  });
}

function interruptResumeDecision(
  holes: readonly ReducerRouteHole[],
  owner: ReducerRouteOwnerGroup,
): ReducerRouteEvent {
  return resolveInterruptRoute({
    subject: INTERRUPT_STACK_RESUME_ROUTE_SUBJECT,
    fill: "interruptDecision",
    holes,
    owner,
  });
}

function pendingInterruptDecisionRoute(): readonly ReducerRouteEvent[] {
  return [
    startRoute(),
    interruptResumeDiscover(
      routeHoles("interruptDecision"),
      "battleInterruptStack",
    ),
  ];
}

function pendingDamageContinuationRoute(): readonly ReducerRouteEvent[] {
  return [
    startRoute(),
    interruptResumeDiscover(routeHoles("rolledDice"), "battleInterruptStack"),
  ];
}

function nestedDeclineResumedOuterInterruptRouteState(): RouteState<"nestedDeclineResumedOuterInterrupt"> {
  return routeState("nestedDeclineResumedOuterInterrupt", [
    ...pendingInterruptDecisionRoute(),
    interruptResumeDecision(
      routeHoles("savingThrowOutcome"),
      "battleInterruptStack",
    ),
    saveGatedSpellResolve(
      "savingThrowOutcome",
      routeHoles("interruptDecision"),
      "battleInterruptStack",
    ),
    interruptResumeDecision(routeHoles("rolledDice"), "battleInterruptStack"),
  ]);
}

function activeEffectMutationResumedRouteState(): RouteState<"activeEffectMutationResumed"> {
  return routeState("activeEffectMutationResumed", [
    ...pendingInterruptDecisionRoute(),
    interruptResumeDecision(routeHoles(), "battleSpellSlotAndActionEconomy"),
    interruptResumeDecision(routeHoles(), "battleActiveEffect"),
    interruptResumeDecision(routeHoles(), "battleInterruptStack"),
  ]);
}

function procedureContinuationResolvedRouteState(): RouteState<"procedureContinuationResolved"> {
  return routeState("procedureContinuationResolved", [
    ...pendingDamageContinuationRoute(),
    weaponAttackResolve("rolledDice", routeHoles(), "battleHitPoint"),
    interruptResumeResolveWithoutFill(routeHoles(), "battleInterruptStack"),
  ]);
}

function createInterruptStackResumeRouteDriver() {
  return defineDriver(interruptStackResumeRouteDriverSchema, () => {
    let state = routeState<InterruptStackResumeRouteSurface>("fresh", [
      startRoute(),
    ]);
    const reset = (): void => {
      state = routeState("fresh", [startRoute()]);
    };

    return {
      init: reset,
      doNestedDeclineResumesOuterInterrupt: () => {
        state = nestedDeclineResumedOuterInterruptRouteState();
      },
      doShieldMutationResumesInterruptedAttack: () => {
        state = activeEffectMutationResumedRouteState();
      },
      doReplayRecordedProcedureFromRoot: () => {
        state = procedureContinuationResolvedRouteState();
      },
      step: () => {},
      getState: () => state,
    };
  });
}

function payloadRouteState(
  surface: ReactionInterruptPayloadRouteSurface,
  facts: ReactionInterruptPayloadFacts,
  route: readonly ReducerRouteEvent[],
): ReactionInterruptPayloadRouteState {
  return { surface, facts, route };
}

const freshPayloadFacts = {
  kind: "fresh",
} as const satisfies ReactionInterruptPayloadFacts;
const armorClassPayloadFacts = {
  kind: "armorClass",
  ...ARMOR_CLASS_REACTION_PROJECTION_FACTS,
  armorClass: { kind: "bonusUntilReactorNextTurnStart", bonus: 5 },
} as const satisfies ReactionInterruptPayloadFacts;
const afterDamagePayloadFacts = {
  kind: "afterDamageSaveDamage",
  ...AFTER_DAMAGE_REACTION_PROJECTION_FACTS,
  saveAbility: "dexterity",
  damage: {
    kind: "rolledDamage",
    diceCount: 3,
    dieFaces: 10,
    damageType: "fire",
  },
  saveDamagePolicy: "halfDamageOnSuccess",
} as const satisfies ReactionInterruptPayloadFacts;
const spellInterruptionEndedPayloadFacts = {
  kind: "spellInterruptionEnded",
  ...SPELL_INTERRUPTION_REACTION_PROJECTION_FACTS,
  saveAbility: "constitution",
  interruptedEffect: "dissipatesWithoutEffect",
  interruptedSlot: "preserved",
} as const satisfies ReactionInterruptPayloadFacts;
const spellInterruptionResumedPayloadFacts = {
  kind: "spellInterruptionResumed",
  ...SPELL_INTERRUPTION_REACTION_PROJECTION_FACTS,
  saveAbility: "constitution",
  interruptedEffect: "resumesAfterReaction",
  interruptedSlot: { kind: "spentOnResume", slotLevel: 1 },
} as const satisfies ReactionInterruptPayloadFacts;
const fallMitigationPayloadFacts = {
  kind: "fallMitigation",
  ...FALL_MITIGATION_REACTION_PROJECTION_FACTS,
} as const satisfies ReactionInterruptPayloadFacts;

function reactionPayloadDiscover(
  subject: ReducerRouteSubjectFamily,
  holes: readonly ReducerRouteHole[],
): ReducerRouteEvent {
  return discoverRoute({
    subject,
    holes,
    owner: "battleInterruptStack",
  });
}

function reactionPayloadInterrupt(input: {
  readonly subject: ReducerRouteSubjectFamily;
  readonly fill: ReducerRouteFill;
  readonly holes: readonly ReducerRouteHole[];
  readonly owner: ReducerRouteOwnerGroup;
}): ReducerRouteEvent {
  return resolveInterruptRoute(input);
}

function reactionPayloadResolve(input: {
  readonly subject: ReducerRouteSubjectFamily;
  readonly fill: ReducerRouteFill;
  readonly holes: readonly ReducerRouteHole[];
  readonly owner: ReducerRouteOwnerGroup;
}): ReducerRouteEvent {
  return resolveRoute(input);
}

function reactionPayloadResolveWithoutFill(input: {
  readonly subject: ReducerRouteSubjectFamily;
  readonly holes: readonly ReducerRouteHole[];
  readonly owner: ReducerRouteOwnerGroup;
}): ReducerRouteEvent {
  return resolveRouteWithoutFill(input);
}

function pendingReactionPayloadRoute(
  subject: ReducerRouteSubjectFamily,
  holes: readonly ReducerRouteHole[],
): readonly ReducerRouteEvent[] {
  return [startRoute(), reactionPayloadDiscover(subject, holes)];
}

function reactionArmorClassEffectRouteState(): ReactionInterruptPayloadRouteState {
  return payloadRouteState("reactionArmorClassEffect", armorClassPayloadFacts, [
    ...pendingReactionPayloadRoute(
      REACTION_ARMOR_CLASS_EFFECT_ROUTE_SUBJECT,
      routeHoles("interruptDecision"),
    ),
    reactionPayloadInterrupt({
      subject: REACTION_ARMOR_CLASS_EFFECT_ROUTE_SUBJECT,
      fill: "interruptDecision",
      holes: routeHoles(),
      owner: "battleSpellSlotAndActionEconomy",
    }),
    reactionPayloadInterrupt({
      subject: REACTION_ARMOR_CLASS_EFFECT_ROUTE_SUBJECT,
      fill: "interruptDecision",
      holes: routeHoles(),
      owner: "battleActiveEffect",
    }),
    reactionPayloadResolveWithoutFill({
      subject: REACTION_ARMOR_CLASS_EFFECT_ROUTE_SUBJECT,
      holes: routeHoles(),
      owner: "battleArmorClass",
    }),
    reactionPayloadResolveWithoutFill({
      subject: REACTION_ARMOR_CLASS_EFFECT_ROUTE_SUBJECT,
      holes: routeHoles(),
      owner: "battleInterruptStack",
    }),
  ]);
}

function afterDamageSaveDamageRouteState(): ReactionInterruptPayloadRouteState {
  return payloadRouteState("afterDamageSaveDamage", afterDamagePayloadFacts, [
    ...pendingReactionPayloadRoute(
      REACTION_AFTER_DAMAGE_EFFECT_ROUTE_SUBJECT,
      routeHoles("interruptDecision"),
    ),
    reactionPayloadInterrupt({
      subject: REACTION_AFTER_DAMAGE_EFFECT_ROUTE_SUBJECT,
      fill: "interruptDecision",
      holes: routeHoles("rolledDice", "savingThrowOutcome"),
      owner: "battleInterruptStack",
    }),
    reactionPayloadResolve({
      subject: REACTION_AFTER_DAMAGE_EFFECT_ROUTE_SUBJECT,
      fill: "savingThrowOutcome",
      holes: routeHoles("rolledDice"),
      owner: "battleSavingThrowOutcome",
    }),
    reactionPayloadResolve({
      subject: REACTION_AFTER_DAMAGE_EFFECT_ROUTE_SUBJECT,
      fill: "rolledDice",
      holes: routeHoles(),
      owner: "battleHitPoint",
    }),
    reactionPayloadResolveWithoutFill({
      subject: REACTION_AFTER_DAMAGE_EFFECT_ROUTE_SUBJECT,
      holes: routeHoles(),
      owner: "battleSpellSlotAndActionEconomy",
    }),
  ]);
}

function spellInterruptionEndedRouteState(): ReactionInterruptPayloadRouteState {
  return payloadRouteState(
    "spellInterruptionEnded",
    spellInterruptionEndedPayloadFacts,
    [
      ...pendingReactionPayloadRoute(
        REACTION_SPELL_INTERRUPTION_ROUTE_SUBJECT,
        routeHoles("interruptDecision"),
      ),
      reactionPayloadInterrupt({
        subject: REACTION_SPELL_INTERRUPTION_ROUTE_SUBJECT,
        fill: "interruptDecision",
        holes: routeHoles("savingThrowOutcome"),
        owner: "battleInterruptStack",
      }),
      reactionPayloadResolve({
        subject: REACTION_SPELL_INTERRUPTION_ROUTE_SUBJECT,
        fill: "savingThrowOutcome",
        holes: routeHoles(),
        owner: "battleSpellSlotAndActionEconomy",
      }),
      reactionPayloadResolveWithoutFill({
        subject: REACTION_SPELL_INTERRUPTION_ROUTE_SUBJECT,
        holes: routeHoles(),
        owner: "battleInterruptStack",
      }),
    ],
  );
}

function spellInterruptionResumedRouteState(): ReactionInterruptPayloadRouteState {
  return payloadRouteState(
    "spellInterruptionResumed",
    spellInterruptionResumedPayloadFacts,
    [
      ...pendingReactionPayloadRoute(
        REACTION_SPELL_INTERRUPTION_ROUTE_SUBJECT,
        routeHoles("interruptDecision"),
      ),
      reactionPayloadInterrupt({
        subject: REACTION_SPELL_INTERRUPTION_ROUTE_SUBJECT,
        fill: "interruptDecision",
        holes: routeHoles("savingThrowOutcome"),
        owner: "battleInterruptStack",
      }),
      reactionPayloadResolve({
        subject: REACTION_SPELL_INTERRUPTION_ROUTE_SUBJECT,
        fill: "savingThrowOutcome",
        holes: routeHoles("rolledDice"),
        owner: "battleSpellSlotAndActionEconomy",
      }),
      reactionPayloadResolve({
        subject: SLOT_SPELL_ROUTE_SUBJECT,
        fill: "rolledDice",
        holes: routeHoles(),
        owner: "battleHitPoint",
      }),
      reactionPayloadResolveWithoutFill({
        subject: REACTION_SPELL_INTERRUPTION_ROUTE_SUBJECT,
        holes: routeHoles(),
        owner: "battleInterruptStack",
      }),
    ],
  );
}

function fallMitigationRouteState(): ReactionInterruptPayloadRouteState {
  return payloadRouteState("fallMitigation", fallMitigationPayloadFacts, [
    ...pendingReactionPayloadRoute(
      REACTION_FALL_MITIGATION_ROUTE_SUBJECT,
      routeHoles("interruptDecision"),
    ),
    reactionPayloadInterrupt({
      subject: REACTION_FALL_MITIGATION_ROUTE_SUBJECT,
      fill: "interruptDecision",
      holes: routeHoles(),
      owner: "battleSpellSlotAndActionEconomy",
    }),
    reactionPayloadResolveWithoutFill({
      subject: REACTION_FALL_MITIGATION_ROUTE_SUBJECT,
      holes: routeHoles(),
      owner: "battleActiveEffect",
    }),
    reactionPayloadResolveWithoutFill({
      subject: REACTION_FALL_MITIGATION_ROUTE_SUBJECT,
      holes: routeHoles(),
      owner: "battleMovementResource",
    }),
    reactionPayloadResolveWithoutFill({
      subject: REACTION_FALL_MITIGATION_ROUTE_SUBJECT,
      holes: routeHoles(),
      owner: "battleHitPoint",
    }),
  ]);
}

function createReactionInterruptPayloadRouteDriver() {
  return defineDriver(reactionInterruptPayloadRouteDriverSchema, () => {
    let state: ReactionInterruptPayloadRouteState = payloadRouteState(
      "fresh",
      freshPayloadFacts,
      [startRoute()],
    );
    const reset = (): void => {
      state = payloadRouteState("fresh", freshPayloadFacts, [startRoute()]);
    };

    return {
      init: reset,
      doRouteReactionArmorClassEffect: () => {
        state = reactionArmorClassEffectRouteState();
      },
      doRouteAfterDamageSaveDamage: () => {
        state = afterDamageSaveDamageRouteState();
      },
      doRouteSpellInterruptionEnded: () => {
        state = spellInterruptionEndedRouteState();
      },
      doRouteSpellInterruptionResumed: () => {
        state = spellInterruptionResumedRouteState();
      },
      doRouteFallMitigation: () => {
        state = fallMitigationRouteState();
      },
      step: () => {},
      getState: () => state,
    };
  });
}

const reactionCastingTimeRouteStateCheck = stateCheck(
  (raw: unknown) =>
    normalizeRouteQuintState(
      raw,
      REACTION_CASTING_TIME_ROUTE_SURFACE_BY_TAG,
      "Reaction casting time route surface",
    ),
  compareRouteStates,
);

const interruptStackResumeRouteStateCheck = stateCheck(
  (raw: unknown) =>
    normalizeRouteQuintState(
      raw,
      INTERRUPT_STACK_RESUME_ROUTE_SURFACE_BY_TAG,
      "interrupt stack resume route surface",
    ),
  compareRouteStates,
);

const reactionInterruptPayloadRouteStateCheck = stateCheck(
  normalizeReactionInterruptPayloadRouteQuintState,
  compareRouteStates,
);

const reactionRouteReplaySequences = [
  {
    name: "counterspell-ends-spell-cast",
    action: "doCounterspellEndsSpellCast",
    expected: counterspellEndedSpellCastRouteState(),
  },
  {
    name: "counterspell-allows-spell-cast-resume",
    action: "doCounterspellAllowsSpellCastResume",
    expected: counterspellAllowedSpellCastResumeRouteState(),
  },
  {
    name: "hellish-rebuke-after-damage",
    action: "doHellishRebukeAfterDamage",
    expected: hellishRebukeAfterDamageRouteState(),
  },
] as const satisfies ReadonlyArray<
  RouteReplaySequence<
    ReactionCastingTimeRouteSurface,
    ReactionCastingTimeRouteDriverAction
  >
>;

const interruptRouteReplaySequences = [
  {
    name: "nested-decline-resumes-outer-interrupt",
    action: "doNestedDeclineResumesOuterInterrupt",
    expected: nestedDeclineResumedOuterInterruptRouteState(),
  },
  {
    name: "shield-mutation-resumes-interrupted-attack",
    action: "doShieldMutationResumesInterruptedAttack",
    expected: activeEffectMutationResumedRouteState(),
  },
  {
    name: "replay-recorded-procedure-from-root",
    action: "doReplayRecordedProcedureFromRoot",
    expected: procedureContinuationResolvedRouteState(),
  },
] as const satisfies ReadonlyArray<
  RouteReplaySequence<
    InterruptStackResumeRouteSurface,
    InterruptStackResumeRouteDriverAction
  >
>;

const reactionPayloadRouteReplaySequences = [
  {
    name: "reaction-armor-class-effect",
    action: "doRouteReactionArmorClassEffect",
    expected: reactionArmorClassEffectRouteState(),
  },
  {
    name: "after-damage-save-damage",
    action: "doRouteAfterDamageSaveDamage",
    expected: afterDamageSaveDamageRouteState(),
  },
  {
    name: "spell-interruption-ended",
    action: "doRouteSpellInterruptionEnded",
    expected: spellInterruptionEndedRouteState(),
  },
  {
    name: "spell-interruption-resumed",
    action: "doRouteSpellInterruptionResumed",
    expected: spellInterruptionResumedRouteState(),
  },
  {
    name: "fall-mitigation",
    action: "doRouteFallMitigation",
    expected: fallMitigationRouteState(),
  },
] as const satisfies ReadonlyArray<{
  readonly name: string;
  readonly action: ReactionInterruptPayloadRouteDriverAction;
  readonly expected: ReactionInterruptPayloadRouteState;
}>;

describe("reaction and interrupt reducer route connectors", () => {
  it("replays every focused Reaction casting route path deterministically", async () => {
    const replayedActions = new Set<ReactionCastingTimeRouteDriverAction>();

    for (const sequence of reactionRouteReplaySequences) {
      const driver = createReactionCastingTimeRouteDriver()();
      replayedActions.add(sequence.action);
      const action = driver.actions[sequence.action];
      if (action === undefined) {
        throw new Error(
          `Missing Reaction route driver action ${sequence.action}.`,
        );
      }
      await action.handler({});
      const route = driver.getState?.();
      if (route === undefined) {
        throw new Error("Reaction route driver must expose getState.");
      }
      expect(route, sequence.name).toEqual(sequence.expected);
    }

    expect(replayedActions).toEqual(
      routeDriverActionSet(reactionCastingTimeRouteDriverSchema),
    );
  });

  it(
    "routes Reaction casting time through explicit battle owners",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-reaction-casting-time.route.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createReactionCastingTimeRouteDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(1),
        stateCheck: reactionCastingTimeRouteStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it("replays every focused interrupt-stack route path deterministically", async () => {
    const replayedActions = new Set<InterruptStackResumeRouteDriverAction>();

    for (const sequence of interruptRouteReplaySequences) {
      const driver = createInterruptStackResumeRouteDriver()();
      replayedActions.add(sequence.action);
      const action = driver.actions[sequence.action];
      if (action === undefined) {
        throw new Error(
          `Missing interrupt-stack route driver action ${sequence.action}.`,
        );
      }
      await action.handler({});
      const route = driver.getState?.();
      if (route === undefined) {
        throw new Error("Interrupt-stack route driver must expose getState.");
      }
      expect(route, sequence.name).toEqual(sequence.expected);
    }

    expect(replayedActions).toEqual(
      routeDriverActionSet(interruptStackResumeRouteDriverSchema),
    );
  });

  it(
    "routes interrupt stack resume through explicit battle owners",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-interrupt-stack-resume.route.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createInterruptStackResumeRouteDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(1),
        stateCheck: interruptStackResumeRouteStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it("replays every focused reaction payload taxonomy path deterministically", async () => {
    const replayedActions =
      new Set<ReactionInterruptPayloadRouteDriverAction>();

    for (const sequence of reactionPayloadRouteReplaySequences) {
      const driver = createReactionInterruptPayloadRouteDriver()();
      replayedActions.add(sequence.action);
      const action = driver.actions[sequence.action];
      if (action === undefined) {
        throw new Error(
          `Missing reaction payload route driver action ${sequence.action}.`,
        );
      }
      await action.handler({});
      const route = driver.getState?.();
      if (route === undefined) {
        throw new Error("Reaction payload route driver must expose getState.");
      }
      expect(route, sequence.name).toEqual(sequence.expected);
    }

    expect(replayedActions).toEqual(
      routeDriverActionSet(reactionInterruptPayloadRouteDriverSchema),
    );
  });

  it(
    "routes reaction payload taxonomy through generic trigger families and owners",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-reaction-interrupt-payload-taxonomy.route.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createReactionInterruptPayloadRouteDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(1),
        stateCheck: reactionInterruptPayloadRouteStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function normalizeRouteQuintState<
  const SurfaceByTag extends Readonly<Record<string, string>>,
>(
  raw: unknown,
  surfaceByTag: SurfaceByTag,
  label: string,
): RouteState<SurfaceByTag[keyof SurfaceByTag]> {
  const state = quintStateRecord(raw);
  return {
    surface: quintVariantMappedValue(
      quintField(state, "qSurface"),
      "qSurface",
      surfaceByTag,
      label,
    ),
    route: decodeReducerRoute(quintField(state, "qRoute")),
  };
}

function compareRouteStates<Surface extends string>(
  spec: RouteState<Surface>,
  impl: RouteState<Surface>,
): boolean {
  try {
    expect(impl).toEqual(spec);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `${error.message}\nspec=${JSON.stringify(spec)}\nimpl=${JSON.stringify(impl)}`,
      );
    }
    throw error;
  }
  return true;
}

function normalizeReactionInterruptPayloadRouteQuintState(
  raw: unknown,
): ReactionInterruptPayloadRouteState {
  const state = quintStateRecord(raw);
  return {
    surface: quintVariantMappedValue(
      quintField(state, "qSurface"),
      "qSurface",
      REACTION_INTERRUPT_PAYLOAD_ROUTE_SURFACE_BY_TAG,
      "reaction payload route surface",
    ),
    facts: decodeReactionInterruptPayloadFacts(quintField(state, "qFacts")),
    route: decodeReducerRoute(quintField(state, "qRoute")),
  };
}

function decodeReactionInterruptPayloadFacts(
  raw: unknown,
): ReactionInterruptPayloadFacts {
  const tag = quintVariantTag(raw, "qFacts");
  if (tag === "FreshReactionProjectionFacts") {
    return { kind: "fresh" };
  }
  if (tag === "ReactionArmorClassProjectionFacts") {
    const payload = quintVariantRecordValue(raw, tag, "qFacts");
    return {
      kind: "armorClass",
      ...ARMOR_CLASS_REACTION_PROJECTION_FACTS,
      armorClass: decodeReactionArmorClassProjection(
        quintField(payload, "armorClass"),
      ),
    };
  }
  if (tag === "AfterDamageSaveDamageProjectionFacts") {
    const payload = quintVariantRecordValue(raw, tag, "qFacts");
    return {
      kind: "afterDamageSaveDamage",
      ...AFTER_DAMAGE_REACTION_PROJECTION_FACTS,
      saveAbility: decodeReactionSaveAbility(
        quintField(payload, "saveAbility"),
      ),
      damage: decodeReactionDamageProjection(quintField(payload, "damage")),
      saveDamagePolicy: decodeReactionSaveDamagePolicy(
        quintField(payload, "saveDamagePolicy"),
      ),
    };
  }
  if (tag === "SpellInterruptionEndedProjectionFacts") {
    const payload = quintVariantRecordValue(raw, tag, "qFacts");
    return {
      kind: "spellInterruptionEnded",
      ...SPELL_INTERRUPTION_REACTION_PROJECTION_FACTS,
      saveAbility: decodeReactionConstitutionSaveAbility(
        quintField(payload, "saveAbility"),
      ),
      interruptedEffect: decodeInterruptedSpellDissipates(
        quintField(payload, "interruptedEffect"),
      ),
      interruptedSlot: decodeInterruptedSpellPreservedSlot(
        quintField(payload, "interruptedSlot"),
      ),
    };
  }
  if (tag === "SpellInterruptionResumedProjectionFacts") {
    const payload = quintVariantRecordValue(raw, tag, "qFacts");
    return {
      kind: "spellInterruptionResumed",
      ...SPELL_INTERRUPTION_REACTION_PROJECTION_FACTS,
      saveAbility: decodeReactionConstitutionSaveAbility(
        quintField(payload, "saveAbility"),
      ),
      interruptedEffect: decodeInterruptedSpellResumes(
        quintField(payload, "interruptedEffect"),
      ),
      interruptedSlot: decodeInterruptedSpellSpentSlotOnResume(
        quintField(payload, "interruptedSlot"),
      ),
    };
  }
  if (tag === "FallMitigationProjectionFacts") {
    return {
      kind: "fallMitigation",
      ...FALL_MITIGATION_REACTION_PROJECTION_FACTS,
    };
  }

  throw new Error(`Unknown reaction projection facts tag: ${tag}.`);
}

function quintVariantRecordValue(
  raw: unknown,
  tag: string,
  field: string,
): Readonly<Record<string, unknown>> {
  const value = quintVariantValue(raw, tag, field);
  if (isReadonlyRecord(value)) {
    return value;
  }
  throw new Error(`Expected Quint ${tag} record payload at ${field}.`);
}

function isReadonlyRecord(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function decodeReactionArmorClassProjection(
  raw: unknown,
): ReactionArmorClassProjection {
  const tag = quintVariantTag(raw, "armorClass");
  if (tag === "ReactionArmorClassBonusUntilReactorNextTurnStart") {
    const payload = quintVariantRecordValue(raw, tag, "armorClass");
    return {
      kind: "bonusUntilReactorNextTurnStart",
      bonus: numberFromQuintInt(quintField(payload, "bonus"), "bonus"),
    };
  }
  throw new Error(`Unsupported reaction Armor Class projection: ${tag}.`);
}

function decodeReactionSaveAbility(raw: unknown): "dexterity" {
  const tag = quintVariantTag(raw, "saveAbility");
  if (tag === "DexteritySavingThrowAbility") return "dexterity";
  throw new Error(`Unsupported reaction Saving Throw ability: ${tag}.`);
}

function decodeReactionConstitutionSaveAbility(raw: unknown): "constitution" {
  const tag = quintVariantTag(raw, "saveAbility");
  if (tag === "ConstitutionSavingThrowAbility") return "constitution";
  throw new Error(`Unsupported reaction interruption save ability: ${tag}.`);
}

function decodeReactionDamageProjection(
  raw: unknown,
): ReactionRolledDamageProjection {
  const tag = quintVariantTag(raw, "damage");
  if (tag === "ReactionRolledDamage") {
    const payload = quintVariantRecordValue(raw, tag, "damage");
    return {
      kind: "rolledDamage",
      diceCount: numberFromQuintInt(
        quintField(payload, "diceCount"),
        "diceCount",
      ),
      dieFaces: numberFromQuintInt(quintField(payload, "dieFaces"), "dieFaces"),
      damageType: decodeReactionDamageType(quintField(payload, "damageType")),
    };
  }
  throw new Error(`Unsupported reaction damage projection: ${tag}.`);
}

function decodeReactionDamageType(raw: unknown): "fire" {
  const tag = quintVariantTag(raw, "damageType");
  if (tag === "FireDamageTypeProjection") return "fire";
  throw new Error(`Unsupported reaction damage type: ${tag}.`);
}

function decodeReactionSaveDamagePolicy(raw: unknown): "halfDamageOnSuccess" {
  const tag = quintVariantTag(raw, "saveDamagePolicy");
  if (tag === "HalfDamageOnSuccessfulSave") return "halfDamageOnSuccess";
  throw new Error(`Unsupported reaction save damage policy: ${tag}.`);
}

function decodeInterruptedSpellDissipates(
  raw: unknown,
): "dissipatesWithoutEffect" {
  const tag = quintVariantTag(raw, "interruptedEffect");
  if (tag === "InterruptedSpellDissipatesWithoutEffect") {
    return "dissipatesWithoutEffect";
  }
  throw new Error(`Unsupported interrupted spell end projection: ${tag}.`);
}

function decodeInterruptedSpellResumes(raw: unknown): "resumesAfterReaction" {
  const tag = quintVariantTag(raw, "interruptedEffect");
  if (tag === "InterruptedSpellResumesAfterReaction") {
    return "resumesAfterReaction";
  }
  throw new Error(`Unsupported interrupted spell resume projection: ${tag}.`);
}

function decodeInterruptedSpellPreservedSlot(raw: unknown): "preserved" {
  const tag = quintVariantTag(raw, "interruptedSlot");
  if (tag === "InterruptedSpellSlotPreserved") return "preserved";
  throw new Error(`Unsupported interrupted spell slot preservation: ${tag}.`);
}

function decodeInterruptedSpellSpentSlotOnResume(
  raw: unknown,
): InterruptedSpellSlotSpentOnResume {
  const tag = quintVariantTag(raw, "interruptedSlot");
  if (tag === "InterruptedSpellSlotSpentOnResume") {
    const payload = quintVariantRecordValue(raw, tag, "interruptedSlot");
    return {
      kind: "spentOnResume",
      slotLevel: numberFromQuintInt(
        quintField(payload, "slotLevel"),
        "slotLevel",
      ),
    };
  }
  throw new Error(
    `Unsupported interrupted spell slot resume projection: ${tag}.`,
  );
}
