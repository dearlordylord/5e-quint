// Attack roll mode/hole/ongoing-feature helpers extracted from
// battle-reducer.ts. Cluster T (attack_roll). Mechanical extraction — no
// behavior change. Cycle #20 resolved by importing the shared ongoing-feature
// helpers from ./ongoing-feature-helpers.ts instead of cycling through J.
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.weapon-mastery-sap

import {
  EMPTY_CONDITION_STATE,
  hasCondition,
  isIncapacitated,
} from "@dnd/shared-algebras/conditions-algebra";
import type { AttackRollMode } from "@dnd/shared-algebras/runtime-hole-algebra";
import type { UnitRecord } from "@dnd/surface/surface/types";
import type { CombatantId } from "../identity.ts";
import type {
  CharacterWeaponAttackActionOption,
  SupportedAttackActionOption,
} from "../battle-action-options.ts";
import type {
  OngoingFeatureDamageModifier,
  OngoingFeatureRollModifier,
  SupportedUnitFeatureProfile,
} from "../unit-feature-support.ts";
import { WEAPON_MASTERY_SAP_SUPPORT_PROFILE } from "../unit-feature-support.ts";
import {
  ATTACK_ROLL_HOLE_ID,
  ATTACK_ROLL_HOLE_INSTANCE,
  type AttackRollFeatureActivation,
  type BattleAttackRollHole,
  type BattleAttackRollResult,
  type BattleCreatureState,
  type BattleState,
  type BattleTargetSpatialFact,
} from "../battle-reducer.ts";
import {
  activeOngoingFeatureOccurrencesForCombatant,
  isCharacterBattleCreatureState,
  ongoingFeatureProfileForSourceKey,
  ongoingFeatureSourceKeyForUnit,
  unitRefSupportsProfile,
} from "./creature-state.ts";
import {
  attackActionBonusWithPassiveFeatureBonus,
  attackActionOptionName,
  attackRollMissToHitReplacementHolePayloadForAttacker,
} from "./statblock-attacks.ts";
import { attackTargetRangeBand, effectiveWalkSpeed } from "./movement-speed.ts";
import {
  combatantCanSee,
  combatantInvisibleBenefitDenied,
  combatantsAreEnemies,
  currentActorId,
  grappledBy,
} from "./creature-state-leaves.ts";
import {
  activeOngoingFeatureOccurrenceFromProfile,
  extendOngoingFeatureToEndOfNextTurn,
  ongoingFeatureProfileHasExtensionTrigger,
} from "./ongoing-feature-helpers.ts";
import { battleCreatureType } from "./domain-helpers.ts";

const WEAPON_MASTERY_SAP_UNIT_ID = "mastery_sap" satisfies UnitRecord["id"];

export function attackRollHole(
  attacker: BattleCreatureState | undefined,
  attack: SupportedAttackActionOption,
  rollMode?: AttackRollMode,
  ongoingFeatureActivations?: readonly AttackRollFeatureActivation[],
): BattleAttackRollHole {
  const name = attackActionOptionName(attack);
  return {
    kind: "attackRoll",
    holeId: ATTACK_ROLL_HOLE_ID,
    holeInstanceKey: ATTACK_ROLL_HOLE_INSTANCE,
    label: `${name} attack roll`,
    attack,
    attackBonus: attackActionBonusWithPassiveFeatureBonus(attacker, attack),
    ...(rollMode === undefined ? {} : { rollMode }),
    ...(ongoingFeatureActivations === undefined ||
    ongoingFeatureActivations.length === 0
      ? {}
      : { ongoingFeatureActivations }),
    ...(attacker === undefined
      ? {}
      : attackRollMissToHitReplacementHolePayloadForAttacker(attacker)),
  };
}

export function requiredAttackRollMode(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
  attack?: SupportedAttackActionOption,
  targetSpatialFacts: readonly BattleTargetSpatialFact[] = [],
): AttackRollMode | undefined {
  const attacker = state.combatants.get(attackerId);
  const target = state.combatants.get(targetId);
  const grapple = grappledBy(state, attackerId);
  const hiddenTargetDisadvantage =
    target?.hidden !== null &&
    target?.hidden !== undefined &&
    !combatantInvisibleBenefitDenied(target);
  const dodgeDisadvantage =
    attacker !== undefined &&
    target !== undefined &&
    hasDodgeAttackRollBenefit(state, target, attacker);
  const grappleDisadvantage =
    grapple !== undefined && grapple.grapplerId !== targetId;
  const longRangeDisadvantage =
    attack !== undefined &&
    attackTargetRangeBand(targetSpatialFacts, attackerId, targetId, attack) ===
      "long";
  const hasAdvantage =
    (attacker?.hidden !== null &&
      attacker?.hidden !== undefined &&
      !combatantInvisibleBenefitDenied(attacker)) ||
    state.helpAttacks.some(
      (help) => help.allyId === attackerId && help.targetEnemyId === targetId,
    ) ||
    activeEffectGrantsAttackRollMode(state, attacker, target, "advantage") ||
    ongoingFeatureGrantsAttackRollMode(attacker, target, "advantage", attack);
  const hasDisadvantage =
    hiddenTargetDisadvantage ||
    dodgeDisadvantage ||
    grappleDisadvantage ||
    longRangeDisadvantage ||
    hasCondition(attacker?.conditions ?? EMPTY_CONDITION_STATE, "poisoned") ||
    activeEffectGrantsAttackRollMode(state, attacker, target, "disadvantage") ||
    ongoingFeatureGrantsAttackRollMode(
      attacker,
      target,
      "disadvantage",
      attack,
    );
  return attackRollModeFromSources(hasAdvantage, hasDisadvantage);
}

export function requiredObjectTargetAttackRollMode(
  state: BattleState,
  attackerId: CombatantId,
): AttackRollMode | undefined {
  const attacker = state.combatants.get(attackerId);
  const hasAdvantage = activeEffectGrantsAttackRollMode(
    state,
    attacker,
    undefined,
    "advantage",
  );
  const hasDisadvantage =
    hasCondition(attacker?.conditions ?? EMPTY_CONDITION_STATE, "poisoned") ||
    activeEffectGrantsAttackRollMode(
      state,
      attacker,
      undefined,
      "disadvantage",
    );
  return attackRollModeFromSources(hasAdvantage, hasDisadvantage);
}

function attackRollModeFromSources(
  hasAdvantage: boolean,
  hasDisadvantage: boolean,
): AttackRollMode | undefined {
  if (hasAdvantage && !hasDisadvantage) return "advantage";
  if (hasDisadvantage && !hasAdvantage) return "disadvantage";
  return undefined;
}

export function attackRollHasAdvantageSource(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
  attack?: SupportedAttackActionOption,
): boolean {
  const attacker = state.combatants.get(attackerId);
  const target = state.combatants.get(targetId);
  return (
    (attacker?.hidden !== null &&
      attacker?.hidden !== undefined &&
      !combatantInvisibleBenefitDenied(attacker)) ||
    state.helpAttacks.some(
      (help) => help.allyId === attackerId && help.targetEnemyId === targetId,
    ) ||
    activeEffectGrantsAttackRollMode(state, attacker, target, "advantage") ||
    ongoingFeatureGrantsAttackRollMode(attacker, target, "advantage", attack)
  );
}

export function attackRollModeWithOptionalOngoingFeature(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
  attack: SupportedAttackActionOption,
  targetSpatialFacts: readonly BattleTargetSpatialFact[],
  activatedOngoingFeatureUnitId: UnitRecord["id"] | undefined,
): AttackRollMode | undefined {
  const baseline = requiredAttackRollMode(
    state,
    attackerId,
    targetId,
    attack,
    targetSpatialFacts,
  );
  if (activatedOngoingFeatureUnitId === undefined) {
    return baseline;
  }
  if (baseline === "disadvantage") {
    return undefined;
  }
  if (
    baseline === undefined &&
    attackRollHasAdvantageSource(state, attackerId, targetId, attack)
  ) {
    return undefined;
  }
  return "advantage";
}

export function attackRollOngoingFeatureActivations(
  state: BattleState,
  attackerId: CombatantId,
  attack: SupportedAttackActionOption,
): readonly AttackRollFeatureActivation[] {
  const attacker = state.combatants.get(attackerId);
  if (
    !isCharacterBattleCreatureState(attacker) ||
    state.currentTurnResources.attackRollMadeThisTurn ||
    attack.kind !== "weapon"
  ) {
    return [];
  }
  return [...attacker.origin.ongoingFeatureProfiles.values()].flatMap(
    (unitFeature): readonly AttackRollFeatureActivation[] => {
      if (
        unitFeature.activationTrigger !== "firstAttackRoll" ||
        unitFeature.spendsUse ||
        activeOngoingFeatureOccurrencesForCombatant(attacker).has(
          ongoingFeatureSourceKeyForUnit(unitFeature.unit.id),
        ) ||
        !unitFeature.rollModifiers.some(
          (modifier) =>
            modifier.affects === "selfRoll" &&
            modifier.mode === "advantage" &&
            attackAbilityMatchesModifier(attack, modifier),
        )
      ) {
        return [];
      }
      return [
        {
          unitId: unitFeature.unit.id,
          label: unitFeature.unit.name,
          rollMode: "advantage" as const,
        },
      ];
    },
  );
}

export function attackRollOngoingFeatureActivationProfile(
  state: BattleState,
  attackerId: CombatantId,
  attack: SupportedAttackActionOption,
  unitId: UnitRecord["id"] | undefined,
  allowAlreadyActiveReplay: boolean,
): Extract<
  SupportedUnitFeatureProfile,
  { readonly kind: "ongoingFeature" }
> | null {
  if (unitId === undefined) return null;
  const attacker = state.combatants.get(attackerId);
  if (!isCharacterBattleCreatureState(attacker)) return null;
  const unitFeature = attacker.origin.ongoingFeatureProfiles.get(
    ongoingFeatureSourceKeyForUnit(unitId),
  );
  if (
    unitFeature?.kind !== "ongoingFeature" ||
    unitFeature.activationTrigger !== "firstAttackRoll" ||
    !(
      attackRollOngoingFeatureActivations(state, attackerId, attack).some(
        (option) => option.unitId === unitId,
      ) ||
      (allowAlreadyActiveReplay &&
        activeOngoingFeatureOccurrencesForCombatant(attacker).has(
          ongoingFeatureSourceKeyForUnit(unitId),
        ))
    )
  ) {
    return null;
  }
  return unitFeature;
}

export function ongoingFeatureGrantsAttackRollMode(
  attacker: BattleCreatureState | undefined,
  target: BattleCreatureState | undefined,
  mode: AttackRollMode,
  attack?: SupportedAttackActionOption,
): boolean {
  const outgoing =
    isCharacterBattleCreatureState(attacker) &&
    target !== undefined &&
    [...activeOngoingFeatureOccurrencesForCombatant(attacker)].some(([key]) =>
      ongoingFeatureProfileForSourceKey(attacker, key)?.rollModifiers.some(
        (modifier) =>
          modifier.mode === mode &&
          modifier.affects === "selfRoll" &&
          modifier.on === "attackRoll" &&
          attackAbilityMatchesModifier(
            attack?.kind === "weapon" ? attack : null,
            modifier,
          ),
      ),
    );
  const incoming =
    isCharacterBattleCreatureState(target) &&
    [...activeOngoingFeatureOccurrencesForCombatant(target)].some(([key]) =>
      ongoingFeatureProfileForSourceKey(target, key)?.rollModifiers.some(
        (modifier) =>
          modifier.mode === mode &&
          modifier.affects === "rollsAgainstSelf" &&
          modifier.on === "attackRoll" &&
          attackAbilityMatchesModifier(
            attack?.kind === "weapon" ? attack : null,
            modifier,
          ),
      ),
    );
  return outgoing || incoming;
}

export function activeEffectGrantsAttackRollMode(
  state: BattleState,
  attacker: BattleCreatureState | undefined,
  target: BattleCreatureState | undefined,
  mode: AttackRollMode,
): boolean {
  const attackerCreatureType =
    attacker === undefined ? null : battleCreatureType(attacker);
  return (
    attacker?.activeEffects.some(
      (effect) =>
        effect.kind === "nextAttackRollBySelf" && effect.mode === mode,
    ) === true ||
    target?.activeEffects.some(
      (effect) =>
        (effect.kind === "nextAttackRollAgainstSelf" && effect.mode === mode) ||
        (effect.kind === "faerieFireOutline" &&
          mode === "advantage" &&
          attacker !== undefined &&
          target !== undefined &&
          combatantCanSee(state, attacker.combatantId, target.combatantId)) ||
        (effect.kind === "creatureTypeProtection" &&
          effect.attackRollMode === mode &&
          attackerCreatureType !== null &&
          effect.protectedAgainstCreatureTypes.includes(attackerCreatureType)),
    ) === true
  );
}

export function attackAbilityMatchesModifier(
  attack: CharacterWeaponAttackActionOption | null | undefined,
  modifier: OngoingFeatureRollModifier | OngoingFeatureDamageModifier,
): boolean {
  return (
    modifier.abilityFilter === undefined ||
    (attack !== null &&
      attack !== undefined &&
      modifier.abilityFilter.includes(attack.ability))
  );
}

export function hasDodgeBenefit(
  state: BattleState,
  target: BattleCreatureState,
): boolean {
  return (
    target.dodging &&
    !isIncapacitated(target.conditions) &&
    Number(
      effectiveWalkSpeed(
        target,
        state.grapples.some(
          (grapple) => grapple.targetId === target.combatantId,
        ),
      ),
    ) > 0
  );
}

export function hasDodgeAttackRollBenefit(
  state: BattleState,
  target: BattleCreatureState,
  attacker: BattleCreatureState,
): boolean {
  return (
    hasDodgeBenefit(state, target) &&
    !hasCondition(target.conditions, "blinded") &&
    attacker.hidden === null
  );
}

export function consumeHelpAttackForAttackRoll(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
): BattleState {
  const helpIndex = state.helpAttacks.findIndex(
    (help) => help.allyId === attackerId && help.targetEnemyId === targetId,
  );
  const withoutOneShotEffects = consumeOneShotAttackRollEffects(
    state,
    attackerId,
    targetId,
  );
  if (helpIndex === -1) return withoutOneShotEffects;
  return {
    ...withoutOneShotEffects,
    helpAttacks: withoutOneShotEffects.helpAttacks.filter(
      (_, index) => index !== helpIndex,
    ),
  };
}

export function applyWeaponMasterySapOnHit(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
  attack: SupportedAttackActionOption,
): BattleState {
  if (attack.kind !== "weapon") {
    return state;
  }
  const attacker = state.combatants.get(attackerId);
  const target = state.combatants.get(targetId);
  const hasSelectedWeaponMastery = isCharacterBattleCreatureState(attacker)
    ? attacker.origin.weaponMasteries.find(
        (mastery) => mastery.weaponUnitId === attack.weapon.id,
      )
    : undefined;
  if (
    !isCharacterBattleCreatureState(attacker) ||
    target === undefined ||
    attack.weapon.mastery !== "sap" ||
    hasSelectedWeaponMastery === undefined ||
    !unitRefSupportsProfile(
      attacker.origin.characterUnitRefs,
      WEAPON_MASTERY_SAP_UNIT_ID,
      WEAPON_MASTERY_SAP_SUPPORT_PROFILE,
    )
  ) {
    return state;
  }
  const activeEffects = [
    ...target.activeEffects.filter(
      (effect) =>
        !(
          effect.kind === "nextAttackRollBySelf" &&
          "sourceUnitId" in effect &&
          effect.sourceCombatantId === attackerId
        ),
    ),
    {
      kind: "nextAttackRollBySelf",
      sourceUnitId: WEAPON_MASTERY_SAP_UNIT_ID,
      sourceCombatantId: attackerId,
      mode: "disadvantage",
      expiresAt: { kind: "startOfTurn", combatantId: attackerId },
    } as const,
  ];
  return {
    ...state,
    combatants: new Map(state.combatants).set(targetId, {
      ...target,
      activeEffects,
    }),
  };
}

export function consumeSelfAttackRollEffects(
  state: BattleState,
  attackerId: CombatantId,
): BattleState {
  const attacker = state.combatants.get(attackerId);
  if (attacker === undefined) {
    return state;
  }
  const activeEffects = attacker.activeEffects.filter(
    (effect) => effect.kind !== "nextAttackRollBySelf",
  );
  if (activeEffects.length === attacker.activeEffects.length) {
    return state;
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(attackerId, {
      ...attacker,
      activeEffects,
    }),
  };
}

export function consumeOneShotAttackRollEffects(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
): BattleState {
  const stateWithoutSelfEffects = consumeSelfAttackRollEffects(
    state,
    attackerId,
  );
  const target = state.combatants.get(targetId);
  const combatants = new Map(stateWithoutSelfEffects.combatants);
  let changed = false;
  if (target !== undefined) {
    const activeEffects = target.activeEffects.filter(
      (effect) => effect.kind !== "nextAttackRollAgainstSelf",
    );
    if (activeEffects.length !== target.activeEffects.length) {
      changed = true;
      combatants.set(targetId, { ...target, activeEffects });
    }
  }
  return changed
    ? { ...stateWithoutSelfEffects, combatants }
    : stateWithoutSelfEffects;
}

export function extendAttackRollOngoingFeatures(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
): BattleState {
  if (!combatantsAreEnemies(state, attackerId, targetId)) {
    return state;
  }
  const attacker = state.combatants.get(attackerId);
  if (attacker === undefined) return state;
  const activeOngoingFeatureOccurrences =
    activeOngoingFeatureOccurrencesForCombatant(attacker);
  if (
    ![...activeOngoingFeatureOccurrences].some(([key]) =>
      ongoingFeatureProfileHasExtensionTrigger(
        ongoingFeatureProfileForSourceKey(attacker, key),
        "attackRollAgainstEnemy",
      ),
    )
  ) {
    return state;
  }
  const nextOccurrences = new Map(attacker.activeOngoingFeatureOccurrences);
  for (const [key, occurrence] of activeOngoingFeatureOccurrences) {
    if (
      ongoingFeatureProfileHasExtensionTrigger(
        ongoingFeatureProfileForSourceKey(attacker, key),
        "attackRollAgainstEnemy",
      )
    ) {
      nextOccurrences.set(
        key,
        extendOngoingFeatureToEndOfNextTurn(state, attackerId, occurrence),
      );
    }
  }
  const nextActor = {
    ...attacker,
    activeOngoingFeatureOccurrences: nextOccurrences,
  };
  return {
    ...state,
    combatants: new Map(state.combatants).set(attackerId, nextActor),
  };
}

export function extendSavingThrowOngoingFeatures(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
): BattleState {
  if (
    !targetIds.some((targetId) =>
      combatantsAreEnemies(state, actorId, targetId),
    )
  ) {
    return state;
  }
  const actor = state.combatants.get(actorId);
  if (actor === undefined) return state;
  const activeOngoingFeatureOccurrences =
    activeOngoingFeatureOccurrencesForCombatant(actor);
  if (
    ![...activeOngoingFeatureOccurrences].some(([key]) =>
      ongoingFeatureProfileHasExtensionTrigger(
        ongoingFeatureProfileForSourceKey(actor, key),
        "enemySavingThrow",
      ),
    )
  ) {
    return state;
  }
  const nextOccurrences = new Map(actor.activeOngoingFeatureOccurrences);
  for (const [key, occurrence] of activeOngoingFeatureOccurrences) {
    if (
      ongoingFeatureProfileHasExtensionTrigger(
        ongoingFeatureProfileForSourceKey(actor, key),
        "enemySavingThrow",
      )
    ) {
      nextOccurrences.set(
        key,
        extendOngoingFeatureToEndOfNextTurn(state, actorId, occurrence),
      );
    }
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(actorId, {
      ...actor,
      activeOngoingFeatureOccurrences: nextOccurrences,
    }),
  };
}

export function recordAttackRollOngoingFeatures(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
  activatedOngoingFeatureProfile: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "ongoingFeature" }
  > | null,
): BattleState {
  const attacker = state.combatants.get(attackerId);
  if (attacker === undefined || attackerId !== currentActorId(state)) {
    return state;
  }
  const withActivatedOngoingFeature =
    activatedOngoingFeatureProfile === null
      ? state
      : stateWithActiveOngoingFeatureOccurrence(
          state,
          attacker,
          attackerId,
          activatedOngoingFeatureProfile,
        );
  const withExtendedOngoingFeatures = extendAttackRollOngoingFeatures(
    withActivatedOngoingFeature,
    attackerId,
    targetId,
  );
  return {
    ...withExtendedOngoingFeatures,
    currentTurnResources: {
      ...withExtendedOngoingFeatures.currentTurnResources,
      attackRollMadeThisTurn: true,
    },
  };
}

export function stateWithActiveOngoingFeatureOccurrence(
  state: BattleState,
  actor: BattleCreatureState,
  actorId: CombatantId,
  profile: Extract<
    SupportedUnitFeatureProfile,
    { readonly kind: "ongoingFeature" }
  >,
): BattleState {
  const occurrences = new Map(actor.activeOngoingFeatureOccurrences);
  occurrences.set(
    ongoingFeatureSourceKeyForUnit(profile.unit.id),
    activeOngoingFeatureOccurrenceFromProfile(state, actorId, profile),
  );
  return {
    ...state,
    combatants: new Map(state.combatants).set(actorId, {
      ...actor,
      activeOngoingFeatureOccurrences: occurrences,
    }),
  };
}

export function attackRollModeMatches(
  roll: BattleAttackRollResult,
  requiredMode: AttackRollMode | undefined,
): boolean {
  return requiredMode === undefined || roll.rollMode === requiredMode;
}
