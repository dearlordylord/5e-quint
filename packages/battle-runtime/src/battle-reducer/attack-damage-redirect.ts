// Attack damage reduction zero-damage redirect handling extracted from dispatcher.ts.

// RAW-COVERAGE: runtime-owner RAW-QCORE7-MOVEMENT-GRAPPLE-001 RAW-PTG-REACTIONS-002 RAW-PTG-REACTIONS-004 RAW-PTG-REACTIONS-005 RAW-PTG-REACTIONS-006 RAW-QCORE9-UNIT-FEATURE-PROFILES-001 RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.action-surge-resource unit-feature.attack-action-attack-count-scaling unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.attack-damage-rider unit-feature.attack-roll-miss-to-hit-replacement unit-feature.bonus-action-dash-temporary-hit-points unit-feature.bonus-action-ongoing-rage unit-feature.failed-ability-check-resource-boost unit-feature.first-attack-roll-reckless-advantage unit-feature.passive-ranged-attack-roll-bonus unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants unit-feature.reaction-roll-or-damage-reduction unit-feature.save-damage-replacement unit-feature.self-bonus-action-healing unit-feature.weapon-damage-dice-roll-choice unit-feature.zero-hit-point-replacement spell.creature-type-protection-and-charm spell.invocation-attack-roll-advantage-save spell.invocation-chained-attack-damage spell.invocation-damage-reduction spell.invocation-damage-save-or-attack spell.invocation-condition-save spell.hit-point-restoration spell.invocation-marked-damage-rider spell.invocation-roll-modifier spell.invocation-weapon-damage-rider spell.reaction-shield spell.readied-action-time-spell spell.scalar-buff stat-block.attack-control

import {
  DamageAmount,
  damageAmount as toDamageAmount,
} from "@dnd/shared/types";

import { Match } from "effect";

import {
  resourceHasUsesRemaining,
  spendCharacterResourceUse,
  type CharacterBattleResourceState,
} from "../character-battle-resource-execution.ts";

import { CombatantId } from "../identity.ts";

import { combatantCanSee } from "./creature-state-leaves.ts";

import {
  applyAttackDamageAmount,
  resolveSaveGatedConditionDamageRepeatSave,
} from "./damage-apply.ts";
import { saveGatedConditionDamageOccurrenceKeyForHoleTarget } from "./staged-condition-repeat-save.ts";
import {
  damageRelationshipDecisionFillCheck,
  type DamageRelationshipDecisionsByHole,
} from "./damage-relationship-decisions.ts";

import {
  ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_DAMAGE_HOLE_ID,
  ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_DAMAGE_HOLE_INSTANCE,
  ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SAVE_HOLE_ID,
  ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SAVE_HOLE_INSTANCE,
  ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_TARGET_HOLE_ID,
  ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_TARGET_HOLE_INSTANCE,
} from "./domain-constants.ts";

import { attackDamageEventAmountForTarget } from "./attack-damage-events.ts";
import {
  reactionModifierProcedureSource,
  rolledDiceFillTotal,
} from "./reaction-modifiers.ts";
export {
  attackDamageEventAfterPendingReduction,
  attackDamageEventAfterPendingReductions,
  attackDamageEventAmountBeforeTargetAdjustments,
  attackDamageEventAmountForTarget,
  attackDamageEventEntries,
  attackDamageEventWithEntries,
  attackFillsForAttackHitReplay,
  damageAmountByTypeEntriesAfterScalarReduction,
} from "./attack-damage-events.ts";

import {
  savingThrowFlatBonusProjections,
  savingThrowRollModeProjections,
} from "./spells-holes-fills.ts";

import type {
  AttackDamageReductionRedirectTargetGate,
  AttackDamageReductionZeroDamageRedirectAvailableOffer,
  AttackDamageReductionZeroDamageRedirectOffer,
  AttackDamageReductionZeroDamageRedirectSelection,
  BattleAttackKindForRedirect,
  BattleCreatureState,
  BattleFill,
  BattleHole,
  BattlePendingAttackDamageReduction,
  BattleRolledDiceFill,
  BattleState,
  BattleTargetSpatialFact,
} from "../battle-state-execution.ts";
import { zeroHpLifecycleIsTerminal } from "./creature-state-leaves.ts";
import {
  extendSavingThrowOngoingFeatures,
  ongoingFeatureEnemyRelationshipDecisionRequired,
} from "./attack-roll.ts";
import { parseSavingThrowRelationshipFacts } from "./roll-trigger-relationship-facts.ts";
export function attackDamageReductionZeroDamageRedirectSelection(input: {
  readonly state: BattleState;
  readonly reactorId: CombatantId;
  readonly offer: AttackDamageReductionZeroDamageRedirectOffer;
  readonly target:
    | Extract<BattleFill, { readonly kind: "targetChoice" }>
    | undefined;
  readonly save:
    | Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>
    | undefined;
  readonly damage: BattleRolledDiceFill | undefined;
}):
  | {
      readonly tag: "ok";
      readonly value:
        | AttackDamageReductionZeroDamageRedirectSelection
        | undefined;
    }
  | { readonly tag: "invalid"; readonly message: string } {
  const { damage, offer, reactorId, save, state, target } = input;
  if (target === undefined && save === undefined && damage === undefined) {
    return { tag: "ok", value: undefined };
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (target === undefined || save === undefined || damage === undefined) {
    return {
      tag: "invalid",
      message:
        "Attack damage reduction redirect requires target, save, and damage facts.",
    };
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !attackDamageReductionRedirectResourceAvailable(state, reactorId, offer)
  ) {
    return {
      tag: "invalid",
      message:
        "Attack damage reduction redirect requires an available projected resource.",
    };
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !attackDamageReductionZeroDamageRedirectTargetChoices(
      state,
      reactorId,
    ).includes(target.value) ||
    !hasAttackDamageReductionRedirectTargetSpatialFact(
      target.spatialFacts ?? [],
      reactorId,
      target.value,
      offer.attackKind,
      offer.targetGate,
    )
  ) {
    return {
      tag: "invalid",
      message: "Attack damage reduction redirect target is not eligible.",
    };
  }
  /* v8 ignore stop -- @preserve */
  const outcome = save.value.outcomes.find(
    (candidate) => candidate.targetId === target.value,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if ("area" in save.value) {
    return {
      tag: "invalid",
      message:
        "Attack damage reduction redirect save must not include spell area facts.",
    };
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (outcome === undefined || save.value.outcomes.length !== 1) {
    return {
      tag: "invalid",
      message:
        "Attack damage reduction redirect save must name the redirect target once.",
    };
  }
  /* v8 ignore stop -- @preserve */
  const redirectedDamageRoll = rolledDiceFillTotal(damage, {
    dice: offer.damageDice.dice,
    dieSize: offer.damageDice.dieSize,
  });
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (redirectedDamageRoll === null) {
    return {
      tag: "invalid",
      message:
        "Attack damage reduction redirect damage must match its projected dice.",
    };
  }
  /* v8 ignore stop -- @preserve */
  return {
    tag: "ok",
    value: {
      targetId: target.value,
      savingThrowSucceeded: outcome.succeeded,
      redirectedDamageRoll,
    },
  };
}

export function resolveAttackDamageReductionZeroDamageRedirectAfterReduction(input: {
  readonly state: BattleState;
  readonly reductions: readonly BattlePendingAttackDamageReduction[];
  readonly reducedDamageBeforeTargetAdjustments: DamageAmount;
  readonly redirectTarget:
    | Extract<BattleFill, { readonly kind: "targetChoice" }>
    | undefined;
  readonly redirectSave:
    | Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>
    | undefined;
  readonly redirectDamage:
    | Extract<BattleFill, { readonly kind: "rolledDice" }>
    | undefined;
  readonly saveGatedConditionWithRepeatDamageRepeatSaves: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[];
  readonly damageRelationshipDecisions: DamageRelationshipDecisionsByHole;
}):
  | {
      readonly tag: "ok";
      readonly state: BattleState;
      readonly damageRepeatSaveHoleIds: readonly BattleHole["holeId"][];
    }
  | {
      readonly tag: "needsHoles";
      readonly state: BattleState;
      readonly holes: readonly BattleHole[];
    }
  | {
      readonly tag: "invalid";
      readonly message: string;
    } {
  const redirectReductions = input.reductions.filter(
    (reduction) => reduction.zeroDamageRedirect !== undefined,
  );
  const offers = redirectReductions.flatMap((reduction) => {
    const source = reactionModifierProcedureSource(
      input.state,
      reduction.reactorId,
      reduction.procedureRef,
    );
    return source === undefined || reduction.zeroDamageRedirect === undefined
      ? []
      : [
          {
            reactorId: reduction.reactorId,
            ...source,
            redirect: reduction.zeroDamageRedirect,
          } satisfies AttackDamageReductionZeroDamageRedirectAvailableOffer,
        ];
  });
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (offers.length !== redirectReductions.length) {
    return {
      tag: "invalid",
      message:
        "Attack damage reduction redirect procedure binding is no longer available.",
    };
  }
  /* v8 ignore stop -- @preserve */
  if (offers.length === 0) {
    return { tag: "ok", state: input.state, damageRepeatSaveHoleIds: [] };
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (offers.length > 1) {
    return {
      tag: "invalid",
      message:
        "Attack damage reduction redirect expects exactly one zero-damage redirect offer.",
    };
  }
  /* v8 ignore stop -- @preserve */
  if (Number(input.reducedDamageBeforeTargetAdjustments) !== 0) {
    if (
      input.redirectTarget === undefined &&
      input.redirectSave === undefined &&
      input.redirectDamage === undefined
    ) {
      return { tag: "ok", state: input.state, damageRepeatSaveHoleIds: [] };
    }
    return {
      tag: "invalid",
      message:
        "Attack damage reduction redirect is only available when the reduction makes the attack damage 0.",
    };
  }
  const offer = offers[0];
  const relationshipFacts =
    input.redirectSave === undefined || input.redirectTarget === undefined
      ? []
      : parseSavingThrowRelationshipFacts(
          input.redirectSave.relationshipFacts ?? [],
          offer.reactorId,
          [input.redirectTarget.value],
          ongoingFeatureEnemyRelationshipDecisionRequired(
            input.state,
            offer.reactorId,
            "enemySavingThrow",
          ),
        );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (relationshipFacts === null) {
    return {
      tag: "invalid",
      message:
        "Attack damage reduction redirect relationship facts must answer the saving-throw hole request.",
    };
  }
  /* v8 ignore stop -- @preserve */
  const selection = attackDamageReductionZeroDamageRedirectSelection({
    state: input.state,
    reactorId: offer.reactorId,
    offer: offer.redirect,
    target: input.redirectTarget,
    save: input.redirectSave,
    damage: input.redirectDamage,
  });
  if (selection.tag === "invalid") {
    return selection;
  }
  if (selection.value === undefined) {
    const holes = attackDamageReductionZeroDamageRedirectHoles(
      input.state,
      offer,
    );
    if (holes.length === 0) {
      return { tag: "ok", state: input.state, damageRepeatSaveHoleIds: [] };
    }
    return {
      tag: "needsHoles",
      state: input.state,
      holes,
    };
  }
  const resourceSpent = spendAttackDamageReductionRedirectResource(
    extendSavingThrowOngoingFeatures(
      input.state,
      offer.reactorId,
      [selection.value.targetId],
      relationshipFacts,
    ),
    offer.reactorId,
    offer.redirect,
  );
  if (selection.value.savingThrowSucceeded) {
    const relationshipDecision = input.damageRelationshipDecisions.check(
      ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_DAMAGE_HOLE_ID,
      null,
    );
    if (relationshipDecision.tag === "invalid") {
      return relationshipDecision;
    }
    if (relationshipDecision.tag === "needsHoles") {
      return {
        tag: "needsHoles",
        state: resourceSpent,
        holes: relationshipDecision.holes,
      };
    }
    return { tag: "ok", state: resourceSpent, damageRepeatSaveHoleIds: [] };
  }
  return resolveFailedAttackDamageReductionRedirect({
    input,
    offer,
    resourceSpent,
    selection: selection.value,
  });
}

function resolveFailedAttackDamageReductionRedirect(input: {
  readonly input: Parameters<
    typeof resolveAttackDamageReductionZeroDamageRedirectAfterReduction
  >[0];
  readonly offer: AttackDamageReductionZeroDamageRedirectAvailableOffer;
  readonly resourceSpent: BattleState;
  readonly selection: Pick<
    AttackDamageReductionZeroDamageRedirectSelection,
    "targetId" | "redirectedDamageRoll"
  >;
}): ReturnType<
  typeof resolveAttackDamageReductionZeroDamageRedirectAfterReduction
> {
  const { offer, resourceSpent, selection } = input;
  const redirectTarget = resourceSpent.combatants.get(selection.targetId);
  if (redirectTarget === undefined) {
    return { tag: "ok", state: resourceSpent, damageRepeatSaveHoleIds: [] };
  }
  const redirectedDamage = attackDamageEventAmountForTarget(
    resourceSpent,
    redirectTarget,
    {
      kind: "aggregateDamage",
      damageByTypeBeforeTargetAdjustments: [
        {
          damageType: offer.redirect.originalDamageType,
          amount: Math.max(
            0,
            selection.redirectedDamageRoll +
              Number(offer.redirect.damageAbilityModifier),
          ),
        },
      ],
    },
  );
  const relationshipDecision = damageRelationshipDecisionFillCheck({
    state: resourceSpent,
    damageEventHoleId:
      ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_DAMAGE_HOLE_ID,
    damageSourceId: offer.reactorId,
    targets:
      Number(redirectedDamage) > 0
        ? [
            {
              targetId: selection.targetId,
              damageAmount: toDamageAmount(Number(redirectedDamage)),
            },
          ]
        : [],
    spatialFacts: input.input.redirectTarget?.spatialFacts ?? [],
    decisionsByRelationshipHole: input.input.damageRelationshipDecisions,
  });
  if (relationshipDecision.tag === "invalid") {
    return relationshipDecision;
  }
  if (relationshipDecision.tag === "needsHoles") {
    return {
      tag: "needsHoles",
      state: resourceSpent,
      holes: relationshipDecision.holes,
    };
  }
  return applyAcceptedAttackDamageReductionRedirect({
    state: resourceSpent,
    target: redirectTarget,
    targetId: selection.targetId,
    damage: redirectedDamage,
    damageSourceId: offer.reactorId,
    fills: input.input.saveGatedConditionWithRepeatDamageRepeatSaves,
    redirectTargetFill: input.input.redirectTarget,
    relationshipDecision,
  });
}

function applyAcceptedAttackDamageReductionRedirect(input: {
  readonly state: BattleState;
  readonly target: BattleCreatureState;
  readonly targetId: CombatantId;
  readonly damage: DamageAmount;
  readonly damageSourceId: CombatantId;
  readonly fills: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[];
  readonly redirectTargetFill:
    | Extract<BattleFill, { readonly kind: "targetChoice" }>
    | undefined;
  readonly relationshipDecision: Extract<
    ReturnType<typeof damageRelationshipDecisionFillCheck>,
    { readonly tag: "ok" }
  >;
}): ReturnType<
  typeof resolveAttackDamageReductionZeroDamageRedirectAfterReduction
> {
  const damageRepeatSave = resolveSaveGatedConditionDamageRepeatSave({
    state: input.state,
    target: input.target,
    damageAmount: Number(input.damage),
    fills: input.fills,
    damageOccurrenceKey: saveGatedConditionDamageOccurrenceKeyForHoleTarget({
      holeId: ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_DAMAGE_HOLE_ID,
      targetId: input.targetId,
    }),
  });
  if (damageRepeatSave.tag === "invalid") {
    return damageRepeatSave;
  }
  if (damageRepeatSave.tag === "needsHoles") {
    return {
      tag: "needsHoles",
      state: input.state,
      holes: damageRepeatSave.missingHoles,
    };
  }
  return {
    tag: "ok",
    damageRepeatSaveHoleIds: damageRepeatSave.holes.map((hole) => hole.holeId),
    state: applyAttackDamageAmount({
      state: input.state,
      attackerId: input.damageSourceId,
      targetId: input.targetId,
      damageAmount: input.damage,
      deathFailuresAtZeroHp: 1,
      damageDisposition: { kind: "ordinaryDamage" },
      attackDamageRiders: [],
      saveGatedConditionDamageRepeatSave: damageRepeatSave.context,
      spatialFacts: input.redirectTargetFill?.spatialFacts ?? [],
      relationshipDecisions: input.relationshipDecision.decisions,
    }),
  };
}

export function attackDamageReductionZeroDamageRedirectHoles(
  state: BattleState,
  offer: AttackDamageReductionZeroDamageRedirectAvailableOffer,
): readonly BattleHole[] {
  if (
    attackDamageReductionRedirectResourceAvailable(
      state,
      offer.reactorId,
      offer.redirect,
    ) === false
  ) {
    return [];
  }
  const targetChoices = attackDamageReductionZeroDamageRedirectTargetChoices(
    state,
    offer.reactorId,
  );
  return [
    {
      kind: "targetChoice",
      holeId: ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_TARGET_HOLE_ID,
      holeInstanceKey:
        ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_TARGET_HOLE_INSTANCE,
      label: "Attack damage reduction redirect target",
      choices: targetChoices,
      requiresTableSpatialFact: true,
    },
    {
      kind: "savingThrowOutcome",
      holeId: ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SAVE_HOLE_ID,
      holeInstanceKey:
        ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SAVE_HOLE_INSTANCE,
      label: "Attack damage reduction redirect Dexterity saving throw",
      ...(ongoingFeatureEnemyRelationshipDecisionRequired(
        state,
        offer.reactorId,
        "enemySavingThrow",
      )
        ? {
            relationshipFactRequest: {
              kind: "savingThrowTargetIsEnemy" as const,
              actorId: offer.reactorId,
            },
          }
        : {}),
      ability: offer.redirect.saveAbility,
      dc: { kind: "fixed", dc: offer.redirect.saveDc },
      targetIds: targetChoices,
      targetRollModes: savingThrowRollModeProjections(
        state,
        offer.redirect.saveAbility,
      ),
      targetFlatBonuses: savingThrowFlatBonusProjections(
        state,
        offer.redirect.saveAbility,
      ),
    },
    {
      kind: "rolledDice",
      holeId: ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_DAMAGE_HOLE_ID,
      holeInstanceKey:
        ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_DAMAGE_HOLE_INSTANCE,
      label: "Attack damage reduction redirected damage",
    },
  ];
}

export function attackDamageReductionZeroDamageRedirectTargetChoices(
  state: BattleState,
  reactorId: CombatantId,
): readonly CombatantId[] {
  return [...state.combatants]
    .filter(
      ([targetId, target]) =>
        !zeroHpLifecycleIsTerminal(target) &&
        combatantCanSee(state, reactorId, targetId),
    )
    .map(([targetId]) => targetId);
}

export function attackDamageReductionRedirectResourceAvailable(
  state: BattleState,
  reactorId: CombatantId,
  offer: AttackDamageReductionZeroDamageRedirectOffer,
): boolean {
  const reactor = state.combatants.get(reactorId);
  return attackDamageReductionRedirectResource(reactor, offer) !== undefined;
}

export function spendAttackDamageReductionRedirectResource(
  state: BattleState,
  reactorId: CombatantId,
  offer: AttackDamageReductionZeroDamageRedirectOffer,
): BattleState {
  const reactor = state.combatants.get(reactorId);
  if (reactor?.origin.kind !== "character") {
    return state;
  }
  const resource = attackDamageReductionRedirectResource(reactor, offer);
  if (resource === undefined) return state;
  return {
    ...state,
    combatants: new Map(state.combatants).set(reactorId, {
      ...reactor,
      origin: {
        ...reactor.origin,
        resources: reactor.origin.resources.map((candidate) =>
          candidate === resource && resourceHasUsesRemaining(candidate)
            ? spendCharacterResourceUse(candidate)
            : candidate,
        ),
      },
    }),
  };
}

export function attackDamageReductionRedirectResource(
  reactor: BattleCreatureState | undefined,
  offer: AttackDamageReductionZeroDamageRedirectOffer,
): CharacterBattleResourceState | undefined {
  if (reactor?.origin.kind !== "character") return undefined;
  return reactor.origin.resources.find(
    (resource) =>
      resource.resourcePoolRef === offer.spends.resourcePoolRef &&
      offer.spends.amount === 1 &&
      resourceHasUsesRemaining(resource),
  );
}

export function hasAttackDamageReductionRedirectTargetSpatialFact(
  facts: readonly BattleTargetSpatialFact[],
  sourceId: CombatantId,
  targetId: CombatantId,
  attackKind: BattleAttackKindForRedirect,
  targetGate: AttackDamageReductionRedirectTargetGate,
): boolean {
  return Match.value(attackKind).pipe(
    Match.when(
      "melee",
      () =>
        targetGate.melee === "visibleWithin5Feet" &&
        facts.some(
          (fact) =>
            fact.kind === "meleeRedirectTargetWithin5Feet" &&
            fact.sourceId === sourceId &&
            fact.targetId === targetId,
        ),
    ),
    Match.when(
      "ranged",
      () =>
        targetGate.ranged === "visibleWithin60FeetWithoutTotalCover" &&
        facts.some(
          (fact) =>
            fact.kind === "rangedRedirectTargetWithin60FeetWithoutTotalCover" &&
            fact.sourceId === sourceId &&
            fact.targetId === targetId,
        ),
    ),
    Match.exhaustive,
  );
}
