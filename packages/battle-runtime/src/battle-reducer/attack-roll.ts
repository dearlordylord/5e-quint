// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-d20-lifecycle
// Attack roll mode/hole/ongoing-feature helpers extracted from
// battle-reducer.ts. Cluster T (attack_roll). Mechanical extraction — no
// behavior change. Cycle #20 resolved by importing the shared ongoing-feature
// helpers from ./ongoing-feature-helpers.ts instead of cycling through J.
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.weapon-mastery-sap unit-feature.weapon-mastery-topple unit-feature.weapon-mastery-cleave spell.invocation-object-contact-damage
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS BATTLE.SPELL.SAVE_GATED_ATTACK_ROLL_ADVANTAGE BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_D20_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CREATURE_TYPE_PROTECTION_AND_CONDITION_PREVENTION

import {
  applyCondition,
  EMPTY_CONDITION_STATE,
  hasCondition,
  isIncapacitated,
} from "@dnd/shared-algebras/conditions-algebra";
import type { AttackRollMode } from "@dnd/shared-algebras/runtime-hole-algebra";
import {
  abilityModifier,
  difficultyClass,
  type Ability,
  type ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
import type { UnitRecord } from "@dnd/surface/surface/types";
import type { BattleObjectId, CombatantId } from "../identity.ts";
import {
  effectiveCharacterBattleCantrips,
  effectiveCharacterBattlePreparedSpells,
} from "../character-battle-resources.ts";
import type {
  CharacterUnarmedStrikeActionOption,
  CharacterWeaponAttackActionOption,
  CharacterWeaponAttackAbilityChoice,
  SupportedAttackActionOption,
} from "../battle-action-options.ts";
import type {
  OngoingFeatureDamageModifier,
  OngoingFeatureRollModifier,
  SupportedUnitFeatureProfile,
} from "../unit-feature-support.ts";
import {
  WEAPON_MASTERY_SAP_SUPPORT_PROFILE,
  WEAPON_MASTERY_TOPPLE_SUPPORT_PROFILE,
  WEAPON_MASTERY_CLEAVE_SUPPORT_PROFILE,
  ongoingFeatureSpellModifierSourceClassName,
} from "../unit-feature-support.ts";
import {
  ATTACK_ROLL_HOLE_ID,
  ATTACK_ROLL_HOLE_INSTANCE,
  type AttackRollFeatureActivation,
  type BattleActiveEffect,
  type BattleAttackRollHole,
  type BattleDamageRollHole,
  type BattleAttackRollResult,
  type BattleCreatureState,
  type BattleFill,
  type BattleTargetChoiceHole,
  type BattleUnitFeatureSavingThrowOutcomeHole,
  type BattleUnitFeatureDecisionHole,
  type BattleLightEmitter,
  type BattleObjectOutline,
  type BattleState,
  type BattleTargetSpatialFact,
  type SupportedSpellInvocation,
} from "../battle-reducer.ts";
import {
  activeOngoingFeatureOccurrencesForCombatant,
  battleCreatureStateWithKnockOutPreservedConditions,
  isCharacterBattleCreatureState,
  ongoingFeatureProfileForSourceKey,
  ongoingFeatureSourceKeyForUnit,
  unitRefSupportsProfile,
} from "./creature-state.ts";
import {
  attackActionBonusWithPassiveFeatureBonus,
  attackActionOptionName,
  attackTargetConstraint,
  attackRollMissToHitReplacementHolePayloadForAttacker,
} from "./statblock-attacks.ts";
import {
  activeRageSourceKeysForFrenzy,
  ongoingFeatureProfileIsRecklessAttackForFrenzy,
} from "./barbarian-frenzy.ts";
import {
  attackTargetIsLegal,
  attackTargetRangeBand,
  effectiveWalkSpeed,
} from "./movement-speed.ts";
import {
  combatantCanSee,
  combatantInvisibleBenefitDenied,
  combatantsAreEnemies,
  currentActorId,
  grappledBy,
} from "./creature-state-leaves.ts";
import { ongoingSpellEffectSuppressedByAntimagicField } from "./antimagic-field-suppression.ts";
import {
  activeOngoingFeatureOccurrenceFromProfile,
  extendOngoingFeatureToEndOfNextTurn,
  ongoingFeatureProfileHasExtensionTrigger,
} from "./ongoing-feature-helpers.ts";
import { battleCreatureType } from "./domain-helpers.ts";
import {
  combatantsAfterConcentrationSpellEffectsEndedIfNoEffectsForSources,
  spellConcentrationEffectSourceFromEffect,
} from "./spell-condition-effects-helpers.ts";
import {
  WEAPON_MASTERY_TOPPLE_SAVE_HOLE_ID,
  WEAPON_MASTERY_TOPPLE_SAVE_HOLE_INSTANCE,
  WEAPON_MASTERY_CLEAVE_ATTACK_ROLL_HOLE_ID,
  WEAPON_MASTERY_CLEAVE_ATTACK_ROLL_HOLE_INSTANCE,
  WEAPON_MASTERY_CLEAVE_DAMAGE_HOLE_ID,
  WEAPON_MASTERY_CLEAVE_DAMAGE_HOLE_INSTANCE,
  WEAPON_MASTERY_CLEAVE_DECISION_HOLE_ID,
  WEAPON_MASTERY_CLEAVE_DECISION_HOLE_INSTANCE,
  WEAPON_MASTERY_CLEAVE_TARGET_HOLE_ID,
  WEAPON_MASTERY_CLEAVE_TARGET_HOLE_INSTANCE,
} from "./domain-constants.ts";
import { combatantProficiencyBonus } from "./movement-speed.ts";
import {
  savingThrowFlatBonusProjections,
  savingThrowRollModeProjections,
} from "./spells-damage-fills.ts";
import { weaponAttackDamageExpression } from "./statblock-attacks.ts";

const WEAPON_MASTERY_SAP_UNIT_ID = "mastery_sap" satisfies UnitRecord["id"];
const WEAPON_MASTERY_TOPPLE_UNIT_ID =
  "mastery_topple" satisfies UnitRecord["id"];
const WEAPON_MASTERY_CLEAVE_UNIT_ID =
  "mastery_cleave" satisfies UnitRecord["id"];

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
  const sources = attackRollSourceFlags(
    state,
    attackerId,
    targetId,
    attack,
    targetSpatialFacts,
  );
  return attackRollModeFromSources(
    sources.hasAdvantage,
    sources.hasDisadvantage,
  );
}

type AttackRollSourceFlags = {
  readonly hasAdvantage: boolean;
  readonly hasDisadvantage: boolean;
};

function attackRollSourceFlags(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
  attack?: SupportedAttackActionOption,
  targetSpatialFacts: readonly BattleTargetSpatialFact[] = [],
): AttackRollSourceFlags {
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
  const sightAdvantage = hasAttackSightFact(
    targetSpatialFacts,
    "attackTargetCannotSeeAttacker",
    attackerId,
    targetId,
  );
  const sightDisadvantage = hasAttackSightFact(
    targetSpatialFacts,
    "attackAttackerCannotSeeTarget",
    attackerId,
    targetId,
  );
  const attackerCanSeeTarget =
    attacker !== undefined &&
    target !== undefined &&
    !sightDisadvantage &&
    combatantCanSee(state, attacker.combatantId, target.combatantId);
  const hasAdvantage =
    sightAdvantage ||
    (attacker?.hidden !== null &&
      attacker?.hidden !== undefined &&
      !combatantInvisibleBenefitDenied(attacker)) ||
    state.helpAttacks.some(
      (help) => help.allyId === attackerId && help.targetEnemyId === targetId,
    ) ||
    activeEffectGrantsAttackRollMode(state, attacker, target, "advantage", {
      attackerCanSeeTarget,
      attack,
    }) ||
    ongoingFeatureGrantsAttackRollMode(attacker, target, "advantage", attack);
  const hasDisadvantage =
    sightDisadvantage ||
    hiddenTargetDisadvantage ||
    dodgeDisadvantage ||
    grappleDisadvantage ||
    longRangeDisadvantage ||
    hasCondition(attacker?.conditions ?? EMPTY_CONDITION_STATE, "poisoned") ||
    activeEffectGrantsAttackRollMode(state, attacker, target, "disadvantage", {
      attackerCanSeeTarget,
      attack,
      targetSpatialFacts,
    }) ||
    ongoingFeatureGrantsAttackRollMode(
      attacker,
      target,
      "disadvantage",
      attack,
    );
  return { hasAdvantage, hasDisadvantage };
}

type AttackSightSpatialFactKind =
  | "attackAttackerCannotSeeTarget"
  | "attackTargetCannotSeeAttacker";

function hasAttackSightFact(
  facts: readonly BattleTargetSpatialFact[],
  kind: AttackSightSpatialFactKind,
  attackerId: CombatantId,
  targetId: CombatantId,
): boolean {
  return facts.some(
    (fact) =>
      fact.kind === kind &&
      fact.attackerId === attackerId &&
      fact.targetId === targetId,
  );
}

export function requiredObjectTargetAttackRollMode(
  state: BattleState,
  attackerId: CombatantId,
  targetObjectId: BattleObjectId | undefined,
  attackerCanSeeObject: boolean | undefined,
): AttackRollMode | undefined {
  const sources = objectTargetAttackRollSourceFlags(
    state,
    attackerId,
    targetObjectId,
    attackerCanSeeObject,
  );
  return attackRollModeFromSources(
    sources.hasAdvantage,
    sources.hasDisadvantage,
  );
}

function objectTargetAttackRollSourceFlags(
  state: BattleState,
  attackerId: CombatantId,
  targetObjectId: BattleObjectId | undefined,
  attackerCanSeeObject: boolean | undefined,
): AttackRollSourceFlags {
  const attacker = state.combatants.get(attackerId);
  const hasAdvantage =
    activeEffectGrantsAttackRollMode(state, attacker, undefined, "advantage") ||
    objectOutlineGrantsAttackRollAdvantage(
      state.objectOutlines,
      targetObjectId,
      attackerCanSeeObject,
    );
  const hasDisadvantage =
    hasCondition(attacker?.conditions ?? EMPTY_CONDITION_STATE, "poisoned") ||
    activeEffectGrantsAttackRollMode(
      state,
      attacker,
      undefined,
      "disadvantage",
    );
  return { hasAdvantage, hasDisadvantage };
}

export function requiredSpellObjectTargetAttackRollMode(
  state: BattleState,
  attackerId: CombatantId,
  invocation: SupportedSpellInvocation,
  targetObjectId: BattleObjectId,
  attackerCanSeeObject: boolean | undefined,
): AttackRollMode | undefined {
  const attacker = state.combatants.get(attackerId);
  const sources = objectTargetAttackRollSourceFlags(
    state,
    attackerId,
    targetObjectId,
    attackerCanSeeObject,
  );
  const hasAdvantage =
    sources.hasAdvantage ||
    ongoingFeatureGrantsSpellAttackRollMode(attacker, invocation, "advantage");
  const hasDisadvantage =
    sources.hasDisadvantage ||
    ongoingFeatureGrantsSpellAttackRollMode(
      attacker,
      invocation,
      "disadvantage",
    );
  return attackRollModeFromSources(hasAdvantage, hasDisadvantage);
}

export function objectTargetAttackNeedsSightFact(
  state: BattleState,
  targetObjectId: BattleObjectId,
): boolean {
  return state.objectOutlines.some(
    (outline) => outline.objectId === targetObjectId,
  );
}

export function objectInvisibleBenefitDenied(
  state: BattleState,
  targetObjectId: BattleObjectId,
): boolean {
  return (
    state.objectOutlines.some(
      (outline) => outline.objectId === targetObjectId,
    ) ||
    state.lightEmitters.some((emitter) =>
      objectLightEmitterDeniesInvisibleBenefit(emitter, targetObjectId),
    )
  );
}

function objectLightEmitterDeniesInvisibleBenefit(
  emitter: BattleLightEmitter,
  targetObjectId: BattleObjectId,
): boolean {
  return (
    emitter.kind === "objectInvisibleRevealLightEmitter" &&
    emitter.objectId === targetObjectId
  );
}

function objectOutlineGrantsAttackRollAdvantage(
  outlines: readonly BattleObjectOutline[],
  targetObjectId: BattleObjectId | undefined,
  attackerCanSeeObject: boolean | undefined,
): boolean {
  return (
    targetObjectId !== undefined &&
    attackerCanSeeObject === true &&
    outlines.some((outline) => outline.objectId === targetObjectId)
  );
}

export function requiredSpellAttackRollMode(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
  invocation: SupportedSpellInvocation,
  targetSpatialFacts: readonly BattleTargetSpatialFact[] = [],
): AttackRollMode | undefined {
  const attacker = state.combatants.get(attackerId);
  const sources = attackRollSourceFlags(
    state,
    attackerId,
    targetId,
    undefined,
    targetSpatialFacts,
  );
  const hasAdvantage =
    sources.hasAdvantage ||
    ongoingFeatureGrantsSpellAttackRollMode(attacker, invocation, "advantage");
  const hasDisadvantage =
    sources.hasDisadvantage ||
    ongoingFeatureGrantsSpellAttackRollMode(
      attacker,
      invocation,
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
  targetSpatialFacts: readonly BattleTargetSpatialFact[] = [],
): boolean {
  return attackRollSourceFlags(
    state,
    attackerId,
    targetId,
    attack,
    targetSpatialFacts,
  ).hasAdvantage;
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
    attackRollHasAdvantageSource(
      state,
      attackerId,
      targetId,
      attack,
      targetSpatialFacts,
    )
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
    (attack.kind !== "weapon" && attack.kind !== "unarmedStrike")
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
            attack?.kind === "weapon" || attack?.kind === "unarmedStrike"
              ? attack
              : null,
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
            attack?.kind === "weapon" || attack?.kind === "unarmedStrike"
              ? attack
              : null,
            modifier,
          ),
      ),
    );
  return outgoing || incoming;
}

function ongoingFeatureGrantsSpellAttackRollMode(
  attacker: BattleCreatureState | undefined,
  invocation: SupportedSpellInvocation,
  mode: AttackRollMode,
): boolean {
  return (
    isCharacterBattleCreatureState(attacker) &&
    spellInvocationIsFromSpellcastingSource(attacker, invocation) &&
    [...activeOngoingFeatureOccurrencesForCombatant(attacker)].some(([key]) => {
      const profile = ongoingFeatureProfileForSourceKey(attacker, key);
      return (
        profile !== null &&
        ongoingFeatureSpellModifierSourceClassName(profile) ===
          attacker.origin.spellcasting?.sourceClassName &&
        profile.spellModifiers.some(
          (modifier) => modifier.attackRollMode === mode,
        )
      );
    })
  );
}

function spellInvocationIsFromSpellcastingSource(
  combatant: BattleCreatureState | undefined,
  invocation: SupportedSpellInvocation,
): boolean {
  if (!isCharacterBattleCreatureState(combatant)) {
    return false;
  }
  const spellcasting = combatant.origin.spellcasting;
  return (
    spellcasting !== undefined &&
    [
      ...effectiveCharacterBattleCantrips(spellcasting),
      ...effectiveCharacterBattlePreparedSpells(spellcasting),
    ].some((spell) => spell.id === invocation.spell.id)
  );
}

export function activeEffectGrantsAttackRollMode(
  state: BattleState,
  attacker: BattleCreatureState | undefined,
  target: BattleCreatureState | undefined,
  mode: AttackRollMode,
  context: {
    readonly attack?: SupportedAttackActionOption | undefined;
    readonly attackerCanSeeTarget?: boolean;
    readonly targetSpatialFacts?: readonly BattleTargetSpatialFact[];
  } = {},
): boolean {
  const attackerCreatureType =
    attacker === undefined ? null : battleCreatureType(attacker);
  const attackerCanSeeTarget =
    context.attackerCanSeeTarget ??
    (attacker !== undefined &&
      target !== undefined &&
      combatantCanSee(state, attacker.combatantId, target.combatantId));
  return (
    attacker?.activeEffects.some(
      (effect) =>
        (effect.kind === "nextAttackRollBySelf" ||
          (effect.kind === "abilityD20TestRollModeEndTurnSave" &&
            attackUsesAbility(context.attack, effect.ability)) ||
          (effect.kind === "selfAttackRollAndAbilityCheckRollMode" &&
            !ongoingSpellEffectSuppressedByAntimagicField(state, {
              kind: "spellActiveEffect",
              activeEffectKind: "spellObjectContactDamage",
              sourceEffectId: effect.sourceEffectId,
            }))) &&
        effect.mode === mode,
    ) === true ||
    target?.activeEffects.some(
      (effect) =>
        (effect.kind === "nextAttackRollAgainstSelf" && effect.mode === mode) ||
        (effect.kind === "faerieFireOutline" &&
          mode === "advantage" &&
          attackerCanSeeTarget) ||
        (effect.kind === "shiningSmiteIllumination" && mode === "advantage") ||
        (effect.kind === "creatureTypeProtection" &&
          effect.attackRollMode === mode &&
          attackerCreatureType !== null &&
          effect.protectedAgainstCreatureTypes.includes(
            attackerCreatureType,
          )) ||
        (effect.kind === "blurred" &&
          mode === "disadvantage" &&
          attacker !== undefined &&
          target !== undefined &&
          !attackerPerceivesBlurredTargetWithBypassSense(
            context.targetSpatialFacts ?? [],
            attacker.combatantId,
            target.combatantId,
          )),
    ) === true
  );
}

function attackerPerceivesBlurredTargetWithBypassSense(
  facts: readonly BattleTargetSpatialFact[],
  attackerId: CombatantId,
  targetId: CombatantId,
): boolean {
  return facts.some(
    (fact) =>
      fact.kind === "attackAttackerPerceivesBlurredTargetWithSense" &&
      fact.attackerId === attackerId &&
      fact.targetId === targetId,
  );
}

function attackUsesAbility(
  attack: SupportedAttackActionOption | undefined,
  ability: Ability,
): boolean {
  if (attack?.kind === "weapon") {
    return attack.ability === ability;
  }
  if (attack?.kind === "unarmedStrike") {
    return attack.attackAbility === ability;
  }
  return false;
}

export function attackAbilityMatchesModifier(
  attack:
    | CharacterWeaponAttackActionOption
    | CharacterUnarmedStrikeActionOption
    | null
    | undefined,
  modifier: OngoingFeatureRollModifier | OngoingFeatureDamageModifier,
): boolean {
  const ability =
    attack?.kind === "weapon"
      ? attack.ability
      : attack?.kind === "unarmedStrike"
        ? attack.attackAbility
        : undefined;
  if (modifier.abilityFilter === undefined) {
    return true;
  }
  return (
    ability !== undefined &&
    ability !== "spellcasting" &&
    modifier.abilityFilter.includes(ability)
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

export function weaponMasteryToppleSavingThrowHole(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
  attack: SupportedAttackActionOption,
): BattleUnitFeatureSavingThrowOutcomeHole | null {
  if (!weaponMasteryToppleApplies(state, attackerId, targetId, attack)) {
    return null;
  }
  const attacker = state.combatants.get(attackerId);
  if (attacker === undefined) {
    return null;
  }
  return {
    kind: "savingThrowOutcome",
    holeId: WEAPON_MASTERY_TOPPLE_SAVE_HOLE_ID,
    holeInstanceKey: WEAPON_MASTERY_TOPPLE_SAVE_HOLE_INSTANCE,
    label: "Topple Constitution saving throw",
    unitFeature: {
      unitId: WEAPON_MASTERY_TOPPLE_UNIT_ID,
      label: "Topple",
    },
    ability: "con",
    dc: {
      kind: "fixed",
      dc: difficultyClass(
        8 +
          Number(attack.abilityModifier) +
          combatantProficiencyBonus(attacker),
      ),
    },
    targetIds: [targetId],
    targetRollModes: savingThrowRollModeProjections(state, "con"),
    targetFlatBonuses: savingThrowFlatBonusProjections(state),
  };
}

export function applyWeaponMasteryToppleSavingThrow(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
  fill: Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>,
):
  | { readonly tag: "ok"; readonly state: BattleState }
  | { readonly tag: "invalid"; readonly message: string } {
  const outcomes = fill.value.outcomes;
  if (outcomes.length === 0) {
    return { tag: "ok", state };
  }
  if (outcomes.length !== 1 || outcomes[0]?.targetId !== targetId) {
    return {
      tag: "invalid",
      message: "Weapon Mastery Topple save must target the attacked creature.",
    };
  }
  const savingThrowExtendedState = extendSavingThrowOngoingFeatures(
    state,
    attackerId,
    [targetId],
  );
  if (outcomes[0].succeeded) {
    return { tag: "ok", state: savingThrowExtendedState };
  }
  const target = savingThrowExtendedState.combatants.get(targetId);
  if (target === undefined) {
    return {
      tag: "invalid",
      message: "Weapon Mastery Topple target is no longer in this battle.",
    };
  }
  return {
    tag: "ok",
    state: {
      ...savingThrowExtendedState,
      combatants: new Map(savingThrowExtendedState.combatants).set(targetId, {
        ...battleCreatureStateWithKnockOutPreservedConditions(
          target,
          applyCondition(target.conditions, "prone"),
        ),
      }),
    },
  };
}

function weaponMasteryToppleApplies(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
  attack: SupportedAttackActionOption,
): attack is CharacterWeaponAttackActionOption {
  if (attack.kind !== "weapon" || attack.weapon.mastery !== "topple") {
    return false;
  }
  const attacker = state.combatants.get(attackerId);
  if (!isCharacterBattleCreatureState(attacker)) {
    return false;
  }
  return (
    state.combatants.has(targetId) &&
    attacker.origin.weaponMasteries.some(
      (mastery) => mastery.weaponUnitId === attack.weapon.id,
    ) &&
    unitRefSupportsProfile(
      attacker.origin.characterUnitRefs,
      WEAPON_MASTERY_TOPPLE_UNIT_ID,
      WEAPON_MASTERY_TOPPLE_SUPPORT_PROFILE,
    )
  );
}

export function weaponMasteryCleaveDecisionHole(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
  attack: SupportedAttackActionOption,
): BattleUnitFeatureDecisionHole | null {
  return weaponMasteryCleaveApplies(state, attackerId, targetId, attack)
    ? {
        kind: "unitFeatureDecision",
        holeId: WEAPON_MASTERY_CLEAVE_DECISION_HOLE_ID,
        holeInstanceKey: WEAPON_MASTERY_CLEAVE_DECISION_HOLE_INSTANCE,
        label: "Use Cleave",
        unitFeature: {
          unitId: WEAPON_MASTERY_CLEAVE_UNIT_ID,
          label: "Cleave",
        },
        choices: ["use", "decline"],
      }
    : null;
}

export function weaponMasteryCleaveTargetHole(
  state: BattleState,
  attackerId: CombatantId,
  firstTargetId: CombatantId,
): BattleTargetChoiceHole {
  return {
    kind: "targetChoice",
    holeId: WEAPON_MASTERY_CLEAVE_TARGET_HOLE_ID,
    holeInstanceKey: WEAPON_MASTERY_CLEAVE_TARGET_HOLE_INSTANCE,
    label: "Cleave second target",
    requiresTableSpatialFact: true,
    choices: [...state.combatants.keys()].filter(
      (combatantId) =>
        combatantId !== attackerId &&
        combatantId !== firstTargetId &&
        combatantsAreEnemies(state, attackerId, combatantId),
    ),
  };
}

export function weaponMasteryCleaveAttackRollHole(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
  attack: CharacterWeaponAttackActionOption,
  targetSpatialFacts: readonly BattleTargetSpatialFact[],
): BattleAttackRollHole {
  return {
    ...attackRollHole(
      state.combatants.get(attackerId),
      attack,
      requiredAttackRollMode(
        state,
        attackerId,
        targetId,
        attack,
        targetSpatialFacts,
      ),
    ),
    holeId: WEAPON_MASTERY_CLEAVE_ATTACK_ROLL_HOLE_ID,
    holeInstanceKey: WEAPON_MASTERY_CLEAVE_ATTACK_ROLL_HOLE_INSTANCE,
    label: "Cleave attack roll",
  };
}

export function weaponMasteryCleaveDamageHole(
  attack: CharacterWeaponAttackActionOption,
  critical: boolean,
  attackRoll: BattleAttackRollResult,
): BattleDamageRollHole {
  const expression = weaponAttackDamageExpression(attack, critical, attackRoll);
  return {
    kind: "rolledDice",
    holeId: WEAPON_MASTERY_CLEAVE_DAMAGE_HOLE_ID,
    holeInstanceKey: WEAPON_MASTERY_CLEAVE_DAMAGE_HOLE_INSTANCE,
    label: `Cleave damage (${expression})`,
    attack,
    critical,
  };
}

export function weaponMasteryCleaveExtraAttack(
  attack: CharacterWeaponAttackActionOption,
): CharacterWeaponAttackActionOption {
  return {
    ...attack,
    damageAbilityModifier:
      attack.abilityModifier < 0 ? attack.abilityModifier : abilityModifier(0),
    ...(attack.alternateAbilityChoices === undefined
      ? {}
      : {
          alternateAbilityChoices: cleaveAbilityChoices(
            attack.alternateAbilityChoices,
          ),
        }),
  };
}

function cleaveAbilityChoices(
  choices: ReadonlyNonEmptyArray<CharacterWeaponAttackAbilityChoice>,
): ReadonlyNonEmptyArray<CharacterWeaponAttackAbilityChoice> {
  const [firstChoice, ...remainingChoices] = choices;
  return [
    cleaveAbilityChoice(firstChoice),
    ...remainingChoices.map(cleaveAbilityChoice),
  ];
}

function cleaveAbilityChoice(
  choice: CharacterWeaponAttackAbilityChoice,
): CharacterWeaponAttackAbilityChoice {
  return {
    ...choice,
    damageAbilityModifier:
      choice.abilityModifier < 0 ? choice.abilityModifier : abilityModifier(0),
  };
}

export function weaponMasteryCleaveTargetIsLegal(input: {
  readonly state: BattleState;
  readonly attackerId: CombatantId;
  readonly firstTargetId: CombatantId;
  readonly secondTargetId: CombatantId;
  readonly attack: CharacterWeaponAttackActionOption;
  readonly targetSpatialFacts: readonly BattleTargetSpatialFact[];
}): boolean {
  return (
    input.secondTargetId !== input.firstTargetId &&
    attackTargetIsLegal(
      input.state,
      input.attackerId,
      input.secondTargetId,
      input.attack,
      input.targetSpatialFacts,
    ) &&
    input.targetSpatialFacts.some(
      (fact) =>
        fact.kind === "cleaveSecondTargetWithin5FeetOfFirstTarget" &&
        fact.attackerId === input.attackerId &&
        fact.firstTargetId === input.firstTargetId &&
        fact.secondTargetId === input.secondTargetId,
    )
  );
}

export function recordWeaponMasteryCleaveUsed(
  state: BattleState,
  attackerId: CombatantId,
): BattleState {
  return state.currentTurnResources.weaponMasteryCleaveAttackersUsedThisTurn.includes(
    attackerId,
  )
    ? state
    : {
        ...state,
        currentTurnResources: {
          ...state.currentTurnResources,
          weaponMasteryCleaveAttackersUsedThisTurn: [
            ...state.currentTurnResources
              .weaponMasteryCleaveAttackersUsedThisTurn,
            attackerId,
          ],
        },
      };
}

function weaponMasteryCleaveApplies(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
  attack: SupportedAttackActionOption,
): attack is CharacterWeaponAttackActionOption {
  if (
    attack.kind !== "weapon" ||
    attack.weapon.mastery !== "cleave" ||
    attackTargetConstraint(attack).kind !== "meleeReach"
  ) {
    return false;
  }
  const attacker = state.combatants.get(attackerId);
  if (!isCharacterBattleCreatureState(attacker)) {
    return false;
  }
  return (
    state.combatants.has(targetId) &&
    !state.currentTurnResources.weaponMasteryCleaveAttackersUsedThisTurn.includes(
      attackerId,
    ) &&
    attacker.origin.weaponMasteries.some(
      (mastery) => mastery.weaponUnitId === attack.weapon.id,
    ) &&
    unitRefSupportsProfile(
      attacker.origin.characterUnitRefs,
      WEAPON_MASTERY_CLEAVE_UNIT_ID,
      WEAPON_MASTERY_CLEAVE_SUPPORT_PROFILE,
    )
  );
}

export function consumeSelfAttackRollEffects(
  state: BattleState,
  attackerId: CombatantId,
): BattleState {
  const attacker = state.combatants.get(attackerId);
  if (attacker === undefined) {
    return state;
  }
  const consumed = attacker.activeEffects.filter(
    (
      effect,
    ): effect is Extract<
      BattleActiveEffect,
      { readonly kind: "nextAttackRollBySelf" }
    > => effect.kind === "nextAttackRollBySelf",
  );
  const activeEffects = attacker.activeEffects.filter(
    (effect) => effect.kind !== "nextAttackRollBySelf",
  );
  if (activeEffects.length === attacker.activeEffects.length) {
    return state;
  }
  const combatants = new Map(state.combatants).set(attackerId, {
    ...attacker,
    activeEffects,
  });
  return {
    ...state,
    combatants:
      combatantsAfterConcentrationSpellEffectsEndedIfNoEffectsForSources(
        combatants,
        consumed.flatMap((effect) => {
          const source = spellConcentrationEffectSourceFromEffect(effect);
          return source === null ? [] : [source];
        }),
      ),
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
  const recklessAttackWhileRagingUses =
    isCharacterBattleCreatureState(attacker) &&
    activatedOngoingFeatureProfile !== null &&
    ongoingFeatureProfileIsRecklessAttackForFrenzy(activatedOngoingFeatureProfile)
      ? activeRageSourceKeysForFrenzy(attacker).map((rageSourceKey) => ({
          attackerId,
          recklessAttackSourceKey: ongoingFeatureSourceKeyForUnit(
            activatedOngoingFeatureProfile.unit.id,
          ),
          rageSourceKey,
        }))
      : [];
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
      recklessAttackWhileRagingUsedThisTurn: [
        ...withExtendedOngoingFeatures.currentTurnResources
          .recklessAttackWhileRagingUsedThisTurn,
        ...recklessAttackWhileRagingUses.filter(
          (usage) =>
            !withExtendedOngoingFeatures.currentTurnResources.recklessAttackWhileRagingUsedThisTurn.some(
              (existing) =>
                existing.attackerId === usage.attackerId &&
                existing.recklessAttackSourceKey ===
                  usage.recklessAttackSourceKey &&
                existing.rageSourceKey === usage.rageSourceKey,
            ),
        ),
      ],
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
