// Attack damage reduction zero-damage redirect handling extracted from dispatcher.ts.

// RAW-COVERAGE: runtime-owner RAW-QCORE7-MOVEMENT-GRAPPLE-001 RAW-PTG-REACTIONS-002 RAW-PTG-REACTIONS-004 RAW-PTG-REACTIONS-005 RAW-PTG-REACTIONS-006 RAW-QCORE9-UNIT-FEATURE-PROFILES-001 RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.action-surge-resource unit-feature.attack-action-attack-count-scaling unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.attack-damage-rider unit-feature.attack-roll-miss-to-hit-replacement unit-feature.bonus-action-dash-temporary-hit-points unit-feature.bonus-action-ongoing-rage unit-feature.failed-ability-check-resource-boost unit-feature.first-attack-roll-reckless-advantage unit-feature.passive-ranged-attack-roll-bonus unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants unit-feature.reaction-roll-or-damage-reduction unit-feature.save-damage-replacement unit-feature.self-bonus-action-healing unit-feature.weapon-damage-dice-roll-choice unit-feature.zero-hit-point-replacement spell.creature-type-protection-and-charm spell.invocation-attack-roll-advantage-save spell.invocation-chained-attack-damage spell.invocation-damage-reduction spell.invocation-damage-save-or-attack spell.invocation-condition-save spell.hit-point-restoration spell.invocation-marked-damage-rider spell.invocation-roll-modifier spell.invocation-weapon-damage-rider spell.reaction-shield spell.readied-action-time-spell spell.scalar-buff stat-block.attack-control

import { DamageAmount } from "@dnd/shared/types";

import type { UnitRecord } from "@dnd/surface/surface/types";

import { Match } from "effect";

import {
  resourceHasUsesRemaining,
  spendCharacterResourceUse,
  type CharacterBattleResourceState,
} from "../character-battle-resources.ts";

import { CombatantId } from "../identity.ts";

import { ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SUPPORT_PROFILE } from "../unit-feature-support.ts";

import { combatantCanSee } from "./creature-state-leaves.ts";

import { applyAttackDamageAmount } from "./damage-apply.ts";

import {
  ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_DAMAGE_HOLE_ID,
  ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_DAMAGE_HOLE_INSTANCE,
  ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SAVE_HOLE_ID,
  ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SAVE_HOLE_INSTANCE,
  ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_TARGET_HOLE_ID,
  ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_TARGET_HOLE_INSTANCE,
} from "./domain-constants.ts";

import { attackDamageEventAmountForTarget } from "./attack-damage-events.ts";
import { rolledDiceFillTotal } from "./reaction-modifiers.ts";
export {
  attackDamageEventAfterPendingReduction,
  attackDamageEventAfterPendingReductions,
  attackDamageEventAmountBeforeTargetAdjustments,
  attackDamageEventAmountForTarget,
  attackDamageEventEntries,
  attackDamageEventWithEntries,
  attackDamagePrefixFills,
  attackFillsThroughAttackRoll,
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
} from "../battle-reducer.ts";
import { zeroHpLifecycleIsTerminal } from "../battle-reducer.ts";
export function attackDamageReductionZeroDamageRedirectSelection(input: {
  readonly state: BattleState;
  readonly reactorId: CombatantId;
  readonly unitId: UnitRecord["id"];
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
  const { damage, offer, reactorId, save, state, target, unitId } = input;
  if (target === undefined && save === undefined && damage === undefined) {
    return { tag: "ok", value: undefined };
  }
  if (target === undefined || save === undefined || damage === undefined) {
    return {
      tag: "invalid",
      message:
        "Attack damage reduction redirect requires target, save, and damage facts.",
    };
  }
  if (
    !attackDamageReductionRedirectResourceAvailable(
      state,
      reactorId,
      unitId,
      offer,
    )
  ) {
    return {
      tag: "invalid",
      message:
        "Attack damage reduction redirect requires an available projected resource.",
    };
  }
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
  const outcome = save.value.outcomes.find(
    (candidate) => candidate.targetId === target.value,
  );
  if ("area" in save.value) {
    return {
      tag: "invalid",
      message:
        "Attack damage reduction redirect save must not include spell area facts.",
    };
  }
  if (outcome === undefined || save.value.outcomes.length !== 1) {
    return {
      tag: "invalid",
      message:
        "Attack damage reduction redirect save must name the redirect target once.",
    };
  }
  const redirectedDamageRoll = rolledDiceFillTotal(damage, {
    dice: offer.damageDice.dice,
    dieSize: offer.damageDice.dieSize,
  });
  if (redirectedDamageRoll === null) {
    return {
      tag: "invalid",
      message:
        "Attack damage reduction redirect damage must match its projected dice.",
    };
  }
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
}):
  | { readonly tag: "ok"; readonly state: BattleState }
  | {
      readonly tag: "needsHoles";
      readonly state: BattleState;
      readonly holes: readonly BattleHole[];
    }
  | {
      readonly tag: "invalid";
      readonly message: string;
    } {
  const offers = input.reductions.flatMap((reduction) =>
    reduction.zeroDamageRedirect === undefined
      ? []
      : [
          {
            reactorId: reduction.reactorId,
            unitId: reduction.unitId,
            label: reduction.label,
            redirect: reduction.zeroDamageRedirect,
          } satisfies AttackDamageReductionZeroDamageRedirectAvailableOffer,
        ],
  );
  if (offers.length === 0) {
    return { tag: "ok", state: input.state };
  }
  if (offers.length > 1) {
    return {
      tag: "invalid",
      message:
        "Attack damage reduction redirect expects exactly one zero-damage redirect offer.",
    };
  }
  if (Number(input.reducedDamageBeforeTargetAdjustments) !== 0) {
    if (
      input.redirectTarget === undefined &&
      input.redirectSave === undefined &&
      input.redirectDamage === undefined
    ) {
      return { tag: "ok", state: input.state };
    }
    return {
      tag: "invalid",
      message:
        "Attack damage reduction redirect is only available when the reduction makes the attack damage 0.",
    };
  }
  const offer = offers[0];
  const selection = attackDamageReductionZeroDamageRedirectSelection({
    state: input.state,
    reactorId: offer.reactorId,
    unitId: offer.unitId,
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
      return { tag: "ok", state: input.state };
    }
    return {
      tag: "needsHoles",
      state: input.state,
      holes,
    };
  }
  const resourceSpent = spendAttackDamageReductionRedirectResource(
    input.state,
    offer.reactorId,
    offer.unitId,
    offer.redirect,
  );
  if (selection.value.savingThrowSucceeded) {
    return { tag: "ok", state: resourceSpent };
  }
  const redirectTarget = resourceSpent.combatants.get(selection.value.targetId);
  if (redirectTarget === undefined) {
    return { tag: "ok", state: resourceSpent };
  }
  const redirectedDamage = attackDamageEventAmountForTarget(redirectTarget, {
    kind: "aggregateDamage",
    damageByTypeBeforeTargetAdjustments: [
      {
        damageType: offer.redirect.originalDamageType,
        amount: Math.max(
          0,
          selection.value.redirectedDamageRoll +
            Number(offer.redirect.damageAbilityModifier),
        ),
      },
    ],
  });
  return {
    tag: "ok",
    state: applyAttackDamageAmount(
      resourceSpent,
      offer.reactorId,
      selection.value.targetId,
      redirectedDamage,
      1,
      { kind: "ordinaryDamage" },
      [],
    ),
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
      offer.unitId,
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
      label: `${offer.label} redirect target`,
      choices: targetChoices,
      requiresTableSpatialFact: true,
    },
    {
      kind: "savingThrowOutcome",
      holeId: ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SAVE_HOLE_ID,
      holeInstanceKey:
        ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SAVE_HOLE_INSTANCE,
      label: `${offer.label} Dexterity saving throw`,
      unitFeature: {
        unitId: offer.unitId,
        label: offer.label,
      },
      ability: offer.redirect.saveAbility,
      dc: { kind: "fixed", dc: offer.redirect.saveDc },
      targetIds: targetChoices,
      targetRollModes: savingThrowRollModeProjections(
        state,
        offer.redirect.saveAbility,
      ),
      targetFlatBonuses: savingThrowFlatBonusProjections(state),
    },
    {
      kind: "rolledDice",
      holeId: ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_DAMAGE_HOLE_ID,
      holeInstanceKey:
        ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_DAMAGE_HOLE_INSTANCE,
      label: `${offer.label} redirected damage`,
      unitFeature: {
        unitId: offer.unitId,
        label: offer.label,
        modifierKind: "attackDamageReduction",
      },
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
        targetId !== reactorId &&
        !zeroHpLifecycleIsTerminal(target) &&
        combatantCanSee(state, reactorId, targetId),
    )
    .map(([targetId]) => targetId);
}

export function attackDamageReductionRedirectResourceAvailable(
  state: BattleState,
  reactorId: CombatantId,
  unitId: UnitRecord["id"],
  offer: AttackDamageReductionZeroDamageRedirectOffer,
): boolean {
  const reactor = state.combatants.get(reactorId);
  return (
    attackDamageReductionRedirectResource(reactor, unitId, offer) !== undefined
  );
}

export function spendAttackDamageReductionRedirectResource(
  state: BattleState,
  reactorId: CombatantId,
  unitId: UnitRecord["id"],
  offer: AttackDamageReductionZeroDamageRedirectOffer,
): BattleState {
  const reactor = state.combatants.get(reactorId);
  if (reactor?.origin.kind !== "character") {
    return state;
  }
  const resource = attackDamageReductionRedirectResource(
    reactor,
    unitId,
    offer,
  );
  if (resource === undefined) return state;
  return {
    ...state,
    combatants: new Map(state.combatants).set(reactorId, {
      ...reactor,
      origin: {
        ...reactor.origin,
        resources: reactor.origin.resources.map((candidate) =>
          candidate === resource
            ? spendCharacterResourceUse(candidate)
            : candidate,
        ),
      },
    }),
  };
}

export function attackDamageReductionRedirectResource(
  reactor: BattleCreatureState | undefined,
  unitId: UnitRecord["id"],
  offer: AttackDamageReductionZeroDamageRedirectOffer,
): CharacterBattleResourceState | undefined {
  if (reactor?.origin.kind !== "character") return undefined;
  const characterOrigin = reactor.origin;
  const reducingFeatureIsProjected = characterOrigin.characterUnitRefs.some(
    (unitRef) =>
      unitRef.unitId === unitId &&
      unitRef.supportProfiles.includes(
        ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SUPPORT_PROFILE,
      ),
  );
  if (!reducingFeatureIsProjected) return undefined;
  return characterOrigin.resources.find(
    (resource) =>
      resource.unit.id === offer.spends.resourceUnitId &&
      offer.spends.amount === 1 &&
      resource.unit.kind === "class_feature" &&
      resource.unit.mechanics.family === "resource_container" &&
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
