// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.druid-wild-shape-known-form unit-feature.grappler unit-feature.martial-arts-attack-projection unit-feature.stunning-strike
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-slow-active-penalties
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.druid-wild-shape-known-form unit-feature.grappler unit-feature.martial-arts-attack-projection spell.invocation-haste-positive
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.WILD_SHAPE_FORM_LIFECYCLE
// Reads creature-state-leaves.ts to avoid cycling back into G.
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SCALAR_BUFF_ACTIVE_EFFECTS
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SELF_TRANSFORMATION_MODE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SLOW_ACTIVE_PENALTIES_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.HASTE_POSITIVE_EFFECTS
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.HASTE_LETHARGY_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND

import {
  difficultyClass,
  movementFeet,
  type DifficultyClass,
  type MovementFeet,
} from "@dnd/shared/types";
import type { Size } from "@dnd/surface/surface/types";
import type { CombatantId } from "../identity.ts";
import {
  type BattleInterruptAttackExecutionSelection,
  type BattleMovementSpeedKind,
} from "../battle-subjects.ts";
import {
  attackExecutionSelectionForOption,
  attackExecutionSelectionIdentitiesEqual,
  boundAttackExecutionSelectionMatchesOption,
  type BoundSupportedAttackActionOption,
  type SupportedAttackActionOption,
} from "../battle-action-options.ts";
import {
  type BattleAttackHitTriggerKind,
  type BattleAttackExecutionSelection,
  type BattleAttackKindForRedirect,
  type BattleCreatureState,
  type BattleGrappleLink,
  type BattleHand,
  type BattleMovementHole,
  type BattleOpportunityAttackThreat,
  type BattleOpportunityAttackSelection,
  type BattleResolvedMovement,
  type BattleState,
  type BattleTargetSpatialFact,
} from "../battle-state-execution.ts";
import { zeroHpLifecycleIsTerminal } from "./creature-state-leaves.ts";
import { attackTargetConstraint } from "./statblock-attacks.ts";
import { attackActionOptionsForActor } from "./attack-damage-apply.ts";
import { combatantHasGrapplerSupportProfile } from "./grappler-support-profile.ts";
import {
  combatantCanTakeReactions,
  combatantCanSee,
  combatantHandUses,
  currentActorId,
  grappledBy,
} from "./creature-state-leaves.ts";
import { isPresentFindFamiliarCombatant } from "../find-familiar-state.ts";
import {
  activeDruidWildShapeForm,
  combatantD20AbilityModifier,
  combatantD20ProficiencyBonus,
  combatantEffectiveSize,
} from "./druid-wild-shape.ts";

export {
  baseWalkSpeed,
  battleCreatureSpeedFacts,
  battleSpecialSpeedCandidates,
  battleSpeedChanges,
  battleTerminalSpeedZero,
  effectiveMovementSpeed,
  effectiveWalkSpeed,
  isBattleLiteralSpecialSpeed,
  passiveSpeedBonusDelta,
  passiveSpeedKindGrantKinds,
  representedMovementSpeedKinds,
} from "./movement-speed-facts.ts";
export {
  attackExecutionSelectionMatchesOption,
  attackTargetIsLegal,
  attackTargetRangeBand,
} from "./attack-spatial.ts";
import {
  effectiveMovementSpeed,
  representedMovementSpeedKinds,
} from "./movement-speed-facts.ts";

export function battleMovementBudget(
  state: BattleState,
  combatant: BattleCreatureState | undefined,
  grapples: readonly BattleGrappleLink[] = [],
  movementBonusFeet: MovementFeet = movementFeet(0),
  speedKind: BattleMovementSpeedKind = "walk",
): {
  readonly speedFeet: MovementFeet;
  readonly spentFeet: MovementFeet;
  readonly remainingFeet: MovementFeet;
  readonly speedKinds: readonly {
    readonly kind: BattleMovementSpeedKind;
    readonly speedFeet: MovementFeet;
    readonly remainingFeet: MovementFeet;
  }[];
} {
  if (combatant === undefined) {
    return {
      speedFeet: movementFeet(0),
      spentFeet: movementFeet(0),
      remainingFeet: movementFeet(0),
      speedKinds: [],
    };
  }
  const isGrappled = grapples.some(
    (grapple) => grapple.targetId === combatant.combatantId,
  );
  const speedFeet = effectiveMovementSpeed(
    state,
    combatant,
    speedKind,
    isGrappled,
  );
  const movementBudgetFeet = Number(speedFeet) + Number(movementBonusFeet);
  const remainingFeet = movementFeet(
    Math.max(0, movementBudgetFeet - Number(combatant.movementSpentFeet)),
  );
  const speedKinds = representedMovementSpeedKinds(combatant).map((kind) => {
    const kindSpeedFeet = effectiveMovementSpeed(
      state,
      combatant,
      kind,
      isGrappled,
    );
    return {
      kind,
      speedFeet: kindSpeedFeet,
      remainingFeet: movementFeet(
        Math.max(
          0,
          Number(kindSpeedFeet) +
            Number(movementBonusFeet) -
            Number(combatant.movementSpentFeet),
        ),
      ),
    };
  });
  return {
    speedFeet,
    spentFeet: combatant.movementSpentFeet,
    remainingFeet,
    speedKinds,
  };
}

export function battleMovementBudgetForActor(
  state: BattleState,
  actorId: CombatantId,
  speedKind: BattleMovementSpeedKind = "walk",
): ReturnType<typeof battleMovementBudget> {
  const bonus =
    actorId === currentActorId(state)
      ? state.currentTurnResources.dashMovementBonusFeet
      : movementFeet(0);
  return battleMovementBudget(
    state,
    state.combatants.get(actorId),
    state.grapples,
    bonus,
    speedKind,
  );
}

export function movementHoleHasRemainingBudget(
  hole: BattleMovementHole,
): boolean {
  return hole.speedKinds.some(
    (speedKind) => Number(speedKind.movementBudgetFeet) > 0,
  );
}

export function combatantCanMoveInState(
  state: BattleState,
  combatantId: CombatantId,
): boolean {
  return battleMovementBudgetForActor(state, combatantId).speedKinds.some(
    (speedKind) =>
      combatantCanMoveWithBudget(state, combatantId, speedKind.remainingFeet),
  );
}

export function combatantCanMoveWithBudget(
  state: BattleState,
  combatantId: CombatantId,
  movementBudgetFeet: MovementFeet,
): boolean {
  const combatant = state.combatants.get(combatantId);
  return (
    combatant !== undefined &&
    !zeroHpLifecycleIsTerminal(combatant) &&
    Number(movementBudgetFeet) > 0
  );
}

export function opportunityAttackThreatsForMovement(
  state: BattleState,
  movement: BattleResolvedMovement,
): readonly BattleOpportunityAttackThreat[] {
  if (
    movement.moverId === currentActorId(state) &&
    state.currentTurnResources.disengaged
  ) {
    return [];
  }
  return movement.provokedOpportunityAttacks.filter(
    (threat) =>
      combatantCanTakeReactions(state.combatants.get(threat.reactorId)) &&
      opportunityAttackOptionForReactor(
        state,
        threat.reactorId,
        movement.moverId,
        threat,
      ) !== undefined &&
      combatantCanSee(state, threat.reactorId, movement.moverId),
  );
}

export function opportunityAttackOptionForReactor(
  state: BattleState,
  reactorId: CombatantId,
  targetId: CombatantId,
  selection: BattleOpportunityAttackSelection,
): BoundSupportedAttackActionOption | undefined {
  if (isPresentFindFamiliarCombatant(state, reactorId)) {
    return undefined;
  }
  if (
    state.combatants
      .get(reactorId)
      ?.activeEffects.some(
        (effect) => effect.kind === "opportunityAttackDenied",
      )
  ) {
    return undefined;
  }
  return attackActionOptionsForActor(state, reactorId).find((attack) => {
    const constraint = attackTargetConstraint(attack);
    return (
      interruptAttackExecutionSelectionMatchesOption(selection, attack) &&
      constraint.kind === "meleeReach" &&
      state.combatants.has(targetId)
    );
  });
}

export function opportunityAttackSelectionForReactor(
  state: BattleState,
  reactorId: CombatantId,
  targetId: CombatantId,
  selection: BattleOpportunityAttackSelection,
): BattleInterruptAttackExecutionSelection | undefined {
  const attack = opportunityAttackOptionForReactor(
    state,
    reactorId,
    targetId,
    selection,
  );
  return attack === undefined
    ? undefined
    : attackExecutionSelectionForOption(attack);
}

export function interruptAttackExecutionSelectionMatchesOption(
  selection: BattleInterruptAttackExecutionSelection,
  attack: BoundSupportedAttackActionOption,
): boolean {
  return boundAttackExecutionSelectionMatchesOption(selection, attack);
}

export function attackExecutionSelectionsEqual(
  left: BattleAttackExecutionSelection,
  right: BattleAttackExecutionSelection,
): boolean {
  return (
    left.procedureRef !== undefined &&
    right.procedureRef !== undefined &&
    attackExecutionSelectionIdentitiesEqual(left, right)
  );
}

export function interruptAttackExecutionSelectionsEqual(
  left: BattleInterruptAttackExecutionSelection,
  right: BattleInterruptAttackExecutionSelection,
): boolean {
  return attackExecutionSelectionIdentitiesEqual(left, right);
}

export function meleeWeaponOrUnarmedStrikeOptionForReactor(
  state: BattleState,
  reactorId: CombatantId,
  targetId: CombatantId,
  selection: BattleInterruptAttackExecutionSelection,
): BoundSupportedAttackActionOption | undefined {
  return attackActionOptionsForActor(state, reactorId).find((attack) => {
    const constraint = attackTargetConstraint(attack);
    return (
      (attack.kind === "weapon" || attack.kind === "unarmedStrike") &&
      interruptAttackExecutionSelectionMatchesOption(selection, attack) &&
      constraint.kind === "meleeReach" &&
      state.combatants.has(targetId)
    );
  });
}

export function meleeWeaponOrUnarmedStrikeSelectionsForReactor(
  state: BattleState,
  reactorId: CombatantId,
  targetId: CombatantId,
): readonly BattleInterruptAttackExecutionSelection[] {
  return attackActionOptionsForActor(state, reactorId).flatMap((attack) => {
    if (attack.kind !== "weapon" && attack.kind !== "unarmedStrike") return [];
    const selection = attackExecutionSelectionForOption(attack);
    return attackTargetConstraint(attack).kind === "meleeReach" &&
      meleeWeaponOrUnarmedStrikeOptionForReactor(
        state,
        reactorId,
        targetId,
        selection,
      ) !== undefined
      ? [selection]
      : [];
  });
}

export type BattleOpportunityAttackExecutionCandidate = Readonly<{
  readonly reactorId: CombatantId;
  readonly selection: BattleOpportunityAttackSelection;
  readonly reachFeet: MovementFeet;
}>;

export function opportunityAttackThreatEqual(
  left: BattleOpportunityAttackThreat,
  right: BattleOpportunityAttackThreat,
): boolean {
  return (
    left.reactorId === right.reactorId &&
    interruptAttackExecutionSelectionsEqual(left, right)
  );
}

export function opportunityAttackLeavesReach(input: {
  readonly beforeDistanceFeet: MovementFeet;
  readonly afterDistanceFeet: MovementFeet;
  readonly reachFeet: MovementFeet;
}): boolean {
  return (
    Number(input.beforeDistanceFeet) <= Number(input.reachFeet) &&
    Number(input.afterDistanceFeet) > Number(input.reachFeet)
  );
}

export function opportunityAttackExecutionCandidates(
  state: BattleState,
  reactorId: CombatantId,
  moverId: CombatantId,
): readonly BattleOpportunityAttackExecutionCandidate[] {
  if (
    reactorId === moverId ||
    (moverId === currentActorId(state) &&
      state.currentTurnResources.disengaged) ||
    !combatantCanTakeReactions(state.combatants.get(reactorId)) ||
    !combatantCanSee(state, reactorId, moverId)
  ) {
    return [];
  }
  return attackActionOptionsForActor(state, reactorId).reduce<
    BattleOpportunityAttackExecutionCandidate[]
  >((candidates, option) => {
    const selection = attackExecutionSelectionForOption(option);
    const attack = opportunityAttackOptionForReactor(
      state,
      reactorId,
      moverId,
      selection,
    );
    if (attack === undefined) return candidates;
    const constraint = attackTargetConstraint(attack);
    if (
      constraint.kind !== "meleeReach" ||
      candidates.some((candidate) =>
        interruptAttackExecutionSelectionsEqual(candidate.selection, selection),
      )
    ) {
      return candidates;
    }
    return [
      ...candidates,
      { reactorId, selection, reachFeet: constraint.reachFeet },
    ];
  }, []);
}

export function attackKindForDeflectRedirect(
  attack: SupportedAttackActionOption,
): BattleAttackKindForRedirect {
  return attackTargetConstraint(attack).kind === "meleeReach"
    ? "melee"
    : "ranged";
}

export function attackHitTriggerKind(
  attack: SupportedAttackActionOption,
): BattleAttackHitTriggerKind {
  if (attack.kind === "weapon") {
    return attackTargetConstraint(attack).kind === "meleeReach"
      ? "meleeWeapon"
      : "rangedWeapon";
  }
  return attack.kind === "unarmedStrike" &&
    attackTargetConstraint(attack).kind === "meleeReach"
    ? "unarmedStrike"
    : "otherAttack";
}

export function grappleLinkForTarget(
  state: BattleState,
  grapplerId: CombatantId,
  targetId: CombatantId,
  facts: readonly BattleTargetSpatialFact[],
):
  | { readonly tag: "ok"; readonly link: BattleGrappleLink }
  | { readonly tag: "invalid"; readonly message: string } {
  const grappler = state.combatants.get(grapplerId);
  const target = state.combatants.get(targetId);
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    grappler === undefined ||
    target === undefined ||
    grapplerId === targetId
  ) {
    return {
      tag: "invalid",
      message: "Grapple target must be another combatant in this battle.",
    };
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (grappledBy(state, targetId) !== undefined) {
    return { tag: "invalid", message: "Grapple target is already Grappled." };
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (activeDruidWildShapeForm(grappler) !== null) {
    return {
      tag: "invalid",
      message:
        "Grapple while using a Beast form requires unsupported form anatomy and free-hand projection.",
    };
  }
  /* v8 ignore stop -- @preserve */
  const hand = firstFreeHand(state, grappler, state.grapples);
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (hand === undefined) {
    return { tag: "invalid", message: "Grapple requires a free hand." };
  }
  /* v8 ignore stop -- @preserve */
  const grapplerSize = combatantEffectiveSize(grappler);
  const targetSize = combatantEffectiveSize(target);
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!targetIsNoMoreThanOneSizeLarger(grapplerSize, targetSize)) {
    return {
      tag: "invalid",
      message: "Grapple target cannot be more than one size larger.",
    };
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !facts.some(
      (fact) =>
        fact.kind === "grappleTargetWithinReach" &&
        fact.grapplerId === grapplerId &&
        fact.targetId === targetId,
    )
  ) {
    return {
      tag: "invalid",
      message: "Grapple target must be within reach by table-supplied fact.",
    };
  }
  /* v8 ignore stop -- @preserve */
  return {
    tag: "ok",
    link: {
      grapplerId,
      targetId,
      escapeDc: unarmedStrikeSaveDc(grappler),
      reachFeet: movementFeet(5),
      hand,
    },
  };
}

export function shoveForTarget(
  state: BattleState,
  shoverId: CombatantId,
  targetId: CombatantId,
  facts: readonly BattleTargetSpatialFact[],
):
  | { readonly tag: "ok"; readonly dc: DifficultyClass }
  | { readonly tag: "invalid"; readonly message: string } {
  const shover = state.combatants.get(shoverId);
  const target = state.combatants.get(targetId);
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (shover === undefined || target === undefined || shoverId === targetId) {
    return {
      tag: "invalid",
      message: "Shove target must be another combatant in this battle.",
    };
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !targetIsNoMoreThanOneSizeLarger(
      combatantEffectiveSize(shover),
      combatantEffectiveSize(target),
    )
  ) {
    return {
      tag: "invalid",
      message: "Shove target cannot be more than one size larger.",
    };
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !facts.some(
      (fact) =>
        fact.kind === "shoveTargetWithinReach" &&
        fact.shoverId === shoverId &&
        fact.targetId === targetId,
    )
  ) {
    return {
      tag: "invalid",
      message: "Shove target must be within reach by table-supplied fact.",
    };
  }
  /* v8 ignore stop -- @preserve */
  return { tag: "ok", dc: unarmedStrikeSaveDc(shover) };
}

export function firstFreeHand(
  state: BattleState,
  combatant: BattleCreatureState,
  grapples: readonly BattleGrappleLink[],
): BattleHand | undefined {
  const hands = combatantHandUses(state, combatant, grapples);
  if (hands.left === "free") return "left";
  if (hands.right === "free") return "right";
  return undefined;
}

export function grappleEscapeDc(
  grappler: BattleCreatureState,
): DifficultyClass {
  return unarmedStrikeSaveDc(grappler);
}

export function unarmedStrikeSaveDc(
  combatant: BattleCreatureState,
): DifficultyClass {
  return difficultyClass(
    8 +
      unarmedStrikeSaveDcAbilityModifier(combatant) +
      combatantD20ProficiencyBonus(combatant),
  );
}

export function unarmedStrikeSaveDcAbilityModifier(
  combatant: BattleCreatureState,
): number {
  if (activeDruidWildShapeForm(combatant) !== null) {
    return combatantD20AbilityModifier(combatant, "str");
  }
  if (combatant.origin.kind === "statBlock") {
    return combatantD20AbilityModifier(combatant, "str");
  }
  return Number(combatant.origin.unarmedStrike.attackAbilityModifier);
}

export function combatantProficiencyBonus(
  combatant: BattleCreatureState,
): number {
  return combatantD20ProficiencyBonus(combatant);
}

const SIZE_RANKS: Readonly<Record<Size, number>> = {
  tiny: 0,
  small: 1,
  medium: 2,
  large: 3,
  huge: 4,
  gargantuan: 5,
};

export function targetIsNoMoreThanOneSizeLarger(
  grappler: Size,
  target: Size,
): boolean {
  return SIZE_RANKS[target] - SIZE_RANKS[grappler] <= 1;
}

export function creatureSizeIsLargerThanSelf(self: Size, other: Size): boolean {
  return SIZE_RANKS[other] > SIZE_RANKS[self];
}

export function grappleDragCostExempt(grappler: Size, target: Size): boolean {
  return target === "tiny" || SIZE_RANKS[grappler] - SIZE_RANKS[target] >= 2;
}

export function grapplerFastWrestlerDragCostExempt(
  grappler: Size,
  target: Size,
): boolean {
  return SIZE_RANKS[target] <= SIZE_RANKS[grappler];
}

export function grappleTargetExemptFromDragCost(
  grappler: BattleCreatureState,
  target: BattleCreatureState,
): boolean {
  const grapplerSize = combatantEffectiveSize(grappler);
  const targetSize = combatantEffectiveSize(target);
  return (
    grappleDragCostExempt(grapplerSize, targetSize) ||
    (combatantHasGrapplerSupportProfile(grappler) &&
      grapplerFastWrestlerDragCostExempt(grapplerSize, targetSize))
  );
}
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants
